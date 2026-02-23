package com.example.demo.service;

import com.example.demo.dto.CompteurDto;
import com.example.demo.entity.Compteur;
import com.example.demo.entity.TypeCompteur;
import com.example.demo.repository.AdresseRepository;
import com.example.demo.repository.CompteurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class CompteurService {

    private final CompteurRepository compteurRepo;
    private final AdresseRepository adresseRepo;

    public List<Compteur> findAll() {
        return compteurRepo.findAll();
    }

    public Compteur findById(Long id) {
        return compteurRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Compteur non trouvé"));
    }

    public Compteur create(CompteurDto dto) {
        var adresse = adresseRepo.findById(dto.adresseId())
                .orElseThrow(() -> new RuntimeException("Adresse non trouvée"));

        // Vérification : un seul compteur EAU et un seul ELEC par adresse
        boolean alreadyExists = compteurRepo.findByAdresseId(dto.adresseId()).stream()
                .anyMatch(c -> c.getType() == dto.type());

        if (alreadyExists) {
            throw new RuntimeException("Un compteur de type " + dto.type() + " existe déjà pour cette adresse");
        }

        // Génération aléatoire du numéro
        String numeroCompteur = generateRandomNumero(dto.type());

        Compteur compteur = Compteur.builder()
                .numeroCompteur(numeroCompteur)
                .adresse(adresse)
                .type(dto.type())
                .indexActuel(0)  // Valeur par défaut
                .build();

        return compteurRepo.save(compteur);
    }

    public Compteur update(Long id, CompteurDto dto) {
        Compteur compteur = findById(id);

        // Si changement d'adresse, vérifier l'unicité sur la nouvelle adresse
        if (dto.adresseId() != null && !dto.adresseId().equals(compteur.getAdresse().getId())) {
            var nouvelleAdresse = adresseRepo.findById(dto.adresseId())
                    .orElseThrow(() -> new RuntimeException("Adresse non trouvée"));

            boolean existsOnNewAdresse = compteurRepo.findByAdresseId(dto.adresseId()).stream()
                    .anyMatch(c -> c.getType() == compteur.getType() && !c.getId().equals(id));

            if (existsOnNewAdresse) {
                throw new RuntimeException("Un compteur de type " + compteur.getType() + " existe déjà sur la nouvelle adresse");
            }

            compteur.setAdresse(nouvelleAdresse);
        }

        // Mise à jour du type (avec vérification si changement)
        if (dto.type() != null && dto.type() != compteur.getType()) {
            boolean existsWithNewType = compteurRepo.findByAdresseId(compteur.getAdresse().getId()).stream()
                    .anyMatch(c -> c.getType() == dto.type() && !c.getId().equals(id));

            if (existsWithNewType) {
                throw new RuntimeException("Un compteur de type " + dto.type() + " existe déjà sur cette adresse");
            }

            compteur.setType(dto.type());
        }

        return compteurRepo.save(compteur);
    }

    public void delete(Long id) {
        compteurRepo.deleteById(id);
    }

    /**
     * Génère un numéro aléatoire unique pour un type de compteur
     * Exemple : EAU54321, ELEC01234
     */
    private String generateRandomNumero(TypeCompteur type) {
        String prefix = type == TypeCompteur.EAU ? "EAU" : "ELEC";
        Random random = new Random();
        String numeroCompteur;

        // Boucle jusqu'à trouver un numéro unique
        do {
            int randomNumber = random.nextInt(100_000); // 0 à 99999
            numeroCompteur = prefix + String.format("%05d", randomNumber);
        } while (compteurRepo.existsByNumeroCompteur(numeroCompteur));

        return numeroCompteur;
    }
}
