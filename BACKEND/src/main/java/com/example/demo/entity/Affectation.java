package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "affectations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Affectation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "agent_id", nullable = false)
    private AgentTerrain agent;

    @ManyToOne
    @JoinColumn(name = "adresse_id", nullable = false)
    private Adresse adresse;

    @CreationTimestamp
    private Timestamp dateAffectation;
}