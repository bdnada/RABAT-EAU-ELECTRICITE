package com.example.demo.repository;

import com.example.demo.entity.Compteur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompteurRepository extends JpaRepository<Compteur, Long> {
    List<Compteur> findByAdresseId(Long adresseId);
    boolean existsByNumeroCompteur(String numeroCompteur);
    Optional<Compteur> findTopByNumeroCompteurStartingWithOrderByNumeroCompteurDesc(String prefix);
}