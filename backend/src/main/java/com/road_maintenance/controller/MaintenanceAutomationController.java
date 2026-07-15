package com.road_maintenance.controller;

import com.road_maintenance.service.MaintenanceAutomationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.ExecutionException;

/**
 * Controller pour déclencher l'automatisation des maintenances
 */
@RestController
@RequestMapping("/api/automation")
public class MaintenanceAutomationController {

    private static final Logger logger = LoggerFactory.getLogger(MaintenanceAutomationController.class);

    private final MaintenanceAutomationService automationService;

    public MaintenanceAutomationController(MaintenanceAutomationService automationService) {
        this.automationService = automationService;
    }

    /**
     * Endpoint pour lancer l'automatisation manuellement
     * GET /api/automation/run
     */
    @GetMapping("/run")
    public ResponseEntity<String> runAutomation() {
        try {
            automationService.runAutomation();
            logger.info("Automation manually triggered successfully.");
            return ResponseEntity.ok("Automation executed successfully.");
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Failed to execute automation: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Automation failed: " + e.getMessage());
        }
    }
}
