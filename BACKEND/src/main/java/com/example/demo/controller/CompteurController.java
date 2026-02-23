package com.example.demo.controller;

import com.example.demo.dto.CompteurDto;
import com.example.demo.entity.Compteur;
import com.example.demo.service.CompteurService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/compteurs")
@RequiredArgsConstructor
public class CompteurController {

    private final CompteurService service;

    @GetMapping
    public List<Compteur> all() {
        return service.findAll();
    }

    @PostMapping
    public Compteur create(@RequestBody CompteurDto dto) {
        return service.create(dto);
    }

    @GetMapping("/{id}")
    public Compteur get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PutMapping("/{id}")
    public Compteur update(@PathVariable Long id, @RequestBody CompteurDto dto) {
        return service.update(id, dto);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}