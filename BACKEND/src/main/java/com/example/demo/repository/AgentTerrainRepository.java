// 2. AgentTerrainRepository.java
package com.example.demo.repository;

import com.example.demo.entity.AgentTerrain;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AgentTerrainRepository extends JpaRepository<AgentTerrain, Long> {
    Optional<AgentTerrain> findByOdooAgentId(String odooAgentId);
    Optional<AgentTerrain> findByEmail(String email);
    Optional<AgentTerrain> findByTelProfessionnel(String telProfessionnel);
}