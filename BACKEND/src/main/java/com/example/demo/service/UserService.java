package com.example.demo.service;

import com.example.demo.dto.UserDto;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repository;
    private final PasswordEncoder encoder;

    public List<User> findAll() {
        return repository.findAll();
    }

    public User create(UserDto dto) {
        User user = User.builder()
                .nom(dto.nom())
                .prenom(dto.prenom())
                .email(dto.email())
                .telephone(dto.telephone())
                .username(dto.username())
                .password(encoder.encode(dto.password()))
                .role(dto.role())
                .build();
        return repository.save(user);
    }

    public User update(Long id, UserDto dto) {
        User user = repository.findById(id).orElseThrow();
        user.setNom(dto.nom());
        user.setPrenom(dto.prenom());
        user.setEmail(dto.email());
        user.setTelephone(dto.telephone());
        user.setUsername(dto.username());
        if (dto.password() != null && !dto.password().isBlank()) {
            user.setPassword(encoder.encode(dto.password()));
        }
        user.setRole(dto.role());
        return repository.save(user);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}