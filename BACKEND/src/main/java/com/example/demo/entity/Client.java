package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "clients")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Client {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "odoo_client_id", unique = true, nullable = false)
    private String odooClientId;

    private String nom;
    private String prenom;
    private String telephone;

    @Column(name = "email")
    private String email;

    // Getter et setter
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    @CreationTimestamp
    private Timestamp createdAt;
}