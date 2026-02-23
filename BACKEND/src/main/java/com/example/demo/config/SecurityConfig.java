package com.example.demo.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/api/agent/auth/**").permitAll()
                        .requestMatchers("/api/agent/**" , "/api/messages/agent/**").hasRole("AGENT")
                        .requestMatchers("/api/users/**").hasRole("SUPERADMIN")
                        .requestMatchers("/api/agents/**", "/api/compteurs/**", "/api/releves/**", "/api/facturation/**","/api/factures**","/api/factures/sign**").hasAnyRole("SUPERADMIN","UTILISATEUR")
                        .requestMatchers("/api/messages/admin/**").hasRole("UTILISATEUR")
                        .requestMatchers(HttpMethod.POST, "/api/factures/sign/**").permitAll()



                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}