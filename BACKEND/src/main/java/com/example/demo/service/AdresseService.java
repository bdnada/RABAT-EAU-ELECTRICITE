package com.example.demo.service;

import com.example.demo.entity.Adresse;
import com.example.demo.repository.AdresseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdresseService {

    private final AdresseRepository repository;

    public List<Adresse> findAll() {
        return repository.findAll();
    }

    public Adresse findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Adresse non trouvée : " + id));
    }

    public List<Adresse> findByQuartier(String quartier) {
        return repository.findByQuartier(quartier);
    }
    public List<Adresse> findAdressesWithoutBothCounters() {
        return repository.findAdressesWithoutBothCounterTypes();
    }

    // Recherche simple dans adresse_complete et ville
    public List<Adresse> search(String query) {
        String likeQuery = "%" + query.toLowerCase() + "%";
        return repository.findAll().stream()
                .filter(a ->
                        a.getAdresseComplete().toLowerCase().contains(query.toLowerCase()) ||
                                a.getVille().toLowerCase().contains(query.toLowerCase()) ||
                                (a.getQuartier() != null && a.getQuartier().toLowerCase().contains(query.toLowerCase()))
                )
                .toList();
    }
}