package com.example.demo.dto;

import java.sql.Timestamp;

public record ReleveHistoriqueDto(
        Long id,
        Long releveId,
        Timestamp dateReleve,
        String moisAnnee,
        Long agentId,
        String agentNom,
        String agentPrenom,
        String clientOdooId,
        String adresseComplete,
        String quartier,
        String ville,
        Integer ancienIndexEau,
        Integer nouvelIndexEau,
        Integer consommationEau,
        Integer ancienIndexElectricite,
        Integer nouvelIndexElectricite,
        Integer consommationElectricite,
        Timestamp dateArchivage
) {}