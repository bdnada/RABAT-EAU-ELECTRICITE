package com.example.demo.service;

import com.example.demo.entity.Adresse;
import com.example.demo.entity.AgentTerrain;
import com.example.demo.entity.Client;
import com.example.demo.repository.AdresseRepository;
import com.example.demo.repository.AgentTerrainRepository;
import com.example.demo.repository.ClientRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class OdooSyncService {

    @Value("${odoo.url}")
    private String odooUrl;

    @Value("${odoo.db}")
    private String db;

    @Value("${odoo.uid}")
    private int uid;

    @Value("${odoo.password}")
    private String password;

    private final ClientRepository clientRepository;
    private final AdresseRepository adresseRepository;
    private final AgentTerrainRepository agentTerrainRepository;

    // AJOUT IMPORTANT : on a besoin du service qui sait répartir les adresses
    private final AgentService agentService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    // =====================================================================
    // SYNCHRONISATION CLIENTS + ADRESSES (res.partner NON employés)
    // =====================================================================
    @Scheduled(fixedRate = 30000)
    public void syncClientsAndAdresses() {
        log.info("▶ Début synchronisation clients et adresses depuis Odoo");

        Set<String> quartiersAMettreAJour = new HashSet<>();

        try {
            Map<String, Object> requestBody = buildJsonRpcRequest(
                    "res.partner",
                    "search_read",
                    List.of(List.of(List.of("employee_ids", "=", false))),
                    Map.of(
                            "fields", List.of(
                                    "id", "name", "email", "street",
                                    "x_quartier_rabat", "city", "zip", "phone", "mobile"
                            ),
                            "limit", 1000
                    )
            );

            JsonNode result = callOdoo(requestBody);

            Map<String, Client> clientsExistants = clientRepository.findAll().stream()
                    .collect(Collectors.toMap(Client::getOdooClientId, c -> c));

            Map<String, Adresse> adressesExistantes = adresseRepository.findAll().stream()
                    .collect(Collectors.toMap(Adresse::getOdooAdresseId, a -> a));

            int created = 0;
            int updated = 0;

            for (JsonNode partner : result) {
                String odooId = partner.get("id").asText();

                // ================= CLIENT =================
                String fullName = getText(partner, "name");
                String[] parts = fullName.split(" ", 2);
                String nom = parts.length > 0 ? parts[0].trim() : "";
                String prenom = parts.length > 1 ? parts[1].trim() : "";

                String telephone = getFirstNonEmpty(partner, "phone", "mobile");
                String email = getText(partner, "email");

                Client client = clientsExistants.getOrDefault(
                        odooId,
                        Client.builder().odooClientId(odooId).build()
                );

                client.setNom(nom);
                client.setPrenom(prenom);
                client.setTelephone(telephone);
                client.setEmail(email.isBlank() ? null : email);

                boolean clientNouveau = client.getId() == null;
                client = clientRepository.save(client);
                clientsExistants.put(odooId, client);

                if (clientNouveau) created++; else updated++;

                // ================= ADRESSE =================
                String street = getText(partner, "street");
                String quartierOdoo = getText(partner, "x_quartier_rabat");
                String city = getText(partner, "city");
                String zip = getText(partner, "zip");

                String adresseComplete = Stream.of(street, quartierOdoo, zip, city)
                        .filter(s -> s != null && !s.isBlank())
                        .collect(Collectors.joining(" "))
                        .trim();

                String nouveauQuartier = quartierOdoo.trim().isEmpty() ? "Non défini" : quartierOdoo.trim();

                Adresse adresse = adressesExistantes.getOrDefault(
                        odooId,
                        Adresse.builder().odooAdresseId(odooId).build()
                );

                boolean estNouvelleAdresse = adresse.getId() == null;
                String ancienQuartier = adresse.getQuartier();

                adresse.setClient(client);
                adresse.setAdresseComplete(
                        adresseComplete.isBlank() ? "Adresse non renseignée" : adresseComplete
                );
                adresse.setVille(city.isBlank() ? "Ville non renseignée" : city.trim());
                adresse.setQuartier(nouveauQuartier);

                adresse = adresseRepository.save(adresse);
                adressesExistantes.put(odooId, adresse);

                // ─────────────── Détection quartiers à réaffecter ───────────────
                if (estNouvelleAdresse && !nouveauQuartier.equals("Non défini")) {
                    quartiersAMettreAJour.add(nouveauQuartier);
                }
                // Optionnel : si l'adresse change de quartier (cas moins fréquent)
                else if (ancienQuartier != null && !ancienQuartier.equals(nouveauQuartier)) {
                    if (!ancienQuartier.isBlank() && !ancienQuartier.equals("Non défini")) {
                        quartiersAMettreAJour.add(ancienQuartier);
                    }
                    if (!nouveauQuartier.isBlank() && !nouveauQuartier.equals("Non défini")) {
                        quartiersAMettreAJour.add(nouveauQuartier);
                    }
                }
            }

            // Nettoyage des adresses supprimées dans Odoo (optionnel mais recommandé)
            cleanupRemovedAdresses(result, adressesExistantes, quartiersAMettreAJour);

            // Réaffectation automatique des quartiers impactés
            for (String quartier : quartiersAMettreAJour) {
                try {
                    agentService.distributeAdressesForQuartier(quartier);
                    log.info("Réaffectation automatique effectuée pour le quartier : {}", quartier);
                } catch (Exception e) {
                    log.error("Erreur lors de la réaffectation du quartier '{}' : {}", quartier, e.getMessage());
                }
            }

            log.info("✔ Synchronisation clients/adresses terminée : {} créés, {} mis à jour", created, updated);

        } catch (Exception e) {
            log.error("✖ Erreur synchronisation clients/adresses", e);
        }
    }

    private void cleanupRemovedAdresses(JsonNode result, Map<String, Adresse> adressesExistantes,
                                        Set<String> quartiersAMettreAJour) {
        Set<String> odooIdsActuels = new HashSet<>();
        for (JsonNode node : result) {
            odooIdsActuels.add(node.get("id").asText());
        }

        List<Adresse> aSupprimer = new ArrayList<>();
        for (Map.Entry<String, Adresse> entry : adressesExistantes.entrySet()) {
            if (!odooIdsActuels.contains(entry.getKey())) {
                Adresse addr = entry.getValue();
                String q = addr.getQuartier();
                if (q != null && !q.trim().isEmpty() && !q.equals("Non défini")) {
                    quartiersAMettreAJour.add(q);
                }
                aSupprimer.add(addr);
            }
        }

        for (Adresse addr : aSupprimer) {
            adresseRepository.delete(addr);
            log.info("Adresse supprimée (non présente dans Odoo) : {}", addr.getOdooAdresseId());
        }
    }

    // =====================================================================
    // SYNCHRONISATION AGENTS (inchangée)
    // =====================================================================
    @Scheduled(fixedRate = 15000)
    public void syncAgents() {
        log.info("▶ Début synchronisation agents depuis Odoo");

        try {
            Map<String, Object> requestBody = buildJsonRpcRequest(
                    "hr.employee",
                    "search_read",
                    List.of(),
                    Map.of(
                            "fields", List.of("id", "name", "work_email", "work_phone", "job_title"),
                            "limit", 1000
                    )
            );

            JsonNode result = callOdoo(requestBody);

            List<AgentTerrain> allLocalAgents = agentTerrainRepository.findAll();
            Map<String, AgentTerrain> agentsExistants = allLocalAgents.stream()
                    .collect(Collectors.toMap(AgentTerrain::getOdooAgentId, a -> a));

            Set<String> activeOdooIds = new HashSet<>();

            int created = 0;
            int updated = 0;

            for (JsonNode employee : result) {
                String odooId = employee.get("id").asText();
                activeOdooIds.add(odooId);

                String fullName = getText(employee, "name");
                String[] parts = fullName.split(" ", 2);
                String nom = parts.length > 0 ? parts[0].trim() : "";
                String prenom = parts.length > 1 ? parts[1].trim() : "";
                String telPro = getText(employee, "work_phone");

                AgentTerrain agent = agentsExistants.getOrDefault(
                        odooId,
                        AgentTerrain.builder()
                                .odooAgentId(odooId)
                                .active(false)
                                .build()
                );

                agent.setNom(nom);
                agent.setPrenom(prenom);
                agent.setTelProfessionnel(telPro);
                agent.setActive(true);

                agentTerrainRepository.save(agent);
                agentsExistants.put(odooId, agent);

                if (agent.getId() == null) created++; else updated++;
            }

            int deactivatedCount = 0;
            for (AgentTerrain localAgent : allLocalAgents) {
                if (!activeOdooIds.contains(localAgent.getOdooAgentId()) && localAgent.isActive()) {
                    localAgent.setActive(false);
                    agentTerrainRepository.save(localAgent);
                    deactivatedCount++;
                }
            }

            log.info(
                    "✔ Synchronisation agents terminée : {} créés, {} mis à jour, {} désactivés",
                    created, updated, deactivatedCount
            );

        } catch (Exception e) {
            log.error("✖ Erreur synchronisation agents", e);
        }
    }

    // =====================================================================
    // MÉTHODES UTILITAIRES (inchangées)
    // =====================================================================
    private Map<String, Object> buildJsonRpcRequest(
            String model,
            String method,
            List<Object> domain,
            Map<String, Object> kwargs
    ) {
        Map<String, Object> params = new HashMap<>();
        params.put("service", "object");
        params.put("method", "execute_kw");
        params.put("args", List.of(db, uid, password, model, method, domain, kwargs));

        Map<String, Object> body = new HashMap<>();
        body.put("jsonrpc", "2.0");
        body.put("method", "call");
        body.put("id", System.currentTimeMillis());
        body.put("params", params);

        return body;
    }

    private JsonNode callOdoo(Map<String, Object> requestBody) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response =
                restTemplate.postForEntity(odooUrl, entity, String.class);

        JsonNode root = mapper.readTree(response.getBody());

        if (root.has("error")) {
            throw new RuntimeException("Erreur Odoo : " + root.get("error").toString());
        }

        return root.path("result");
    }

    private String getText(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull()
                ? node.get(field).asText("").trim()
                : "";
    }

    private String getFirstNonEmpty(JsonNode node, String... fields) {
        for (String field : fields) {
            String val = getText(node, field);
            if (!val.isEmpty()) return val;
        }
        return "";
    }
}

