package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.sql.Timestamp;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "agents_terrain")
@Getter
@Setter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class AgentTerrain implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "odoo_agent_id", unique = true, nullable = false)
    private String odooAgentId;

    private String nom;
    private String prenom;

    private String telPersonnel;
    private String telProfessionnel;

    private String quartier;

    private String email;
    private String password;

    private boolean resetRequired = true;

    // Statut dans Odoo / existence du compte
    private boolean active = false;

    // Contrôle la possibilité de se connecter à l'application mobile
    @Column(name = "login_status", nullable = false)
    private boolean loginStatus = false;

    @CreationTimestamp
    private Timestamp createdAt;

    // ───────────────────────────────────────────────────────────────
    //          Champs pour l'authentification par code PIN
    // ───────────────────────────────────────────────────────────────

    @Column(name = "pin_hash")
    private String pinHash;

    @Column(name = "pin_failed_attempts", nullable = false)
    @Builder.Default
    private Integer pinFailedAttempts = 0;

    @Column(name = "pin_locked_until")
    private LocalDateTime pinLockedUntil;

    // Constantes de politique de sécurité (accessibles via getters si besoin)
    public static final int MAX_PIN_ATTEMPTS = 3;
    private static final int LOCK_DURATION_MINUTES = 15;

    // ───────────────────────────────────────────────────────────────
    //         Méthodes utilitaires pour la gestion du PIN
    // ───────────────────────────────────────────────────────────────

    public boolean isPinLocked() {
        return pinLockedUntil != null && pinLockedUntil.isAfter(LocalDateTime.now());
    }

    public void recordFailedPinAttempt() {
        // Protection supplémentaire contre null (très rare mais sécurise)
        if (this.pinFailedAttempts == null) {
            this.pinFailedAttempts = 0;
        }

        this.pinFailedAttempts++;

        if (this.pinFailedAttempts >= MAX_PIN_ATTEMPTS) {
            this.pinLockedUntil = LocalDateTime.now().plusMinutes(LOCK_DURATION_MINUTES);
            this.pinFailedAttempts = 0; // reset après blocage
        }
    }

    public void resetPinAttempts() {
        this.pinFailedAttempts = 0;
        this.pinLockedUntil = null;
    }

    // ───────────────────────────────────────────────────────────────
    //         Implémentation de UserDetails
    // ───────────────────────────────────────────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_AGENT"));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return loginStatus; // ou true si vous voulez une logique différente
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active && loginStatus;
    }

    // Optionnel : méthode de pré-persist pour sécurité maximale
    @PrePersist
    @PreUpdate
    private void ensurePinAttemptsNotNull() {
        if (this.pinFailedAttempts == null) {
            this.pinFailedAttempts = 0;
        }
    }
}