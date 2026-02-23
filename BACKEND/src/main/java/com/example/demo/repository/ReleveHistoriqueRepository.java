package com.example.demo.repository;

import com.example.demo.entity.ReleveHistorique;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReleveHistoriqueRepository extends JpaRepository<ReleveHistorique, Long> {

    List<ReleveHistorique> findByMoisAnnee(String moisAnnee);

    List<ReleveHistorique> findByAgentId(Long agentId);

    // Recherche approximative par adresse (peut retourner plusieurs résultats)
    List<ReleveHistorique> findByAdresseCompleteContainingOrQuartierContainingOrVilleContaining(
            String adresseComplete,
            String quartier,
            String ville
    );
}