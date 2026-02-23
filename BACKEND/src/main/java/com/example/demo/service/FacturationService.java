package com.example.demo.service;

import com.example.demo.entity.Adresse;
import com.example.demo.entity.AdresseFacture;
import com.example.demo.entity.Releve;
import com.example.demo.entity.TypeCompteur;
import com.example.demo.repository.AdresseFactureRepository;
import com.example.demo.repository.AdresseRepository;
import com.example.demo.repository.ReleveRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.io.FileOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FacturationService {

    // Configuration Odoo - JSON-RPC & REST
    @Value("${odoo.url}")           private String odooJsonRpcUrl;
    @Value("${odoo.url2}")          private String odooRestUrl;
    @Value("${odoo.db}")            private String db;
    @Value("${odoo.login}")         private String username;
    @Value("${odoo.password}")      private String password;

    // IDs des produits dans Odoo
    @Value("${odoo.product_eau_id}")                        private int productEauId;
    @Value("${odoo.product_redevance_eau_id}")              private int productRedevanceEauId;
    @Value("${odoo.product_assainissement_id}")             private int productAssainissementId;
    @Value("${odoo.product_redevance_assainissement_id}")   private int productRedevanceAssainissementId;
    @Value("${odoo.product_elec_id}")                       private int productElecId;
    @Value("${odoo.product_redevance_elec_id}")             private int productRedevanceElecId;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    private final AdresseRepository adresseRepository;
    private final AdresseFactureRepository adresseFactureRepository;
    private final ReleveRepository releveRepository;

    private static final String REPORT_NAME = "account.report_invoice";


    /**
     * Retourne tous les groupes de relevés (adresse + mois) qui n'ont JAMAIS été facturés
     * (aucune entrée correspondante dans adresse_facture)
     */
    public List<List<Releve>> findAllUnbilledGroups() {
        List<Releve> allReleves = releveRepository.findAll();
        if (allReleves.isEmpty()) {
            log.info("Aucun relevé trouvé dans la base");
            return Collections.emptyList();
        }

        Map<String, List<Releve>> grouped = allReleves.stream()
                .collect(Collectors.groupingBy(r ->
                        r.getCompteur().getAdresse().getId() + "|" +
                                r.getDateReleve().toLocalDateTime().toLocalDate().withDayOfMonth(1)
                ));

        List<List<Releve>> pendingGroups = new ArrayList<>();

        for (Map.Entry<String, List<Releve>> entry : grouped.entrySet()) {
            String[] parts = entry.getKey().split("\\|");
            Long adresseId = Long.valueOf(parts[0]);
            LocalDate mois = LocalDate.parse(parts[1]);

            if (adresseFactureRepository.findByAdresseIdAndMois(adresseId, mois).isEmpty()) {
                pendingGroups.add(entry.getValue());
            }
        }

        log.info("Trouvé {} groupe(s) en attente de facturation", pendingGroups.size());
        return pendingGroups;
    }


    /**
     * Crée une facture Odoo pour un groupe homogène (même adresse + même mois)
     * Cette méthode est idempotente : elle vérifie avant d'agir
     */
    public void sendToOdoo(List<Releve> relevesDuGroupe) {
        if (relevesDuGroupe == null || relevesDuGroupe.isEmpty()) {
            log.warn("Groupe vide reçu → ignoré");
            return;
        }

        Releve premier = relevesDuGroupe.get(0);
        Adresse adresse = premier.getCompteur().getAdresse();
        LocalDate mois = premier.getDateReleve().toLocalDateTime().toLocalDate().withDayOfMonth(1);

        // Double protection contre la double facturation
        if (adresseFactureRepository.findByAdresseIdAndMois(adresse.getId(), mois).isPresent()) {
            log.warn("Facture déjà existante pour adresse {} - mois {} → ignoré", adresse.getId(), mois);
            return;
        }

        log.info("Début facturation - Adresse ID: {} - Mois: {}", adresse.getId(), mois);

        // Création de l'entité de suivi (on la crée tôt pour marquer l'intention)
        AdresseFacture adresseFacture = AdresseFacture.builder()
                .adresse(adresse)
                .clientOdooId(adresse.getClient().getOdooClientId())
                .mois(mois)
                .dateCreation(LocalDate.now())
                .build();

        // Cumul des consommations
        int totalEauM3 = 0;
        int totalElecKwh = 0;

        for (Releve r : relevesDuGroupe) {
            if (r.getCompteur().getType() == TypeCompteur.EAU) {
                totalEauM3 += r.getConsommation();
            } else if (r.getCompteur().getType() == TypeCompteur.ELECTRICITE) {
                totalElecKwh += r.getConsommation();
            }
        }

        if (totalEauM3 == 0 && totalElecKwh == 0) {
            log.info("Aucune consommation - adresse {} mois {} → ignoré", adresse.getId(), mois);
            return;
        }

        List<Object> invoiceLines = new ArrayList<>();

        if (totalEauM3 > 0) {
            invoiceLines.add(createLine(productEauId, totalEauM3, "Consommation Eau (m³)"));
            invoiceLines.add(createLine(productRedevanceEauId, 1, "Redevance fixe Eau"));
            invoiceLines.add(createLine(productAssainissementId, totalEauM3, "Assainissement (m³)"));
            invoiceLines.add(createLine(productRedevanceAssainissementId, 1, "Redevance fixe Assainissement"));
        }

        if (totalElecKwh > 0) {
            invoiceLines.add(createLine(productElecId, totalElecKwh, "Consommation Électricité (kWh)"));
            invoiceLines.add(createLine(productRedevanceElecId, 1, "Redevance fixe Électricité"));
        }

        try {
            // 1. Authentification
            Map<String, Object> session = loginAndGetSessionData();
            int uid = (Integer) session.get("uid");
            String sessionId = (String) session.get("session_id");

            // 2. Création de la facture
            JsonNode createResponse = callOdoo(buildJsonRpcRequest(
                    "account.move", "create",
                    List.of(Map.of(
                            "move_type", "out_invoice",
                            "partner_id", Integer.parseInt(adresse.getClient().getOdooClientId()),
                            "invoice_line_ids", invoiceLines
                    )),
                    uid
            ));

            int invoiceOdooId = createResponse.asInt();
            log.info("Facture créée dans Odoo - ID: {}", invoiceOdooId);

            // 3. Validation / Posting
            callOdoo(buildJsonRpcRequest(
                    "account.move", "action_post",
                    List.of(List.of(invoiceOdooId)),
                    uid
            ));

            // 4. Récupération PDF
            byte[] pdfBytes = downloadInvoicePdf(invoiceOdooId, sessionId);

            // 5. Génération ID unique
            String uniqueId;
            do {
                uniqueId = RandomStringUtils.randomAlphanumeric(30).toUpperCase();
            } while (adresseFactureRepository.existsByFactureUniqueId(uniqueId));

            // 6. Sauvegarde du PDF
            String filename = "facture_" + uniqueId + ".pdf";
            String fullPath = "factures/" + filename;
            new File("factures/").mkdirs();

            try (FileOutputStream fos = new FileOutputStream(fullPath)) {
                fos.write(pdfBytes);
            }

            // 7. Mise à jour du suivi
            adresseFacture.setFactureOdooId(invoiceOdooId);
            adresseFacture.setFactureUniqueId(uniqueId);
            adresseFacture.setPdfPath(fullPath);
            adresseFactureRepository.save(adresseFacture);

            log.info("FACTURATION TERMINÉE avec succès - Adresse: {} | Mois: {} | Unique ID: {}",
                    adresse.getId(), mois, uniqueId);

        } catch (Exception e) {
            log.error("ÉCHEC FACTURATION - Adresse {} - Mois {} : {}",
                    adresse.getId(), mois, e.getMessage(), e);
            // Option : ajouter un champ statut/erreur dans AdresseFacture si besoin
        }
    }


    // ───────────────────────────────────────────────────────────────
    //                     Méthodes utilitaires Odoo
    // ───────────────────────────────────────────────────────────────

    private List<Object> createLine(int productId, double quantity, String name) {
        return List.of(0, 0, Map.of(
                "product_id", productId,
                "quantity", quantity,
                "name", name
        ));
    }

    private Map<String, Object> buildJsonRpcRequest(String model, String method, List<Object> args, int uid) {
        return Map.of(
                "jsonrpc", "2.0",
                "method", "call",
                "id", System.currentTimeMillis(),
                "params", Map.of(
                        "service", "object",
                        "method", "execute_kw",
                        "args", List.of(db, uid, password, model, method, args)
                )
        );
    }

    private JsonNode callOdoo(Map<String, Object> requestBody) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> response = restTemplate.postForEntity(
                odooJsonRpcUrl, new HttpEntity<>(requestBody, headers), String.class);

        JsonNode root = mapper.readTree(response.getBody());

        if (root.has("error")) {
            throw new RuntimeException("Erreur Odoo: " + root.get("error").toPrettyString());
        }

        return root.path("result");
    }

    private Map<String, Object> loginAndGetSessionData() throws Exception {
        String authUrl = odooRestUrl + "/web/session/authenticate";

        Map<String, Object> payload = Map.of(
                "jsonrpc", "2.0",
                "method", "call",
                "id", System.currentTimeMillis(),
                "params", Map.of(
                        "db", db,
                        "login", username,
                        "password", password
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> response = restTemplate.postForEntity(
                authUrl, new HttpEntity<>(payload, headers), String.class);

        JsonNode root = mapper.readTree(response.getBody());
        if (root.has("error")) {
            throw new RuntimeException("Échec authentification: " + root.get("error").toPrettyString());
        }

        int uid = root.path("result").path("uid").asInt();

        String sessionId = null;
        List<String> cookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        if (cookies != null) {
            for (String cookie : cookies) {
                if (cookie.contains("session_id=")) {
                    sessionId = cookie.split("session_id=")[1].split(";")[0];
                    break;
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("uid", uid);
        result.put("session_id", sessionId);
        return result;
    }

    private byte[] downloadInvoicePdf(int invoiceId, String sessionId) throws Exception {
        String url = odooRestUrl + "/report/pdf/" + REPORT_NAME + "/" + invoiceId;

        HttpHeaders headers = new HttpHeaders();
        if (sessionId != null) {
            headers.add("Cookie", "session_id=" + sessionId);
        }

        ResponseEntity<byte[]> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), byte[].class);

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            throw new RuntimeException("Échec téléchargement PDF - statut: " + response.getStatusCode());
        }

        return response.getBody();
    }
}