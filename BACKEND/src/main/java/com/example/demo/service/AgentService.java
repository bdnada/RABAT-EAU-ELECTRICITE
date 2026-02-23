package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.repository.*;
import com.example.demo.util.PasswordGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentService {

    private final AgentTerrainRepository repository;
    private final AdresseRepository adresseRepository;
    private final AffectationRepository affectationRepository;
    private final PasswordEncoder encoder;
    private final EmailService emailService;

    // Configuration Odoo
    @Value("${odoo.url}")
    private String odooUrl;

    @Value("${odoo.db}")
    private String db;

    @Value("${odoo.uid}")
    private int uid;

    @Value("${odoo.password}")
    private String password;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    // ───────────────────────────────────────────────────────────────
    // MÉTHODES DE BASE
    // ───────────────────────────────────────────────────────────────
    public List<AgentTerrain> findAll() {
        return repository.findAll();
    }

    public AgentTerrain findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));
    }

    // ───────────────────────────────────────────────────────────────
    // GESTION DU QUARTIER + RÉPARTITION AUTO
    // ───────────────────────────────────────────────────────────────
    public AgentTerrain assignQuartier(Long id, String quartier) {
        AgentTerrain agent = findById(id);
        String oldQuartier = agent.getQuartier();

        if (Objects.equals(oldQuartier, quartier)) {
            log.info("Quartier inchangé pour l'agent {}, pas de répartition nécessaire", agent.getId());
            return agent;
        }

        // Nettoyage des anciennes affectations
        int deletedCount = affectationRepository.deleteByAgentId(agent.getId());
        log.info("Supprimées {} anciennes affectations pour l'agent {}", deletedCount, agent.getId());

        agent.setQuartier(quartier);
        repository.save(agent);

        log.info("Quartier modifié pour agent {} : {} → {}", agent.getId(), oldQuartier, quartier);

        // Rééquilibrage des deux quartiers impactés
        if (oldQuartier != null && !oldQuartier.isBlank()) {
            distributeAdressesForQuartier(oldQuartier);
        }
        if (quartier != null && !quartier.isBlank()) {
            distributeAdressesForQuartier(quartier);
        }

        return agent;
    }

    public void distributeAdressesForQuartier(String quartier) {
        if (quartier == null || quartier.isBlank()) {
            log.warn("Tentative de répartition sur un quartier vide ou null");
            return;
        }

        List<Adresse> adresses = adresseRepository.findByQuartier(quartier);
        if (adresses.isEmpty()) {
            log.info("Aucune adresse à répartir pour le quartier : {}", quartier);
            return;
        }

        List<AgentTerrain> agents = repository.findAll().stream()
                .filter(a -> quartier.equals(a.getQuartier()))
                .collect(Collectors.toList());

        if (agents.isEmpty()) {
            log.warn("Aucun agent assigné au quartier {}, impossible de répartir", quartier);
            return;
        }

        int totalAdresses = adresses.size();
        int totalAgents = agents.size();
        int maxParAgent = 150;

        if (totalAdresses > totalAgents * maxParAgent) {
            throw new RuntimeException(
                    "Pas assez d'agents pour couvrir le quartier " + quartier + " (max 150 par agent)");
        }

        log.info("Répartition - Quartier: {}, Adresses: {}, Agents: {}", quartier, totalAdresses, totalAgents);

        // Nettoyage préalable
        affectationRepository.deleteByAdresseQuartier(quartier);

        int base = totalAdresses / totalAgents;
        int reste = totalAdresses % totalAgents;

        int indexAdresse = 0;
        for (int i = 0; i < totalAgents; i++) {
            int nbPourCetAgent = base + (i < reste ? 1 : 0);
            AgentTerrain agent = agents.get(i);

            for (int j = 0; j < nbPourCetAgent; j++) {
                Adresse adresse = adresses.get(indexAdresse++);
                Affectation affectation = Affectation.builder()
                        .agent(agent)
                        .adresse(adresse)
                        .build();
                affectationRepository.save(affectation);
            }
        }

        log.info("Répartition terminée pour {} : {} affectations créées", quartier, totalAdresses);
    }

    // ───────────────────────────────────────────────────────────────
    // SUPPRESSION AGENT + RÉÉQUILIBRAGE
    // ───────────────────────────────────────────────────────────────
    public void deleteAgent(Long id) {
        AgentTerrain agent = findById(id);
        String quartier = agent.getQuartier();

        repository.deleteById(id);
        log.info("Agent {} supprimé définitivement", id);

        if (quartier != null && !quartier.isBlank()) {
            distributeAdressesForQuartier(quartier);
        }
    }

    // ───────────────────────────────────────────────────────────────
    // GESTION COMPTE MOBILE + PIN
    // ───────────────────────────────────────────────────────────────
    public AgentTerrain createMobileAccount(Long id) {
        AgentTerrain agent = findById(id);

        if (agent.getEmail() != null && !agent.getEmail().isBlank()) {
            throw new RuntimeException("Compte mobile déjà créé pour cet agent");
        }

        if (agent.getOdooAgentId() == null || agent.getOdooAgentId().isBlank()) {
            throw new RuntimeException("Cet agent n'a pas d'ID Odoo synchronisé");
        }

        String workEmail = fetchEmailFromOdoo(agent.getOdooAgentId());
        if (workEmail == null || workEmail.trim().isEmpty()) {
            throw new RuntimeException("Aucun email professionnel trouvé dans Odoo");
        }

        String tempPass = PasswordGenerator.generateTempPassword();
        String initialPin = generateRandomPin();

        agent.setEmail(workEmail.trim());
        agent.setPassword(encoder.encode(tempPass));
        agent.setPinHash(encoder.encode(initialPin));
        agent.setPinFailedAttempts(0);
        agent.setActive(true);
        agent.setLoginStatus(true);
        agent.setResetRequired(true);

        agent = repository.save(agent);

        String fullName = (agent.getNom() + " " + agent.getPrenom()).trim();
        if (fullName.isBlank()) fullName = "Agent";

        // ─── IMPORTANT : UN SEUL EMAIL ───────────────────────────────
        emailService.sendWelcomeWithCredentialsAndPin(
                workEmail.trim(),
                tempPass,
                initialPin,
                agent.getTelProfessionnel(),
                fullName
        );

        log.info("Compte mobile créé pour agent {} - Email: {} - PIN & MDP envoyés dans un seul email",
                agent.getId(), workEmail);

        return agent;
    }

    public void resetPassword(Long id) {
        AgentTerrain agent = findById(id);

        if (agent.getEmail() == null || agent.getEmail().isBlank()) {
            throw new RuntimeException("Cet agent n'a pas encore de compte mobile");
        }

        String tempPass = PasswordGenerator.generateTempPassword();
        agent.setPassword(encoder.encode(tempPass));
        agent.setResetRequired(true);
        repository.save(agent);

        String fullName = (agent.getNom() + " " + agent.getPrenom()).trim();
        if (fullName.isBlank()) fullName = "Agent";

        emailService.sendTempPassword(agent.getEmail(), tempPass, fullName);
        log.info("Mot de passe réinitialisé pour agent {} - Email: {}", agent.getId(), agent.getEmail());
    }

    public void regeneratePin(Long id) {
        AgentTerrain agent = findById(id);

        if (agent.getTelProfessionnel() == null || agent.getTelProfessionnel().trim().isEmpty()) {
            throw new IllegalStateException("Aucun numéro de téléphone professionnel enregistré");
        }

        if (agent.getEmail() == null || agent.getEmail().trim().isEmpty()) {
            throw new IllegalStateException("Aucun email enregistré pour cet agent");
        }

        String newPin = generateRandomPin();
        agent.setPinHash(encoder.encode(newPin));
        agent.setPinFailedAttempts(0);
        repository.save(agent);

        String fullName = (agent.getNom() + " " + agent.getPrenom()).trim();
        if (fullName.isBlank()) fullName = "Agent";

        emailService.sendPin(
                agent.getEmail(),
                newPin,
                agent.getTelProfessionnel(),
                fullName
        );

        log.info("Code PIN régénéré et envoyé pour agent {} - Tél pro: {}", id, agent.getTelProfessionnel());
    }

    private String generateRandomPin() {
        return String.format("%06d", new SecureRandom().nextInt(1000000));
    }

    public void changePassword(String email, String oldPass, String newPass) {
        AgentTerrain agent = repository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));

        if (!encoder.matches(oldPass, agent.getPassword())) {
            throw new RuntimeException("Ancien mot de passe incorrect");
        }

        agent.setPassword(encoder.encode(newPass));
        agent.setResetRequired(false);
        repository.save(agent);
    }

    public void updateLoginStatus(Long id, boolean enabled) {
        AgentTerrain agent = findById(id);
        boolean oldStatus = agent.isLoginStatus();

        agent.setLoginStatus(enabled);
        repository.save(agent);

        log.info("Statut login modifié pour agent {} ({}) : {} → {}",
                agent.getId(), agent.getEmail(),
                oldStatus ? "ACTIF" : "INACTIF",
                enabled ? "ACTIF" : "INACTIF");
    }

    // ───────────────────────────────────────────────────────────────
    // INTÉGRATION ODOO
    // ───────────────────────────────────────────────────────────────
    private String fetchEmailFromOdoo(String odooAgentId) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("jsonrpc", "2.0");
            requestBody.put("method", "call");
            requestBody.put("id", System.currentTimeMillis());

            Map<String, Object> params = new HashMap<>();
            params.put("service", "object");
            params.put("method", "execute_kw");

            List<Object> args = List.of(
                    db,
                    uid,
                    password,
                    "hr.employee",
                    "read",
                    List.of(List.of(Integer.parseInt(odooAgentId))),
                    Map.of("fields", List.of("work_email"))
            );

            params.put("args", args);
            requestBody.put("params", params);

            JsonNode result = callOdoo(requestBody);

            if (result.isArray() && !result.isEmpty()) {
                JsonNode employee = result.get(0);
                if (employee.has("work_email") && !employee.get("work_email").isNull()) {
                    return employee.get("work_email").asText().trim();
                }
            }
        } catch (Exception e) {
            log.error("Erreur récupération email Odoo pour agent ID {} : {}", odooAgentId, e.getMessage(), e);
        }
        return null;
    }

    private JsonNode callOdoo(Map<String, Object> requestBody) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(odooUrl, entity, String.class);
        JsonNode root = mapper.readTree(response.getBody());

        if (root.has("error")) {
            throw new RuntimeException("Erreur Odoo : " + root.get("error").toString());
        }

        return root.path("result");
    }
}