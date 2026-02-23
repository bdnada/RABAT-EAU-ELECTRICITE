// src/main/java/com/example/demo/repository/AgentLocationRepository.java
package com.example.demo.repository;

import com.example.demo.entity.AgentLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AgentLocationRepository extends JpaRepository<AgentLocation, Long> {

    Optional<AgentLocation> findTopByAgentIdOrderByLastUpdateDesc(Long agentId);

    @Query("""
            SELECT l FROM AgentLocation l
            WHERE l.lastUpdate = (
                SELECT MAX(l2.lastUpdate)
                FROM AgentLocation l2
                WHERE l2.agent.id = l.agent.id
            )
            """)
    List<AgentLocation> findLatestLocationsForAllAgents();
}