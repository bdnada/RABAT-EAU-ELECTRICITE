package com.example.demo.repository;

import com.example.demo.entity.Adresse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AdresseRepository extends JpaRepository<Adresse, Long> {
    Optional<Adresse> findByOdooAdresseId(String odooAdresseId);
    List<Adresse> findByQuartier(String quartier);

    @Query("""
        SELECT a FROM Adresse a
        WHERE NOT EXISTS (
            SELECT 1 FROM Compteur c1 WHERE c1.adresse = a AND c1.type = 'EAU'
        ) OR NOT EXISTS (
            SELECT 1 FROM Compteur c2 WHERE c2.adresse = a AND c2.type = 'ELECTRICITE'
        )
        """)
    List<Adresse> findAdressesWithoutBothCounterTypes();

}
