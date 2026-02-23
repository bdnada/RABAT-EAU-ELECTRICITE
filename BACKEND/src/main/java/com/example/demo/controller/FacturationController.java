package com.example.demo.controller;

import com.example.demo.entity.Releve;
import com.example.demo.repository.ReleveRepository;
import com.example.demo.service.FacturationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/facturation")
@RequiredArgsConstructor
@Slf4j
public class FacturationController {

    private final FacturationService facturationService;
    private final ReleveRepository releveRepository;

    @GetMapping("/test")
    public String test() {
        return "Facturation controller OK • Endpoints : /send/client/{id} • /send/all";
    }

    @GetMapping("/send/client/{odooClientId}")
    public String sendForClient(@PathVariable String odooClientId) {
        try {
            List<Releve> releves = releveRepository.findByClientOdooId(odooClientId);
            if (releves.isEmpty()) {
                return "Aucun relevé pour client Odoo ID : " + odooClientId;
            }

            Map<String, List<Releve>> byAddressMonth = releves.stream()
                    .collect(Collectors.groupingBy(r ->
                            r.getCompteur().getAdresse().getId() + "|" +
                                    r.getDateReleve().toLocalDateTime().toLocalDate().withDayOfMonth(1)
                    ));

            int created = 0;
            for (List<Releve> group : byAddressMonth.values()) {
                facturationService.sendToOdoo(group);
                created++;
            }

            return String.format("Facturation client %s → %d facture(s) traitée(s)", odooClientId, created);
        } catch (Exception e) {
            log.error("Erreur facturation client {}", odooClientId, e);
            return "Erreur : " + e.getMessage();
        }
    }

    @PostMapping("/send/all")
    public String sendAllPending() {
        try {
            List<List<Releve>> groups = facturationService.findAllUnbilledGroups();

            if (groups.isEmpty()) {
                return "Aucune facture en attente (tous les relevés semblent déjà facturés)";
            }

            log.info("Facturation globale démarrée → {} groupes à traiter", groups.size());

            int success = 0;
            for (List<Releve> group : groups) {
                try {
                    facturationService.sendToOdoo(group);
                    success++;
                } catch (Exception e) {
                    Long addrId = group.get(0).getCompteur().getAdresse().getId();
                    log.error("Échec groupe adresse {} : {}", addrId, e.getMessage());
                }
            }

            return String.format("Facturation globale → %d/%d factures créées avec succès", success, groups.size());

        } catch (Exception e) {
            log.error("Erreur critique facturation globale", e);
            return "Erreur grave : " + e.getMessage();
        }
    }
}