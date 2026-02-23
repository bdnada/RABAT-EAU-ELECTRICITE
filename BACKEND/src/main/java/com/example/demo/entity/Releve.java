package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "releves")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Releve {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "compteur_id", nullable = false)
    private Compteur compteur;

    @ManyToOne
    @JoinColumn(name = "agent_id", nullable = false)
    private AgentTerrain agent;

    private int ancienIndex;
    private int nouvelIndex;
    private int consommation;
    private Timestamp dateReleve;

    @CreationTimestamp
    private Timestamp createdAt;


}