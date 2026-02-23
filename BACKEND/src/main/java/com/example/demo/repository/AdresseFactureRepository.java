package com.example.demo.repository;

import com.example.demo.entity.AdresseFacture;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface AdresseFactureRepository extends JpaRepository<AdresseFacture, Long> {

    Optional<AdresseFacture> findByAdresseIdAndMois(Long adresseId, LocalDate mois);

    boolean existsByFactureUniqueId(String factureUniqueId);
}