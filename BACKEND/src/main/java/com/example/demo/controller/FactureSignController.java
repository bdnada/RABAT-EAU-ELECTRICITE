package com.example.demo.controller;

import com.example.demo.dto.SignatureRequestDto;
import com.example.demo.entity.AdresseFacture;
import com.example.demo.repository.AdresseFactureRepository;
import com.example.demo.service.EmailService;
import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Image;
import com.itextpdf.text.pdf.BaseFont;
import com.itextpdf.text.pdf.PdfContentByte;
import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.PdfStamper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

@RestController
@RequestMapping("/api/factures/sign")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
@Slf4j
public class FactureSignController {

    private final AdresseFactureRepository adresseFactureRepository;
    private final EmailService emailService;

    // ================= SIGNATURE FACTURE =================
    @PostMapping("/request/{factureId}")
    public ResponseEntity<?> signFacture(
            @PathVariable Long factureId,
            @RequestBody SignatureRequestDto dto) {

        try {
            AdresseFacture facture = adresseFactureRepository.findById(factureId)
                    .orElseThrow(() -> new RuntimeException("Facture introuvable"));

            // Vérification email client
            String emailClient = facture.getAdresse().getClient().getEmail();
            if (emailClient == null || !emailClient.equalsIgnoreCase(dto.getEmail())) {
                return ResponseEntity.badRequest().body("Email client invalide");
            }

            File pdfFile = new File(facture.getPdfPath());
            if (!pdfFile.exists()) {
                return ResponseEntity.badRequest().body("PDF introuvable sur le serveur");
            }

            byte[] pdfBytes = Files.readAllBytes(pdfFile.toPath());

            // Décodage signature base64
            String base64Data = dto.getSignature().split(",")[1];
            byte[] signatureBytes = Base64.getDecoder().decode(base64Data);

            PdfReader reader = new PdfReader(pdfBytes);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfStamper stamper = new PdfStamper(reader, out);

            int page = reader.getNumberOfPages();
            PdfContentByte content = stamper.getOverContent(page);

            // ================= TEXTE =================
            BaseFont bf = BaseFont.createFont(
                    BaseFont.HELVETICA,
                    BaseFont.CP1252,
                    BaseFont.EMBEDDED
            );

            float leftX = 60;   // marge gauche
            float baseY = 100;  // base de référence bas de page

            DateTimeFormatter formatter =
                    DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
            String dateHeure = LocalDateTime.now().format(formatter);

            content.beginText();
            content.setFontAndSize(bf, 9);
            content.setColorFill(new BaseColor(120, 120, 120));

            content.showTextAligned(
                    PdfContentByte.ALIGN_LEFT,
                    "Signé par Administrateur",
                    leftX,
                    baseY + 20,
                    0
            );

            content.showTextAligned(
                    PdfContentByte.ALIGN_LEFT,
                    "Le : " + dateHeure,
                    leftX,
                    baseY + 8,
                    0
            );

            content.showTextAligned(
                    PdfContentByte.ALIGN_LEFT,
                    "Signé et certifié par REE",
                    leftX,
                    baseY - 4,
                    0
            );

            content.endText();

            // ================= SIGNATURE (PLUS À GAUCHE + UN PEU PLUS HAUT) =================
            Image signatureImage = Image.getInstance(signatureBytes);
            signatureImage.scaleToFit(260, 100); // taille lisible

            signatureImage.setAbsolutePosition(
                    leftX -60,    // ← décalé de 10px vers la gauche
                    baseY + 9    // ↑ 5px plus haut que la version précédente
            );

            content.addImage(signatureImage);

            // ================= LOGO EER (TRÈS PETIT & TRÈS PROCHE DE "EER") =================
            String logoPath = "src/main/resources/static/assets/eer-logo.png";
            Image logo = Image.getInstance(logoPath);

            logo.scaleToFit(10, 10); // très discret

            logo.setAbsolutePosition(
                    leftX + 100.5f,   // très proche après "EER" (~0.5px d'espace)
                    baseY - 6
            );

            content.addImage(logo);

            stamper.close();
            reader.close();

            // Écraser le PDF original
            try (FileOutputStream fos = new FileOutputStream(pdfFile)) {
                fos.write(out.toByteArray());
            }

            // Mise à jour statut
            facture.setStatus(AdresseFacture.FactureStatus.SIGNED);
            adresseFactureRepository.save(facture);

            log.info("Facture {} signée avec succès", factureId);
            return ResponseEntity.ok("Facture signée avec succès");

        } catch (Exception e) {
            log.error("Erreur signature facture {}", factureId, e);
            return ResponseEntity.internalServerError()
                    .body("Erreur serveur : " + e.getMessage());
        }
    }

    // ================= ENVOI EMAIL =================
    @PostMapping("/send/email/{id}")
    public ResponseEntity<String> sendFactureEmailManuellement(@PathVariable Long id) {
        try {
            AdresseFacture facture = adresseFactureRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Facture non trouvée"));

            if (facture.getPdfPath() == null ||
                    !new File(facture.getPdfPath()).exists()) {
                return ResponseEntity.badRequest().body("Erreur : PDF non trouvé");
            }

            String clientEmail = facture.getAdresse().getClient().getEmail();
            if (clientEmail == null || clientEmail.isBlank()) {
                return ResponseEntity.badRequest().body("Erreur : Aucun email client");
            }

            String clientName =
                    facture.getAdresse().getClient().getNom() + " " +
                            facture.getAdresse().getClient().getPrenom();

            String moisFacture =
                    facture.getMois().getMonth() + " " +
                            facture.getMois().getYear();

            emailService.sendFactureEmail(
                    clientEmail.trim(),
                    clientName.trim(),
                    facture.getPdfPath(),
                    moisFacture
            );

            facture.setStatus(AdresseFacture.FactureStatus.SENT);
            adresseFactureRepository.save(facture);

            return ResponseEntity.ok(
                    "Facture envoyée avec succès à " + clientEmail
            );

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Erreur envoi email : " + e.getMessage());
        }
    }
}