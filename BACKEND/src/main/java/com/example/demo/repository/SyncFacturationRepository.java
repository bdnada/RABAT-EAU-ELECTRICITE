package com.example.demo.repository;

import com.example.demo.entity.StatutSync;
import com.example.demo.entity.SyncFacturation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SyncFacturationRepository extends JpaRepository<SyncFacturation, Long> {
    List<SyncFacturation> findByStatut(StatutSync statut);
}