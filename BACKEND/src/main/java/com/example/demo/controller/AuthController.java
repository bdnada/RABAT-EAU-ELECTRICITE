package com.example.demo.controller;

import com.example.demo.config.JwtService;
import com.example.demo.dto.AuthRequest;
import com.example.demo.dto.AuthResponse;
import com.example.demo.dto.UserDto;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor

public class AuthController {

    private final UserRepository repo;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;
    private final AuthenticationManager authManager;

    @PostMapping("/login")
    public AuthResponse login(@RequestBody AuthRequest req) {
        String loginInput = req.username(); // peut être username ou email

        User user = repo.findByUsername(loginInput)
                .or(() -> repo.findByEmail(loginInput))
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));

        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        user.getUsername(),
                        req.password()
                )
        );

        return new AuthResponse(jwtService.generateToken(user));
    }

    @PostMapping("/signup")
    public AuthResponse signup(@RequestBody UserDto dto) {
        if (dto.role() == Role.SUPERADMIN && repo.existsByRole(Role.SUPERADMIN)) {
            throw new RuntimeException("Un seul SUPERADMIN autorisé");
        }
        User user = User.builder()
                .nom(dto.nom())
                .prenom(dto.prenom())
                .email(dto.email())
                .telephone(dto.telephone())
                .username(dto.username())
                .password(encoder.encode(dto.password()))
                .role(dto.role())
                .build();
        repo.save(user);
        return new AuthResponse(jwtService.generateToken(user));
    }
}