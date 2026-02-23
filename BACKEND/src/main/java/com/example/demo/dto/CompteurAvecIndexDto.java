package com.example.demo.dto;

import com.example.demo.entity.TypeCompteur;

public record CompteurAvecIndexDto(
        Long id,
        String numeroCompteur,
        TypeCompteur type,
        int ancienIndex,     // ← Index à afficher comme "ancien" ce mois-ci
        int indexActuel      // Index actuel dans le compteur (pour info/debug)
) {}