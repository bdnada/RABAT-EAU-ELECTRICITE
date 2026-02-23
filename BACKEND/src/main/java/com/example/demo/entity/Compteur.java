package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "compteurs")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Compteur {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_compteur", unique = true, length = 9)
    private String numeroCompteur;

    @ManyToOne
    @JoinColumn(name = "adresse_id", nullable = false)
    private Adresse adresse;

    @Enumerated(EnumType.STRING)
    private TypeCompteur type;

    private int indexActuel = 0;

    private Timestamp dateDerniereReleve;

    @CreationTimestamp
    private Timestamp createdAt;
}