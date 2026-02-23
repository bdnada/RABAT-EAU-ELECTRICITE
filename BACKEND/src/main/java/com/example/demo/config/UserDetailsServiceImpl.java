package com.example.demo.config;

import com.example.demo.repository.AgentTerrainRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepo;
    private final AgentTerrainRepository agentRepo;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepo.findByUsername(username)
                .map(user -> (UserDetails) user)
                .orElseGet(() -> agentRepo.findByEmail(username)
                        .orElseThrow(() -> new UsernameNotFoundException("Utilisateur ou agent non trouvé")));
    }
}