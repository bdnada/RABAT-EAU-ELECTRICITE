package com.example.demo.dto;

import java.time.LocalDateTime;

public record MessageDto(
        Long id,
        String contenu,
        String sender,
        boolean lu,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String imageBase64,      // ✅ BASE64
        String imageContentType // ✅ MIME
) {}
