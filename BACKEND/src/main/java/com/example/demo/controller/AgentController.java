package com.example.demo.controller;

import com.example.demo.dto.AgentAccountDto;
import com.example.demo.entity.AgentLocation;
import com.example.demo.entity.AgentTerrain;
import com.example.demo.service.AgentLocationService;
import com.example.demo.service.AgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agents")
@RequiredArgsConstructor
public class AgentController {
    private final AgentLocationService locationService;
    private final AgentService service;

    // Liste tous les agents
    @GetMapping

    public List<AgentTerrain> all() {
        return service.findAll();
    }

    // Détail d'un agent
    @GetMapping("/{id}")

    public AgentTerrain getAgentById(@PathVariable Long id) {
        return service.findById(id);
    }

    // Assigner quartier
    @PutMapping("/{id}/quartier")

    public AgentTerrain assignQuartier(@PathVariable Long id, @RequestParam String quartier) {
        return service.assignQuartier(id, quartier);
    }

    // Créer compte mobile
    @PostMapping("/{id}/create-account")

    public AgentTerrain createAccount(@PathVariable Long id) {
        return service.createMobileAccount(id);
    }

    // Reset mot de passe
    @PostMapping("/{id}/reset-password")

    public ResponseEntity<String> resetPassword(@PathVariable Long id) {
        service.resetPassword(id);
        return ResponseEntity.ok("Mot de passe réinitialisé et email envoyé");
    }

    // Suppression définitive (seulement si inactif Odoo)
    @DeleteMapping("/{id}")

    public ResponseEntity<?> deleteAgent(@PathVariable Long id) {
        try {
            AgentTerrain agent = service.findById(id);
            if (agent.isActive()) {
                return ResponseEntity.badRequest().body("Impossible de supprimer un agent encore actif dans Odoo");
            }
            service.deleteAgent(id);
            return ResponseEntity.ok("Agent supprimé définitivement");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur lors de la suppression: " + e.getMessage());
        }
    }

    // NOUVEAUX ENDPOINTS - Gestion connexion mobile
    @PatchMapping("/{id}/login-status")
    public ResponseEntity<String> updateLoginStatus(
            @PathVariable Long id,
            @RequestParam boolean enabled) {
        service.updateLoginStatus(id, enabled);
        return ResponseEntity.ok("Connexion mobile " + (enabled ? "activée" : "désactivée"));
    }

    // Variantes explicites (facultatif - plus lisible dans l'interface admin)
    @PostMapping("/{id}/enable-login")
    public ResponseEntity<String> enableLogin(@PathVariable Long id) {
        service.updateLoginStatus(id, true);
        return ResponseEntity.ok("Connexion mobile autorisée");
    }

    @PostMapping("/{id}/disable-login")
    public ResponseEntity<String> disableLogin(@PathVariable Long id) {
        service.updateLoginStatus(id, false);
        return ResponseEntity.ok("Connexion mobile bloquée");
    }
    // Position d'un seul agent
    @GetMapping("/{id}/location")
    @PreAuthorize("hasAnyRole('SUPERADMIN','UTILISATEUR')")
    public ResponseEntity<AgentLocation> getAgentLocation(@PathVariable Long id) {
        AgentLocation location = locationService.getLatestForAgent(id);
        if (location == null) {
            return ResponseEntity.noContent().build(); // 204 No Content
        }
        return ResponseEntity.ok(location);
    }

    // Toutes les positions (pour la carte globale)
    @GetMapping("/locations")
    @PreAuthorize("hasAnyRole('SUPERADMIN','UTILISATEUR')")
    public List<AgentLocation> getAllCurrentLocations() {
        return locationService.getAllLatestLocations();
    }
}