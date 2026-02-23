package com.example.demo.dto;

public record PinLoginRequest(
        String phoneNumber,   // on attend le numéro professionnel ici
        String pin
) {}
