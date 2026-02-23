package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "adresse_factures", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"adresse_id", "mois"}) // Une seule facture par adresse/mois
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdresseFacture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "adresse_id", nullable = false)
    private Adresse adresse;

    @Column(nullable = false)
    private String clientOdooId;

    @Column(nullable = false)
    private LocalDate mois; // ex: 2025-12-01 (premier jour du mois)

    private Integer factureOdooId; // ID de la facture dans Odoo

    @Column(unique = true, length = 50)
    private String factureUniqueId; // Notre ID unique pour le PDF

    private String pdfPath; // ex: factures/facture_ABC123.pdf

    private LocalDate dateCreation = LocalDate.now();

    public enum FactureStatus {
        PENDING, SIGNED, SENT
    }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FactureStatus status = FactureStatus.PENDING;
}