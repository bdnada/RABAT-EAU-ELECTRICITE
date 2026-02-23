package com.example.demo.repository;

import com.example.demo.entity.Releve;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReleveRepository extends JpaRepository<Releve, Long> {

    // Méthode existante que tu veux absolument conserver
    Optional<Releve> findTopByCompteurIdAndDateReleveBetween(
            Long compteurId,
            Timestamp debut,
            Timestamp fin);

    // Tous les relevés d'un client Odoo (utilisé dans l'endpoint par client)
    @Query("SELECT r FROM Releve r " +
            "WHERE r.compteur.adresse.client.odooClientId = :odooClientId")
    List<Releve> findByClientOdooId(@Param("odooClientId") String odooClientId);


    // ───────────────────────────────────────────────────────────────
    // Méthodes les plus utiles pour la facturation par adresse + mois
    // ───────────────────────────────────────────────────────────────

    /**
     * Relevé d'une adresse sur un intervalle de dates (mois complet)
     * Version recommandée et la plus performante/ claire
     */
    @Query("""
        SELECT r FROM Releve r
        WHERE r.compteur.adresse.id = :adresseId
          AND r.dateReleve >= :debutMois
          AND r.dateReleve < :finMoisPlusUn
        ORDER BY r.dateReleve ASC
        """)
    List<Releve> findByAdresseAndMonthRange(
            @Param("adresseId") Long adresseId,
            @Param("debutMois") LocalDateTime debutMois,
            @Param("finMoisPlusUn") LocalDateTime finMoisPlusUn);


    /**
     * Variante avec year/month (plus simple à appeler dans certains cas)
     */
    @Query("""
        SELECT r FROM Releve r
        WHERE r.compteur.adresse.id = :adresseId
          AND YEAR(r.dateReleve) = :annee
          AND MONTH(r.dateReleve) = :mois
        ORDER BY r.dateReleve ASC
        """)
    List<Releve> findByAdresseAndYearMonth(
            @Param("adresseId") Long adresseId,
            @Param("annee") int annee,
            @Param("mois") int mois);


    // Si tu veux conserver une version "mois en String" (YYYY-MM)
    @Query("SELECT r FROM Releve r " +
            "WHERE r.compteur.adresse.client.odooClientId = :odooClientId " +
            "AND FUNCTION('DATE_FORMAT', r.dateReleve, '%Y-%m') = :mois")
    List<Releve> findByClientOdooIdAndMois(
            @Param("odooClientId") String odooClientId,
            @Param("mois") String moisYYYYMM);

}