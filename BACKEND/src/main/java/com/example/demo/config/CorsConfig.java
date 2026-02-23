package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Pour le développement, autoriser toutes les origines
        config.setAllowedOrigins(List.of(
                "http://localhost:3000"
        ));

        // Autoriser toutes les méthodes
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // Autoriser tous les headers
        config.setAllowedHeaders(List.of("*"));

        // Exposer les headers de réponse
        config.setExposedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Content-Disposition",
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Credentials"
        ));

        // Autoriser les credentials (cookies, auth headers)
        config.setAllowCredentials(true);

        // Cache préflight pour 1 heure
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        config.setAllowedHeaders(List.of("*", "Content-Type")); //  Pour multipart

        return source;
    }
}