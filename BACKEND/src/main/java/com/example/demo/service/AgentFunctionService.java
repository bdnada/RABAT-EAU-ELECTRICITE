package com.example.demo.service;

import com.example.demo.dto.CompteurAvecIndexDto;
import com.example.demo.dto.ReleveDto;
import com.example.demo.entity.*;
import com.example.demo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AgentFunctionService {

    private final AgentTerrainRepository agentRepository;
    private final AdresseRepository adresseRepository;
    private final CompteurRepository compteurRepository;
    private final ReleveRepository releveRepository;
    private final ReleveService releveService;

    public List<Adresse> getTourneeByAgentEmail(String email) {
        AgentTerrain agent = agentRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));

        if (agent.getQuartier() == null || agent.getQuartier().isBlank()) {
            throw new RuntimeException("Quartier non assigné à l’agent");
        }

        return adresseRepository.findByQuartier(agent.getQuartier());
    }

    public List<CompteurAvecIndexDto> getCompteursPourReleve(Long adresseId) {
        List<Compteur> compteurs = compteurRepository.findByAdresseId(adresseId);

        LocalDate moisCourant = LocalDate.now().withDayOfMonth(1);
        LocalDate debutMoisPrecedent = moisCourant.minusMonths(1);
        LocalDate finMoisPrecedent = debutMoisPrecedent.withDayOfMonth(debutMoisPrecedent.lengthOfMonth());

        // Conversion propre avec LocalDateTime
        LocalDateTime debutLDT = debutMoisPrecedent.atStartOfDay(); // 2026-01-01 00:00
        LocalDateTime finLDT = finMoisPrecedent.plusDays(1).atStartOfDay(); // 2026-01-31 → 2026-02-01 00:00

        Timestamp debut = Timestamp.valueOf(debutLDT);
        Timestamp fin = Timestamp.valueOf(finLDT);

        return compteurs.stream().map(compteur -> {
            releveRepository.findTopByCompteurIdAndDateReleveBetween(
                    compteur.getId(),
                    debut,
                    fin
            ).ifPresent(dernier -> {
                compteur.setIndexActuel(dernier.getNouvelIndex());
            });

            return new CompteurAvecIndexDto(
                    compteur.getId(),
                    compteur.getNumeroCompteur(),
                    compteur.getType(),
                    compteur.getIndexActuel(),  // ancien index = dernier nouvelIndex du mois précédent
                    compteur.getIndexActuel()
            );
        }).toList();
    }

    @Transactional
    public void saveReleves(List<ReleveDto> dtos, String email) {
        AgentTerrain agent = agentRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));

        for (ReleveDto dto : dtos) {
            releveService.create(dto, agent.getId());
        }
    }
}