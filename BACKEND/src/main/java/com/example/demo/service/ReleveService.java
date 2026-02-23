package com.example.demo.service;

import com.example.demo.dto.ReleveDto;
import com.example.demo.dto.ReleveHistoriqueDto;
import com.example.demo.entity.*;
import com.example.demo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReleveService {

    private final ReleveRepository repository;
    private final CompteurRepository compteurRepo;
    private final AgentTerrainRepository agentRepo;
    private final AdresseRepository adresseRepo;           // ← AJOUTÉ ICI
    private final ReleveHistoriqueRepository releveHistoriqueRepo; // ← AJOUTÉ ICI

    // ======================== MÉTHODES EXISTANTES ========================

    public List<Releve> findAll() {
        return repository.findAll();
    }

    public Releve findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Relevé non trouvé"));
    }

    @Transactional
    public Releve create(ReleveDto dto, Long agentId) {
        return createReleve(dto, agentId);
    }

    @Transactional
    public Releve create(ReleveDto dto) {
        if (dto.agentId() == null) {
            throw new RuntimeException("agentId requis pour création manuelle");
        }
        return createReleve(dto, dto.agentId());
    }

    private Releve createReleve(ReleveDto dto, Long agentId) {
        Compteur compteur = compteurRepo.findById(dto.compteurId())
                .orElseThrow(() -> new RuntimeException("Compteur non trouvé"));

        AgentTerrain agent = agentRepo.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));

        Adresse adresse = compteur.getAdresse();

        if (dto.ancienIndex() != compteur.getIndexActuel()) {
            throw new RuntimeException("Ancien index incorrect. L'index attendu est " + compteur.getIndexActuel());
        }

        if (dto.nouvelIndex() < dto.ancienIndex()) {
            throw new RuntimeException("Le nouvel index ne peut pas être inférieur à l'ancien");
        }

        int consommation = dto.nouvelIndex() - dto.ancienIndex();

        Releve releve = Releve.builder()
                .compteur(compteur)
                .agent(agent)
                .ancienIndex(dto.ancienIndex())
                .nouvelIndex(dto.nouvelIndex())
                .consommation(consommation)
                .dateReleve(Timestamp.from(Instant.now()))
                .build();

        compteur.setIndexActuel(dto.nouvelIndex());
        compteur.setDateDerniereReleve(releve.getDateReleve());
        compteurRepo.save(compteur);

        releve = repository.save(releve);

        archiveDansHistorique(releve, adresse, agent);

        return releve;
    }

    private void archiveDansHistorique(Releve releve, Adresse adresse, AgentTerrain agent) {
        String moisAnnee = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        List<Compteur> compteurs = compteurRepo.findByAdresseId(adresse.getId());

        Integer ancienEau = null, nouvelEau = null, consoEau = null;
        Integer ancienElec = null, nouvelElec = null, consoElec = null;

        for (Compteur c : compteurs) {
            if (c.getType() == TypeCompteur.EAU) {
                if (c.getId().equals(releve.getCompteur().getId())) {
                    ancienEau = releve.getAncienIndex();
                    nouvelEau = releve.getNouvelIndex();
                    consoEau = releve.getConsommation();
                } else {
                    ancienEau = c.getIndexActuel();
                }
            } else if (c.getType() == TypeCompteur.ELECTRICITE) {
                if (c.getId().equals(releve.getCompteur().getId())) {
                    ancienElec = releve.getAncienIndex();
                    nouvelElec = releve.getNouvelIndex();
                    consoElec = releve.getConsommation();
                } else {
                    ancienElec = c.getIndexActuel();
                }
            }
        }

        ReleveHistorique hist = ReleveHistorique.builder()
                .releveId(releve.getId())
                .dateReleve(releve.getDateReleve())
                .moisAnnee(moisAnnee)
                .agentId(agent.getId())
                .agentNom(agent.getNom())
                .agentPrenom(agent.getPrenom())
                .clientOdooId(adresse.getClient().getOdooClientId())
                .adresseComplete(adresse.getAdresseComplete())
                .quartier(adresse.getQuartier())
                .ville(adresse.getVille())
                .ancienIndexEau(ancienEau)
                .nouvelIndexEau(nouvelEau)
                .consommationEau(consoEau)
                .ancienIndexElectricite(ancienElec)
                .nouvelIndexElectricite(nouvelElec)
                .consommationElectricite(consoElec)
                .build();

        releveHistoriqueRepo.save(hist);
    }

    // ======================== MÉTHODES HISTORIQUE ========================

    public List<ReleveHistoriqueDto> getHistoriqueAll() {
        return releveHistoriqueRepo.findAll()
                .stream()
                .map(this::toHistoriqueDto)
                .collect(Collectors.toList());
    }

    public List<ReleveHistoriqueDto> getHistoriqueByMois(String moisAnnee) {
        return releveHistoriqueRepo.findByMoisAnnee(moisAnnee)
                .stream()
                .map(this::toHistoriqueDto)
                .collect(Collectors.toList());
    }

    public List<ReleveHistoriqueDto> getHistoriqueByAgent(Long agentId) {
        return releveHistoriqueRepo.findByAgentId(agentId)
                .stream()
                .map(this::toHistoriqueDto)
                .collect(Collectors.toList());
    }

    // Tu n'as plus besoin de cette méthode si tu ne veux pas chercher par adresse précise
    // Mais si tu la gardes, maintenant adresseRepo est injecté → plus d'erreur !
    // public List<ReleveHistoriqueDto> getHistoriqueByAdresse(Long adresseId) { ... }

    private ReleveHistoriqueDto toHistoriqueDto(ReleveHistorique hist) {
        return new ReleveHistoriqueDto(
                hist.getId(),
                hist.getReleveId(),
                hist.getDateReleve(),
                hist.getMoisAnnee(),
                hist.getAgentId(),
                hist.getAgentNom(),
                hist.getAgentPrenom(),
                hist.getClientOdooId(),
                hist.getAdresseComplete(),
                hist.getQuartier(),
                hist.getVille(),
                hist.getAncienIndexEau(),
                hist.getNouvelIndexEau(),
                hist.getConsommationEau(),
                hist.getAncienIndexElectricite(),
                hist.getNouvelIndexElectricite(),
                hist.getConsommationElectricite(),
                hist.getDateArchivage()
        );
    }
}