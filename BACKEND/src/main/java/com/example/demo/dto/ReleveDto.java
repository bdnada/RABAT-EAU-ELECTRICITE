package com.example.demo.dto;

public record ReleveDto(
        Long compteurId,
        Long agentId,          // ← Ajouté pour le backoffice
        Integer ancienIndex,
        Integer nouvelIndex
) {}