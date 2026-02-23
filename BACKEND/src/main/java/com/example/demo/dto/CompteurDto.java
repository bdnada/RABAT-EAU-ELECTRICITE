package com.example.demo.dto;

import com.example.demo.entity.TypeCompteur;

public record CompteurDto(
        Long adresseId,
        TypeCompteur type
) {}