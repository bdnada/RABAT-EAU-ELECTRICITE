// src/main/java/com/example/demo/dto/SignatureRequestDto.java
package com.example.demo.dto;

import lombok.Data;

@Data
public class SignatureRequestDto {
    private String email;
    private String signature; // base64 (data:image/png;base64,...)
}
