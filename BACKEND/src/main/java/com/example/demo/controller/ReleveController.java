package com.example.demo.controller;

import com.example.demo.dto.ReleveDto;
import com.example.demo.dto.ReleveHistoriqueDto;
import com.example.demo.entity.Releve;                     // ← AJOUTÉ ICI
import com.example.demo.service.ReleveService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/releves")
@RequiredArgsConstructor
public class ReleveController {

    private final ReleveService service;

    @GetMapping
    public List<Releve> all() {
        return service.findAll();
    }

    @PostMapping
    public Releve create(@RequestBody ReleveDto dto) {
        return service.create(dto);
    }

    @GetMapping("/{id}")
    public Releve get(@PathVariable Long id) {
        return service.findById(id);
    }

    // ==================== HISTORIQUE ====================

    @GetMapping("/historique")
    public List<ReleveHistoriqueDto> getAllHistorique() {
        return service.getHistoriqueAll();
    }

    @GetMapping("/historique/mois/{moisAnnee}")
    public List<ReleveHistoriqueDto> getHistoriqueByMois(@PathVariable String moisAnnee) {
        return service.getHistoriqueByMois(moisAnnee);
    }

    @GetMapping("/historique/agent/{agentId}")
    public List<ReleveHistoriqueDto> getHistoriqueByAgent(@PathVariable Long agentId) {
        return service.getHistoriqueByAgent(agentId);
    }
}