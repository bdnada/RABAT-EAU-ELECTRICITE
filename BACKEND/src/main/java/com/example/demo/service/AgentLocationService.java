package com.example.demo.service;

import com.example.demo.entity.AgentLocation;
import com.example.demo.entity.AgentTerrain;
import com.example.demo.repository.AgentLocationRepository;
import com.example.demo.repository.AgentTerrainRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service de gestion des positions GPS des agents terrain (version REST uniquement)
 */
@Service
@RequiredArgsConstructor
public class AgentLocationService {

    private static final Logger log = LoggerFactory.getLogger(AgentLocationService.class);

    private final AgentLocationRepository locationRepository;
    private final AgentTerrainRepository agentRepository;

    /**
     * Met à jour ou crée la dernière position connue d'un agent
     */
    @Transactional
    public void updateAgentLocation(Long agentId, double latitude, double longitude) {
        log.debug("Mise à jour position pour agent ID: {}", agentId);

        AgentTerrain agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé avec ID : " + agentId));

        AgentLocation location = locationRepository.findTopByAgentIdOrderByLastUpdateDesc(agentId)
                .map(existing -> {
                    existing.setLatitude(latitude);
                    existing.setLongitude(longitude);
                    existing.setLastUpdate(LocalDateTime.now());
                    log.debug("Mise à jour position existante ID: {}", existing.getId());
                    return existing;
                })
                .orElseGet(() -> {
                    AgentLocation newLoc = AgentLocation.builder()
                            .agent(agent)
                            .latitude(latitude)
                            .longitude(longitude)
                            .lastUpdate(LocalDateTime.now())
                            .build();
                    log.debug("Nouvelle position créée pour agent ID: {}", agentId);
                    return newLoc;
                });

        locationRepository.save(location);
    }

    /**
     * Récupère les dernières positions de TOUS les agents
     */
    public List<AgentLocation> getAllLatestLocations() {
        List<AgentLocation> locations = locationRepository.findLatestLocationsForAllAgents();
        log.debug("Retour de {} positions récentes", locations.size());
        return locations;
    }

    /**
     * Récupère la dernière position d'un agent spécifique
     */
    public AgentLocation getLatestForAgent(Long agentId) {
        return locationRepository.findTopByAgentIdOrderByLastUpdateDesc(agentId)
                .orElse(null);
    }
}