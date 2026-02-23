package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.sql.Timestamp;

@Entity
@Table(name = "sync_facturation")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SyncFacturation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "releve_id")
    private Releve releve;

    @Enumerated(EnumType.STRING)
    private StatutSync statut = StatutSync.EN_ATTENTE;

    private Timestamp dateEnvoi;
    private String messageErreur;
}