package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "releves_historique")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReleveHistorique {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long releveId; // référence au relevé original (optionnel)

    @Column(nullable = false)
    private Timestamp dateReleve;

    @Column(length = 7, nullable = false)
    private String moisAnnee; // ex: "2026-01"

    // Agent
    private Long agentId;
    private String agentNom;
    private String agentPrenom;

    private String clientOdooId;

    // Adresse
    private String adresseComplete;
    private String quartier;
    private String ville;

    // Consommations EAU
    private Integer ancienIndexEau;
    private Integer nouvelIndexEau;
    private Integer consommationEau;

    // Consommations ÉLECTRICITÉ
    private Integer ancienIndexElectricite;
    private Integer nouvelIndexElectricite;
    private Integer consommationElectricite;

    @CreationTimestamp
    @Column(updatable = false)
    private Timestamp dateArchivage;
}