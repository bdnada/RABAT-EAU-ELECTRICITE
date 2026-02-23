package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    // ─── Stockage temporaire des OTP pour signature de facture ───────────────
    private final Map<String, String> otpSignatureStore = new HashMap<>();
    private final Map<String, Long> otpSignatureTime = new HashMap<>();
    private final long OTP_VALIDITY = 5 * 60 * 1000; // 5 minutes


    // 1. Envoi facture avec PDF joint (fonctionnalité existante)
    @Async
    public void sendFactureEmail(String toEmail, String clientName, String pdfPath, String mois) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("Impossible d'envoyer l'email facture : adresse email manquante");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("Votre facture de consommation - " + mois);

            String body = """
                Bonjour%s,
                
                Nous vous prions de trouver ci-joint votre facture de consommation pour le mois de %s.
                
                Merci pour votre confiance.
                
                Cordialement,
                L'équipe de gestion des compteurs
                """.formatted(clientName.isBlank() ? "" : " " + clientName, mois);

            helper.setText(body);

            FileSystemResource file = new FileSystemResource(pdfPath);
            if (file.exists()) {
                helper.addAttachment("facture_" + mois + ".pdf", file);
                log.info("Email facture envoyé à {} - PDF joint : {}", toEmail, pdfPath);
            } else {
                log.warn("PDF introuvable : {} – email envoyé sans pièce jointe", pdfPath);
                helper.setText(body + "\n\nNote : Le fichier PDF n'a pas pu être joint (problème technique).");
            }

            mailSender.send(message);

        } catch (MessagingException e) {
            log.error("Erreur formatage email facture à {} : {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.error("Erreur envoi email facture à {} : {}", toEmail, e.getMessage(), e);
        }
    }


    // 2. Envoi des identifiants temporaires (mot de passe)
    @Async
    public void sendTempPassword(String to, String password, String fullName) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setSubject("Vos identifiants - Application Relève");

            String text = """
                Bonjour %s,

                Votre compte sur l'application mobile "Relève" a été créé avec succès.

                Identifiants temporaires :
                • Email : %s
                • Mot de passe temporaire : %s

                → Vous devez changer ce mot de passe lors de votre première connexion.

                Bonne utilisation de l'application !

                Cordialement,
                L'équipe de gestion des relevés
                """.formatted(fullName, to, password);

            msg.setText(text);
            mailSender.send(msg);

            log.info("Identifiants temporaires envoyés à : {}", to);

        } catch (Exception e) {
            log.error("Erreur envoi identifiants à {} : {}", to, e.getMessage(), e);
        }
    }


    // 3. Envoi du code PIN seul
    @Async
    public void sendPin(String to, String pin, String phoneNumber, String fullName) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setSubject("Votre code PIN personnel - Application Relève");

            String text = """
                Bonjour %s,

                Voici votre code PIN pour vous connecter rapidement avec votre numéro professionnel :

                • Code PIN : %s
                • Numéro professionnel associé : %s

                Ce code est strictement personnel et confidentiel.
                Ne le partagez jamais.

                Pensez à le changer régulièrement pour plus de sécurité.

                Merci de votre collaboration.

                Cordialement,
                L'équipe de gestion des relevés
                """.formatted(fullName, pin, phoneNumber);

            msg.setText(text);
            mailSender.send(msg);

            log.info("Code PIN envoyé à : {}", to);

        } catch (Exception e) {
            log.error("Erreur envoi code PIN à {} : {}", to, e.getMessage(), e);
        }
    }


    // 4. Envoi combiné : identifiants + code PIN (le plus pratique pour la création de compte)
    @Async
    public void sendWelcomeWithCredentialsAndPin(
            String to,
            String tempPassword,
            String pin,
            String phoneNumber,
            String fullName) {

        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setSubject("Vos identifiants et code PIN - Application Relève");

            String text = """
                Bonjour %s,

                Votre compte sur l'application mobile "Relève" est maintenant actif !

                Connexion par email :
                • Email : %s
                • Mot de passe temporaire : %s   (à changer à la première connexion)

                Connexion rapide (numéro + PIN) :
                • Numéro professionnel : %s
                • Code PIN : %s

                Ces informations sont personnelles et confidentielles.
                Pour votre sécurité :
                - Changez votre mot de passe dès votre première connexion
                - Ne partagez jamais votre code PIN

                L'application est disponible sur Google Play et App Store.

                Bonne utilisation !

                Cordialement,
                L'équipe de gestion des relevés
                """.formatted(fullName, to, tempPassword, phoneNumber, pin);

            msg.setText(text);
            mailSender.send(msg);

            log.info("Email complet (identifiants + PIN) envoyé à : {}", to);

        } catch (Exception e) {
            log.error("Erreur envoi email complet à {} : {}", to, e.getMessage(), e);
        }
    }


    // 5. OTP pour signature facture (fonctionnalité existante)
    public void sendOtpForSignature(String email) {
        String otp = String.format("%06d", new Random().nextInt(1000000));
        otpSignatureStore.put(email, otp);
        otpSignatureTime.put(email, System.currentTimeMillis());

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(email);
        msg.setSubject("Signature de votre facture - Code de validation");
        msg.setText("Votre code de validation pour signer la facture est :\n\n" + otp + "\n\nValable 5 minutes.");
        mailSender.send(msg);

        log.info("OTP signature envoyé à : {}", email);
    }

    public boolean verifyOtp(String email, String otp) {
        String stored = otpSignatureStore.get(email);
        Long time = otpSignatureTime.get(email);

        if (stored == null || time == null || System.currentTimeMillis() - time > OTP_VALIDITY) {
            clearOtp(email);
            return false;
        }

        boolean valid = stored.equals(otp);
        if (valid) {
            clearOtp(email);
        }
        return valid;
    }

    private void clearOtp(String email) {
        otpSignatureStore.remove(email);
        otpSignatureTime.remove(email);
    }
}