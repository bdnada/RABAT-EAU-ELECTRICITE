package com.example.demo.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;


import java.sql.Timestamp;

@Entity

@Table(name = "adresses")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Adresse {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "odoo_adresse_id", unique = true)
    private String odooAdresseId;

    @ManyToOne
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(columnDefinition = "TEXT")
    private String adresseComplete;

    private String quartier;
    private String ville;

    @CreationTimestamp
    private Timestamp createdAt;
}