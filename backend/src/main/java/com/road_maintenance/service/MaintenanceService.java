package com.road_maintenance.service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.road_maintenance.dto.MaintenanceDTO;
import com.road_maintenance.dto.ReportDTO;
import com.road_maintenance.model.Maintenance;
import com.road_maintenance.model.Report;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Service
public class MaintenanceService {

    private static final String COLLECTION_NAME = "maintenances";
    private static final String REPORTS_COLLECTION = "reports";
    private static final Logger logger = LoggerFactory.getLogger(MaintenanceService.class);

    private MaintenanceDTO toDTO(Maintenance maintenance) throws ExecutionException, InterruptedException {
        MaintenanceDTO dto = new MaintenanceDTO();
        dto.setId(maintenance.getId());
        dto.setTitle(maintenance.getTitle());
        dto.setPlannedDate(maintenance.getPlannedDate());
        dto.setType(maintenance.getType());
        dto.setEstimatedDurationHours(maintenance.getEstimatedDurationHours());
        dto.setStatus(maintenance.getStatus());
        dto.setCreatedAt(maintenance.getCreatedAt());

        if (maintenance.getTeam() != null) {
            DocumentSnapshot teamDoc = maintenance.getTeam().get().get();
            MaintenanceDTO.TeamDetails teamDetails = new MaintenanceDTO.TeamDetails();
            teamDetails.setName(teamDoc.getString("name") != null ? teamDoc.getString("name") : "Inconnu");
            dto.setTeamDetails(teamDetails);
            dto.setTeamId(maintenance.getTeam().getId());
        }

        if (maintenance.getSignalement() != null) {
            dto.setSignalementId(maintenance.getSignalement().getId());
        }

        return dto;
    }

    private ReportDTO toReportDTO(Report report) throws ExecutionException, InterruptedException {
        ReportDTO dto = new ReportDTO();
        dto.setId(report.getId());
        dto.setDescription(report.getDescription());
        dto.setLatitude(report.getLatitude());
        dto.setLongitude(report.getLongitude());
        dto.setImageUrl(report.getImageUrl());
        dto.setStatus(report.getStatus());

        if (report.getReportedAt() != null) {
            Instant reportedAt = Instant.ofEpochSecond(report.getReportedAt().getSeconds(), report.getReportedAt().getNanos());
            dto.setReportedAt(DateTimeFormatter.ISO_INSTANT.format(reportedAt));
        }

        dto.setMaintenanceId(report.getMaintenance() != null ? report.getMaintenance().getId() : null);

        if (report.getDetectedBy() != null) {
            DocumentSnapshot userDoc = report.getDetectedBy().get().get();
            dto.setDetectedByName(userDoc.getString("name") != null ? userDoc.getString("name") : "Inconnu");
        } else {
            dto.setDetectedByName("Inconnu");
        }

        return dto;
    }

    public MaintenanceDTO createMaintenance(MaintenanceDTO inputDTO) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();

        DocumentReference teamRef = null;
        if (inputDTO.getTeamId() != null) {
            teamRef = db.collection("teams").document(inputDTO.getTeamId());
            if (!teamRef.get().get().exists()) {
                throw new IllegalArgumentException("Team ID " + inputDTO.getTeamId() + " does not exist.");
            }
        }

        DocumentReference signalementRef = null;
        if (inputDTO.getSignalementId() != null) {
            signalementRef = db.collection(REPORTS_COLLECTION).document(inputDTO.getSignalementId());
            DocumentSnapshot signalementDoc = signalementRef.get().get();
            if (!signalementDoc.exists()) {
                throw new IllegalArgumentException("Signalement ID " + inputDTO.getSignalementId() + " does not exist.");
            }
            if (signalementDoc.get("maintenance", DocumentReference.class) != null) {
                throw new IllegalStateException("Signalement " + inputDTO.getSignalementId() + " already has a maintenance.");
            }
        }

        Maintenance maintenance = new Maintenance();
        maintenance.setTitle(inputDTO.getTitle());
        maintenance.setPlannedDate(inputDTO.getPlannedDate());
        maintenance.setType(inputDTO.getType());
        maintenance.setEstimatedDurationHours(inputDTO.getEstimatedDurationHours());
        String status = inputDTO.getStatus();
        if (status == null || status.isEmpty()) {
            status = "PENDING";
        } else if (!status.equals("PLANIFIE") && !status.equals("TERMINE") && !status.equals("PENDING")) {
            throw new IllegalArgumentException("Statut invalide: " + status);
        }
        maintenance.setStatus(status);

        maintenance.setTeam(teamRef);
        maintenance.setSignalement(signalementRef);
        maintenance.setCreatedAt(Instant.now());

        DocumentReference docRef = db.collection(COLLECTION_NAME).document();
        maintenance.setId(docRef.getId());

        Timestamp plannedDateTimestamp = maintenance.getPlannedDate() != null
                ? Timestamp.ofTimeSecondsAndNanos(maintenance.getPlannedDate().getEpochSecond(), maintenance.getPlannedDate().getNano())
                : null;

        Timestamp createdAtTimestamp = Timestamp.ofTimeSecondsAndNanos(maintenance.getCreatedAt().getEpochSecond(), maintenance.getCreatedAt().getNano());

        Map<String, Object> maintenanceData = new HashMap<>();
        maintenanceData.put("id", maintenance.getId());
        maintenanceData.put("title", maintenance.getTitle());
        maintenanceData.put("plannedDate", plannedDateTimestamp);
        maintenanceData.put("type", maintenance.getType());
        maintenanceData.put("estimatedDurationHours", maintenance.getEstimatedDurationHours());
        maintenanceData.put("status", maintenance.getStatus());
        maintenanceData.put("team", maintenance.getTeam());
        maintenanceData.put("signalement", maintenance.getSignalement());
        maintenanceData.put("createdAt", createdAtTimestamp);

        docRef.set(maintenanceData).get();

        // Update signalement status based on maintenance status
        if (signalementRef != null) {
            String signalementStatus;
            switch (status) {
                case "TERMINE":
                    signalementStatus = "REPARE";
                    break;
                case "PLANIFIE":
                    signalementStatus = "EN_COURS";
                    break;
                case "PENDING":
                    signalementStatus = "EN_VALIDATION"; // prototype change
                    break;
                default:
                    signalementStatus = "EN_VALIDATION";
            }
            signalementRef.update(
                    Map.of(
                            "maintenance", docRef,
                            "status", signalementStatus
                    )
            ).get();
            logger.info("Updated signalement status to {} for new maintenance ID {}", signalementStatus, docRef.getId());
        }

        return toDTO(maintenance);
    }
    public void deleteMaintenance(String id) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document(id);

        db.runTransaction(transaction -> {
            // Fetch the maintenance document
            DocumentSnapshot doc = transaction.get(docRef).get();
            if (!doc.exists()) {
                throw new IllegalArgumentException("Maintenance avec l'ID " + id + " n'existe pas.");
            }

            // Get linked signalement, if any
            DocumentReference signalementRef = doc.get("signalement", DocumentReference.class);

            // Delete the maintenance document
            transaction.delete(docRef);
            logger.info("Maintenance with ID {} scheduled for deletion.", id);

            // Only update the signalement if it exists
            if (signalementRef != null) {
                Map<String, Object> updateMap = new HashMap<>();
                updateMap.put("maintenance", null);
                updateMap.put("status", "NOUVEAU");

                transaction.update(signalementRef, updateMap);
                logger.info("Signalement {} reset to NOUVEAU in transaction.", signalementRef.getId());
            }

            return null;
        }).get();
    }




    public MaintenanceDTO getMaintenance(String id) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document(id);
        DocumentSnapshot doc = docRef.get().get();

        if (!doc.exists()) {
            throw new IllegalArgumentException("Maintenance avec l'ID " + id + " n'existe pas.");
        }

        Maintenance maintenance = new Maintenance();
        maintenance.setId(doc.getString("id"));
        maintenance.setTitle(doc.getString("title"));
        maintenance.setType(doc.getString("type"));
        maintenance.setEstimatedDurationHours(doc.getLong("estimatedDurationHours").intValue());
        maintenance.setStatus(doc.getString("status"));
        maintenance.setTeam(doc.get("team", DocumentReference.class));
        maintenance.setSignalement(doc.get("signalement", DocumentReference.class));

        Timestamp plannedDateTs = doc.getTimestamp("plannedDate");
        if (plannedDateTs != null) {
            maintenance.setPlannedDate(Instant.ofEpochSecond(plannedDateTs.getSeconds(), plannedDateTs.getNanos()));
        }

        Timestamp createdAtTs = doc.getTimestamp("createdAt");
        if (createdAtTs != null) {
            maintenance.setCreatedAt(Instant.ofEpochSecond(createdAtTs.getSeconds(), createdAtTs.getNanos()));
        }

        return toDTO(maintenance);
    }
    public MaintenanceDTO updateMaintenance(String id, MaintenanceDTO inputDTO) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document(id);
        DocumentSnapshot doc = docRef.get().get();

        if (!doc.exists()) {
            logger.error("Maintenance with ID {} does not exist.", id);
            throw new IllegalArgumentException("Maintenance avec l'ID " + id + " n'existe pas.");
        }

        DocumentReference teamRef = null;
        if (inputDTO.getTeamId() != null) {
            teamRef = db.collection("teams").document(inputDTO.getTeamId());
            if (!teamRef.get().get().exists()) {
                throw new IllegalArgumentException("Team ID " + inputDTO.getTeamId() + " does not exist.");
            }
        }

        DocumentReference newSignalementRef = null;
        DocumentReference oldSignalementRef = doc.get("signalement", DocumentReference.class);
        if (inputDTO.getSignalementId() != null) {
            newSignalementRef = db.collection(REPORTS_COLLECTION).document(inputDTO.getSignalementId());
            DocumentSnapshot signalementDoc = newSignalementRef.get().get();
            if (!signalementDoc.exists()) {
                throw new IllegalArgumentException("Signalement ID " + inputDTO.getSignalementId() + " does not exist.");
            }
            if (signalementDoc.get("maintenance", DocumentReference.class) != null &&
                    !signalementDoc.get("maintenance", DocumentReference.class).getId().equals(id)) {
                throw new IllegalStateException("Signalement " + inputDTO.getSignalementId() + " is already assigned to another maintenance.");
            }
        }

        Maintenance maintenance = new Maintenance();
        maintenance.setId(id);
        maintenance.setTitle(inputDTO.getTitle());
        maintenance.setPlannedDate(inputDTO.getPlannedDate());
        maintenance.setType(inputDTO.getType());
        maintenance.setEstimatedDurationHours(inputDTO.getEstimatedDurationHours());
        String status = inputDTO.getStatus();
        if (!status.equals("PLANIFIE") && !status.equals("TERMINE") && !status.equals("PENDING")) {
            throw new IllegalArgumentException("Statut invalide: " + status);
        }
        maintenance.setStatus(status);
        maintenance.setTeam(teamRef);
        maintenance.setSignalement(newSignalementRef);
        maintenance.setCreatedAt(doc.getTimestamp("createdAt") != null
                ? Instant.ofEpochSecond(doc.getTimestamp("createdAt").getSeconds(), doc.getTimestamp("createdAt").getNanos())
                : Instant.now());

        Timestamp plannedDateTimestamp = maintenance.getPlannedDate() != null
                ? Timestamp.ofTimeSecondsAndNanos(maintenance.getPlannedDate().getEpochSecond(), maintenance.getPlannedDate().getNano())
                : null;

        Map<String, Object> maintenanceData = new HashMap<>();
        maintenanceData.put("id", maintenance.getId());
        maintenanceData.put("title", maintenance.getTitle());
        maintenanceData.put("plannedDate", plannedDateTimestamp);
        maintenanceData.put("type", maintenance.getType());
        maintenanceData.put("estimatedDurationHours", maintenance.getEstimatedDurationHours());
        maintenanceData.put("status", maintenance.getStatus());
        maintenanceData.put("team", maintenance.getTeam());
        maintenanceData.put("signalement", maintenance.getSignalement());
        maintenanceData.put("createdAt", doc.getTimestamp("createdAt"));

        docRef.set(maintenanceData).get();

        // Update signalement references based on status
        if (newSignalementRef != null) {
            String signalementStatus;
            switch (status) {
                case "TERMINE":
                    signalementStatus = "REPARE";
                    break;
                case "PLANIFIE":
                    signalementStatus = "EN_COURS";
                    break;
                case "PENDING":
                    signalementStatus = "EN_VALIDATION"; // prototype change
                    break;
                default:
                    signalementStatus = "EN_VALIDATION";
            }

            if (oldSignalementRef == null || !newSignalementRef.getId().equals(oldSignalementRef.getId())) {
                newSignalementRef.update(
                        Map.of(
                                "maintenance", docRef,
                                "status", signalementStatus
                        )
                ).get();
                logger.info("Updated signalement status to {} for maintenance ID {}", signalementStatus, id);

                if (oldSignalementRef != null && !oldSignalementRef.getId().equals(newSignalementRef.getId())) {
                    oldSignalementRef.update(
                            Map.of(
                                    "maintenance", null,
                                    "status", "NOUVEAU"
                            )
                    ).get();
                    logger.info("Reset old signalement {} to NOUVEAU", oldSignalementRef.getId());
                }
            } else {
                newSignalementRef.update("status", signalementStatus).get();
                logger.info("Updated signalement status to {} for maintenance ID {}", signalementStatus, id);
            }
        }

        return toDTO(maintenance);
    }

    public void updateMaintenanceStatus(String id, String status) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document(id);
        DocumentSnapshot doc = docRef.get().get();

        if (!doc.exists()) {
            logger.error("Maintenance with ID {} does not exist.", id);
            throw new IllegalArgumentException("Maintenance avec l'ID " + id + " n'existe pas.");
        }

        if (!status.equals("PLANIFIE") && !status.equals("TERMINE") && !status.equals("PENDING")) {
            logger.error("Invalid status: {}", status);
            throw new IllegalArgumentException("Statut invalide: " + status);
        }

        try {
            // Update maintenance status
            docRef.update("status", status).get();
            logger.info("Updated status for maintenance ID {} to {}", id, status);

            DocumentReference signalementRef = doc.get("signalement", DocumentReference.class);
            if (signalementRef != null) {
                String signalementStatus;
                switch (status) {
                    case "TERMINE":
                        signalementStatus = "REPARE";
                        break;
                    case "PLANIFIE":
                        signalementStatus = "EN_COURS";
                        break;
                    case "PENDING":
                        signalementStatus = "EN_VALIDATION";
                        break;
                    default:
                        signalementStatus = "EN_VALIDATION";                }

                // Update signalement status
                signalementRef.update("status", signalementStatus).get();
                logger.info("Updated signalement status to {} for maintenance ID {}", signalementStatus, id);
            }
        } catch (Exception e) {
            logger.error("Failed to update status for maintenance ID {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to update maintenance status: " + e.getMessage(), e);
        }
    }


    public List<MaintenanceDTO> getAllMaintenances() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        List<QueryDocumentSnapshot> documents = db.collection(COLLECTION_NAME).get().get().getDocuments();
        List<MaintenanceDTO> maintenances = new ArrayList<>();

        for (QueryDocumentSnapshot doc : documents) {
            Maintenance maintenance = new Maintenance();
            maintenance.setId(doc.getString("id"));
            maintenance.setTitle(doc.getString("title"));
            maintenance.setType(doc.getString("type"));
            maintenance.setEstimatedDurationHours(doc.getLong("estimatedDurationHours").intValue());
            maintenance.setStatus(doc.getString("status"));
            maintenance.setTeam(doc.get("team", DocumentReference.class));
            maintenance.setSignalement(doc.get("signalement", DocumentReference.class));

            Timestamp plannedDateTs = doc.getTimestamp("plannedDate");
            if (plannedDateTs != null) {
                maintenance.setPlannedDate(Instant.ofEpochSecond(plannedDateTs.getSeconds(), plannedDateTs.getNanos()));
            }

            Timestamp createdAtTs = doc.getTimestamp("createdAt");
            if (createdAtTs != null) {
                maintenance.setCreatedAt(Instant.ofEpochSecond(createdAtTs.getSeconds(), createdAtTs.getNanos()));
            }

            maintenances.add(toDTO(maintenance));
        }

        return maintenances;
    }

    public List<ReportDTO> getSignalementsWithoutMaintenance() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        List<QueryDocumentSnapshot> documents = db.collection(REPORTS_COLLECTION)
                .whereEqualTo("maintenance", null)
                .get()
                .get()
                .getDocuments();
        List<ReportDTO> reports = new ArrayList<>();

        for (QueryDocumentSnapshot doc : documents) {
            Report report = new Report();
            report.setId(doc.getString("id"));
            report.setDescription(doc.getString("description"));
            report.setLatitude(doc.getDouble("latitude"));
            report.setLongitude(doc.getDouble("longitude"));
            report.setImageUrl(doc.getString("imageUrl"));
            report.setStatus(doc.getString("status"));
            report.setReportedAt(doc.getTimestamp("reportedAt"));
            report.setDetectedBy(doc.get("detectedBy", DocumentReference.class));
            report.setMaintenance(null);
            report.setMaintenanceId(null);

            reports.add(toReportDTO(report));
        }

        return reports;
    }

    public List<ReportDTO> getAllSignalements() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        List<QueryDocumentSnapshot> documents = db.collection(REPORTS_COLLECTION).get().get().getDocuments();
        List<ReportDTO> reports = new ArrayList<>();

        for (QueryDocumentSnapshot doc : documents) {
            Report report = new Report();
            report.setId(doc.getString("id"));
            report.setDescription(doc.getString("description"));
            report.setLatitude(doc.getDouble("latitude"));
            report.setLongitude(doc.getDouble("longitude"));
            report.setImageUrl(doc.getString("imageUrl"));
            report.setStatus(doc.getString("status"));
            report.setReportedAt(doc.getTimestamp("reportedAt"));
            report.setDetectedBy(doc.get("detectedBy", DocumentReference.class));
            report.setMaintenance(doc.get("maintenance", DocumentReference.class));
            report.setMaintenanceId(report.getMaintenance() != null ? report.getMaintenance().getId() : null);

            reports.add(toReportDTO(report));
        }

        return reports;
    }
}