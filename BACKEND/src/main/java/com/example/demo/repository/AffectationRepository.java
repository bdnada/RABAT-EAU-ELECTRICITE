package com.example.demo.repository;

import com.example.demo.entity.Affectation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface AffectationRepository extends JpaRepository<Affectation, Long> {

    List<Affectation> findByAgentId(Long agentId);

    @Query("SELECT a FROM Affectation a WHERE a.adresse.quartier = :quartier")
    List<Affectation> findByAdresseQuartier(String quartier);

    // Méthode pour supprimer par quartier (déjà OK)
    @Modifying
    @Transactional
    @Query("DELETE FROM Affectation a WHERE a.adresse.quartier = :quartier")
    int deleteByAdresseQuartier(String quartier);

    // Méthode pour supprimer TOUTES les affectations d'un agent spécifique
    @Modifying
    @Transactional
    @Query("DELETE FROM Affectation a WHERE a.agent.id = :agentId")
    int deleteByAgentId(@Param("agentId") Long agentId);
}