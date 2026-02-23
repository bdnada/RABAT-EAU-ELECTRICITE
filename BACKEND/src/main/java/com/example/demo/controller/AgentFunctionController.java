package com.example.demo.controller;

import com.example.demo.dto.CompteurAvecIndexDto;
import com.example.demo.dto.LocationDto;
import com.example.demo.dto.ReleveDto;
import com.example.demo.entity.*;
import com.example.demo.repository.AdresseRepository;
import com.example.demo.repository.AffectationRepository;
import com.example.demo.repository.AgentTerrainRepository;
import com.example.demo.repository.CompteurRepository;
import com.example.demo.service.AgentFunctionService;
import com.example.demo.service.AgentLocationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
public class AgentFunctionController {

    private final AgentFunctionService service;
    private final AgentTerrainRepository agentRepository;
    private final CompteurRepository compteurRepository;
    private final AdresseRepository adresseRepository;
    private final AffectationRepository affectationRepository;
    private final AgentLocationService locationService;

    @GetMapping("/tournee")
    public List<Adresse> getTournee(Authentication authentication) {
        String email = authentication.getName();
        AgentTerrain agent = agentRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));

        log.info("Tournée demandée par agent : {} (ID: {})", email, agent.getId());

        // Récupération EXCLUSIVE des adresses affectées à CET agent
        List<Affectation> affectations = affectationRepository.findByAgentId(agent.getId());

        if (affectations.isEmpty()) {
            log.warn("Aucune adresse affectée pour l'agent ID {}", agent.getId());
            return Collections.emptyList();
        }

        List<Adresse> adressesAffectees = affectations.stream()
                .map(Affectation::getAdresse)
                .collect(Collectors.toList());

        log.info("Agent {} récupère {} adresses affectées", agent.getId(), adressesAffectees.size());

        LocalDate debutMois = LocalDate.now().withDayOfMonth(1);
        LocalDate finMois = debutMois.withDayOfMonth(debutMois.lengthOfMonth());

        return adressesAffectees.stream()
                .filter(adresse -> {
                    List<Compteur> compteurs = compteurRepository.findByAdresseId(adresse.getId());

                    return compteurs.stream()
                            .anyMatch(c ->
                                    c.getDateDerniereReleve() == null ||
                                            c.getDateDerniereReleve().toLocalDateTime().toLocalDate().isBefore(debutMois) ||
                                            c.getDateDerniereReleve().toLocalDateTime().toLocalDate().isAfter(finMois)
                            );
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/tournee-traitees")
    public List<Adresse> getTourneeTraitees(Authentication authentication) {
        String email = authentication.getName();
        AgentTerrain agent = agentRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));

        // Récupération des adresses affectées à cet agent
        List<Adresse> adressesAffectees = affectationRepository.findByAgentId(agent.getId())
                .stream()
                .map(Affectation::getAdresse)
                .collect(Collectors.toList());

        if (adressesAffectees.isEmpty()) {
            log.warn("Aucune adresse affectée pour l'agent ID {}", agent.getId());
            return Collections.emptyList();
        }

        LocalDate debutMois = LocalDate.now().withDayOfMonth(1);
        LocalDate finMois = debutMois.withDayOfMonth(debutMois.lengthOfMonth());

        return adressesAffectees.stream()
                .filter(adresse -> {
                    List<Compteur> compteurs = compteurRepository.findByAdresseId(adresse.getId());

                    // CONDITION 1 : Doit avoir EXACTEMENT 2 compteurs (EAU + ÉLECTRICITÉ)
                    if (compteurs.size() != 2) {
                        return false; // → adresse incomplète = NON TRAITÉE
                    }

                    // Vérifier que les deux types sont présents (facultatif mais recommandé)
                    boolean hasEau = compteurs.stream().anyMatch(c -> c.getType() == TypeCompteur.EAU);
                    boolean hasElec = compteurs.stream().anyMatch(c -> c.getType() == TypeCompteur.ELECTRICITE);
                    if (!hasEau || !hasElec) {
                        return false;
                    }

                    // CONDITION 2 : Tous les compteurs doivent avoir été relevés ce mois
                    return compteurs.stream()
                            .allMatch(c ->
                                    c.getDateDerniereReleve() != null &&
                                            !c.getDateDerniereReleve().toLocalDateTime().toLocalDate().isBefore(debutMois) &&
                                            !c.getDateDerniereReleve().toLocalDateTime().toLocalDate().isAfter(finMois)
                            );
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/compteurs/{adresseId}")
    public List<CompteurAvecIndexDto> getCompteurs(@PathVariable Long adresseId) {
        return service.getCompteursPourReleve(adresseId);
    }

    @PostMapping("/releves")
    public void saveReleves(
            @RequestBody List<ReleveDto> releves,
            Authentication authentication
    ) {
        String email = authentication.getName();
        service.saveReleves(releves, email);
    }

    // Méthode pour que l'agent envoie sa position
    // Garder ou ajouter ceci dans AgentFunctionController.java

    @PostMapping("/location")
    public ResponseEntity<Void> updateMyLocation(
            @RequestBody LocationDto location,
            Authentication authentication) {

        String email = authentication.getName();
        AgentTerrain agent = agentRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));

        locationService.updateAgentLocation(
                agent.getId(),
                location.latitude(),
                location.longitude()
        );

        return ResponseEntity.ok().build(); // 200 OK sans contenu
    }

}