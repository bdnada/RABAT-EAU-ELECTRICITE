package com.example.demo.controller;

import com.example.demo.entity.Adresse;
import com.example.demo.service.AdresseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/adresses")
@RequiredArgsConstructor

public class AdresseController {

    private final AdresseService adresseService;

    // Récupérer toutes les adresses
    @GetMapping
    public List<Adresse> getAllAdresses() {
        return adresseService.findAll();
    }

    @GetMapping("/incompletes")
    public List<Adresse> getAdressesWithoutBothCounters() {
        return adresseService.findAdressesWithoutBothCounters();
    }

    // Optionnel : par ID
    @GetMapping("/{id}")
    public Adresse getAdresseById(@PathVariable Long id) {
        return adresseService.findById(id);
    }

    // Optionnel : filtrer par quartier
    @GetMapping("/quartier/{quartier}")
    public List<Adresse> getByQuartier(@PathVariable String quartier) {
        return adresseService.findByQuartier(quartier);
    }

    // Optionnel : recherche par texte (adresse complète, ville, etc.)
    @GetMapping("/search")
    public List<Adresse> search(@RequestParam String q) {
        return adresseService.search(q);
    }
}