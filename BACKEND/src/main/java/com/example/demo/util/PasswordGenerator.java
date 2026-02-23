package com.example.demo.util;

import java.security.SecureRandom;

public class PasswordGenerator {

    // Caractères autorisés pour le mot de passe temporaire
    private static final String UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
    private static final String DIGITS = "0123456789";
    private static final String SPECIAL = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    private static final String ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL;

    private static final SecureRandom random = new SecureRandom();

    /**
     * Génère un mot de passe temporaire fort de 12 caractères
     * (contient majuscules, minuscules, chiffres et caractères spéciaux)
     */
    public static String generateTempPassword() {
        StringBuilder password = new StringBuilder(12);

        // Au moins un de chaque type pour garantir la complexité
        password.append(UPPERCASE.charAt(random.nextInt(UPPERCASE.length())));
        password.append(LOWERCASE.charAt(random.nextInt(LOWERCASE.length())));
        password.append(DIGITS.charAt(random.nextInt(DIGITS.length())));
        password.append(SPECIAL.charAt(random.nextInt(SPECIAL.length())));

        // Compléter jusqu'à 12 caractères
        for (int i = 4; i < 12; i++) {
            password.append(ALL_CHARS.charAt(random.nextInt(ALL_CHARS.length())));
        }

        // Mélanger les caractères pour éviter un pattern prévisible
        char[] chars = password.toString().toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = chars[i];
            chars[i] = chars[j];
            chars[j] = temp;
        }

        return new String(chars);
    }

    /**
     * Génère un code PIN de 6 chiffres
     */
    public static String generatePin() {
        return String.format("%06d", random.nextInt(1000000));
    }
}