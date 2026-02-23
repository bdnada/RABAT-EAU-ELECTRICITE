package com.example.demo.dto;

import com.example.demo.entity.Role;

public record UserDto(
        String nom,
        String prenom,
        String email,
        String telephone,
        String username,
        String password,
        Role role
) {}