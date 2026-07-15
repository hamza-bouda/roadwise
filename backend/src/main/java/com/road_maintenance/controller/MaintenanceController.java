package com.road_maintenance.controller;

import com.road_maintenance.dto.MaintenanceDTO;
import com.road_maintenance.dto.ReportDTO;
import com.road_maintenance.service.MaintenanceService;
import com.road_maintenance.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/maintenances")
public class MaintenanceController {

    @Autowired
    ReportService reportService;
    @Autowired
    private MaintenanceService maintenanceService;

    @PostMapping
    public ResponseEntity<MaintenanceDTO> createMaintenance(@RequestBody MaintenanceDTO dto) {
        try {
            MaintenanceDTO maintenance = maintenanceService.createMaintenance(dto);
            if (maintenance.getSignalementId() != null) {
                reportService.updateStatus(maintenance.getSignalementId(), "EN_COURS");
            }
            return ResponseEntity.ok(maintenance);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceDTO> getMaintenance(@PathVariable String id) {
        try {
            MaintenanceDTO maintenance = maintenanceService.getMaintenance(id);
            if (maintenance == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(maintenance);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<MaintenanceDTO>> getAllMaintenances() {
        try {
            List<MaintenanceDTO> maintenances = maintenanceService.getAllMaintenances();
            return ResponseEntity.ok(maintenances);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> updateMaintenanceStatus(@PathVariable String id, @RequestBody Map<String, String> request) {
        if (id == null || id.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "ID requis."));
        }
        String status = request.get("status");
        if (status == null || status.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Statut requis."));
        }
        try {
            maintenanceService.updateMaintenanceStatus(id, status.toUpperCase());
            return ResponseEntity.ok().body(Map.of("message", "Statut mis à jour"));
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la mise à jour: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<MaintenanceDTO> updateMaintenance(@PathVariable String id, @RequestBody MaintenanceDTO dto) {
        if (id == null || id.isEmpty()) {
            return ResponseEntity.badRequest().body(null);
        }
        try {
            MaintenanceDTO updatedMaintenance = maintenanceService.updateMaintenance(id, dto);
            if (updatedMaintenance.getSignalementId() != null) {
                reportService.updateStatus(updatedMaintenance.getSignalementId(), "EN_COURS");
            }
            return ResponseEntity.ok(updatedMaintenance);
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteMaintenance(@PathVariable String id) {
        if (id == null || id.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "ID requis."));
        }
        try {
            maintenanceService.deleteMaintenance(id);
            return ResponseEntity.ok().body(Map.of("message", "Maintenance supprimée"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la suppression: " + e.getMessage()));
        }
    }

    @GetMapping("/signalements/available")
    public ResponseEntity<List<ReportDTO>> getSignalementsWithoutMaintenance() {
        try {
            List<ReportDTO> signalements = maintenanceService.getSignalementsWithoutMaintenance();
            return ResponseEntity.ok(signalements);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/signalements")
    public ResponseEntity<List<ReportDTO>> getAllSignalements() {
        try {
            List<ReportDTO> signalements = maintenanceService.getAllSignalements();
            return ResponseEntity.ok(signalements);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}