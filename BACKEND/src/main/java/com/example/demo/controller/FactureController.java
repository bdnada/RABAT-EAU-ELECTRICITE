package com.example.demo.controller;

import com.example.demo.entity.AdresseFacture;
import com.example.demo.repository.AdresseFactureRepository;
import com.example.demo.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/factures")
@RequiredArgsConstructor
@Slf4j
public class FactureController {

    private final AdresseFactureRepository adresseFactureRepository;
    private final EmailService emailService;

    /**
     * Liste toutes les factures générées avec lien de téléchargement et d'envoi email
     */
    /**
     * Liste toutes les factures générées avec lien de téléchargement et d'envoi email
     */
    @GetMapping
    public List<Map<String, Object>> getAllFactures() {
        return adresseFactureRepository.findAll().stream()
                .filter(f -> f.getFactureUniqueId() != null && f.getPdfPath() != null)
                .map(f -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", f.getId());
                    map.put("factureUniqueId", f.getFactureUniqueId());
                    map.put("clientOdooId", f.getClientOdooId());
                    map.put("nomClient", f.getAdresse().getClient().getNom() + " " + f.getAdresse().getClient().getPrenom());
                    map.put("emailClient", f.getAdresse().getClient().getEmail());
                    map.put("adresseComplete", f.getAdresse().getAdresseComplete());
                    map.put("mois", f.getMois());
                    map.put("dateCreation", f.getDateCreation());

                    // AJOUT IMPORTANT : le statut de la facture
                    map.put("status", f.getStatus() != null ? f.getStatus().name() : null);
                    // ou si tu veux une chaîne vide au lieu de null :
                    // map.put("status", f.getStatus() != null ? f.getStatus().name() : "NON_SIGNEE");

                    map.put("downloadUrl", "/api/factures/download/" + f.getFactureUniqueId());
                    map.put("sendEmailUrl", "/api/factures/send/email/" + f.getId());
                    return map;
                })
                .collect(Collectors.toList());
    }

    /**
     * Télécharge le PDF via le factureUniqueId
     */
    @GetMapping("/download/{factureUniqueId}")
    public ResponseEntity<Resource> downloadPdf(@PathVariable String factureUniqueId) {
        AdresseFacture facture = adresseFactureRepository.findAll().stream()
                .filter(f -> factureUniqueId.equals(f.getFactureUniqueId()))
                .findFirst()
                .orElse(null);

        if (facture == null || facture.getPdfPath() == null || !new File(facture.getPdfPath()).exists()) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(facture.getPdfPath());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"facture_" + factureUniqueId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }

    /**
     * Envoi manuel de la facture par email via l'ID de la table adresse_factures
     * Utilise l'email stocké dans la table clients (synchronisé depuis Odoo)
     * Exemple : POST http://localhost:8081/api/factures/send/email/23
     */
    @PostMapping("/send/email/{id}")
    public ResponseEntity<String> sendFactureEmailManuellement(@PathVariable Long id) {
        try {
            AdresseFacture facture = adresseFactureRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Facture non trouvée avec l'ID : " + id));

            // Vérification du PDF
            if (facture.getPdfPath() == null || !new File(facture.getPdfPath()).exists()) {
                return ResponseEntity.badRequest()
                        .body("Erreur : Le fichier PDF de la facture n'existe pas.");
            }

            // Récupération de l'email client
            String clientEmail = facture.getAdresse().getClient().getEmail();

            if (clientEmail == null || clientEmail.trim().isBlank()) {
                return ResponseEntity.badRequest()
                        .body("Erreur : Aucun email trouvé pour le client " + facture.getClientOdooId());
            }

            String clientName =
                    facture.getAdresse().getClient().getNom() + " " +
                            facture.getAdresse().getClient().getPrenom();

            String moisFacture =
                    facture.getMois().getMonth() + " " + facture.getMois().getYear();

            // ✅ ENVOI EMAIL
            emailService.sendFactureEmail(
                    clientEmail.trim(),
                    clientName.trim(),
                    facture.getPdfPath(),
                    moisFacture
            );

            // ✅ MISE À JOUR STATUT
            facture.setStatus(AdresseFacture.FactureStatus.SENT);
            adresseFactureRepository.save(facture);

            log.info("Facture ID {} envoyée par email et marquée SENT", id);

            return ResponseEntity.ok(
                    "Facture envoyée avec succès par email à " + clientEmail +
                            " (ID : " + id + ", Mois : " + moisFacture + ")"
            );

        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email pour la facture ID {}", id, e);
            return ResponseEntity.internalServerError()
                    .body("Erreur lors de l'envoi de l'email : " + e.getMessage());
        }
    }

}