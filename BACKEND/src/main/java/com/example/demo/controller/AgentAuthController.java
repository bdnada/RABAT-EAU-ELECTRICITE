// 4. AgentAuthController.java (version complète avec les deux logins)
package com.example.demo.controller;

import com.example.demo.config.JwtService;
import com.example.demo.dto.AuthRequest;
import com.example.demo.dto.AuthResponse;
import com.example.demo.dto.ChangePasswordDto;
import com.example.demo.dto.PinLoginRequest;
import com.example.demo.entity.AgentTerrain;
import com.example.demo.repository.AgentTerrainRepository;
import com.example.demo.service.AgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agent/auth")
@RequiredArgsConstructor
public class AgentAuthController {

    private final AuthenticationManager authManager;
    private final JwtService jwtService;
    private final AgentTerrainRepository repo;
    private final AgentService agentService;
    private final PasswordEncoder passwordEncoder;

    // Connexion classique (email + mot de passe)
    @PostMapping("/login")
    public AuthResponse login(@RequestBody AuthRequest req) {
        try {
            Authentication authentication = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.username(), req.password())
            );

            AgentTerrain agent = repo.findByEmail(req.username())
                    .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));

            if (!agent.isLoginStatus()) {
                throw new DisabledException("Votre accès à l'application mobile est actuellement désactivé.");
            }

            if (!agent.isEnabled()) {
                throw new DisabledException("Compte inactif dans le système.");
            }

            String token = jwtService.generateToken(agent);
            return new AuthResponse(token);

        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Identifiants incorrects");
        } catch (DisabledException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la connexion : " + e.getMessage());
        }
    }

    // Nouvelle connexion : Téléphone professionnel + Code PIN
    @PostMapping("/login-pin")
    public AuthResponse loginWithPin(@RequestBody PinLoginRequest request) {
        if (request.pin() == null || !request.pin().matches("^\\d{6}$")) {
            throw new BadCredentialsException("Le code PIN doit être composé de 6 chiffres");
        }

        AgentTerrain agent = repo.findByTelProfessionnel(request.phoneNumber())
                .orElseThrow(() -> new UsernameNotFoundException("Numéro professionnel non trouvé"));

        if (!agent.isLoginStatus()) {
            throw new DisabledException("Accès application mobile désactivé");
        }

        if (!agent.isEnabled()) {
            throw new DisabledException("Compte inactif");
        }

        if (agent.isPinLocked()) {
            long minutesLeft = java.time.Duration.between(
                    java.time.LocalDateTime.now(), agent.getPinLockedUntil()
            ).toMinutes();
            throw new BadCredentialsException(
                    "Trop de tentatives. Réessayez dans " + minutesLeft + " minute(s)."
            );
        }

        if (agent.getPinHash() == null || !passwordEncoder.matches(request.pin(), agent.getPinHash())) {
            agent.recordFailedPinAttempt();
            repo.save(agent);

            int remaining = AgentTerrain.MAX_PIN_ATTEMPTS - agent.getPinFailedAttempts();
            throw new BadCredentialsException(
                    "Code PIN incorrect. Tentatives restantes : " + remaining
            );
        }

        agent.resetPinAttempts();
        repo.save(agent);

        String token = jwtService.generateToken(agent);
        return new AuthResponse(token);
    }

    // Optionnel : régénération du PIN (souvent réservé admin)
    @PostMapping("/regenerate-pin/{id}")
    public ResponseEntity<String> regeneratePin(@PathVariable Long id) {
        agentService.regeneratePin(id);
        return ResponseEntity.ok("Nouveau code PIN généré et envoyé");
    }
}