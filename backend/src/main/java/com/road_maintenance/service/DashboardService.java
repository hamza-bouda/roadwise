package com.road_maintenance.service;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.road_maintenance.model.DashboardStats;
import com.road_maintenance.model.DashboardStats.StatusCount;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ExecutionException;

@Service
public class DashboardService {

    public DashboardStats getDashboardStats() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();

        // Get current month boundaries in UTC+1 (Europe/Paris)
        Instant now = Instant.now();
        ZonedDateTime zonedNow = now.atZone(ZoneId.of("Europe/Paris"));
        Instant startOfMonth = zonedNow.withDayOfMonth(1)
                .truncatedTo(ChronoUnit.DAYS)
                .toInstant();
        Instant endOfMonth = zonedNow.plusMonths(1)
                .withDayOfMonth(1)
                .truncatedTo(ChronoUnit.DAYS)
                .toInstant();

        // --- Signalement stats ---
        StatusCount signalementsByStatus = new StatusCount();
        signalementsByStatus.setValidationCount(0);
        signalementsByStatus.setNewCount(0);
        signalementsByStatus.setInProgress(0);
        signalementsByStatus.setRepaired(0);

        int signalementsThisMonth = 0;
        int totalSignalements = 0;

        for (QueryDocumentSnapshot doc : db.collection("reports").get().get().getDocuments()) {
            totalSignalements++;
            String status = doc.getString("status");
            if (status != null) {
                switch (status) {
                    case "EN_VALIDATION":
                        signalementsByStatus.setValidationCount(signalementsByStatus.getValidationCount() + 1);
                        break;
                    case "NOUVEAU":
                        signalementsByStatus.setNewCount(signalementsByStatus.getNewCount() + 1);
                        break;
                    case "EN_COURS":
                        signalementsByStatus.setInProgress(signalementsByStatus.getInProgress() + 1);
                        break;
                    case "REPARE":
                        signalementsByStatus.setRepaired(signalementsByStatus.getRepaired() + 1);
                        break;
                }
            }
            Instant reportedAt = doc.getTimestamp("reportedAt") != null
                    ? Instant.ofEpochSecond(doc.getTimestamp("reportedAt").getSeconds(), doc.getTimestamp("reportedAt").getNanos())
                    : null;
            if (reportedAt != null && !reportedAt.isBefore(startOfMonth) && reportedAt.isBefore(endOfMonth)) {
                signalementsThisMonth++;
            }
        }

        // --- Maintenance stats ---
        StatusCount maintenancesByStatus = new StatusCount();
        maintenancesByStatus.setInProgress(0);
        maintenancesByStatus.setScheduled(0);
        maintenancesByStatus.setCompleted(0);
        maintenancesByStatus.setValidationCount(0); // réutilisé pour PENDING

        int maintenancesCompletedThisMonth = 0;

        for (QueryDocumentSnapshot doc : db.collection("maintenances").get().get().getDocuments()) {
            String status = doc.getString("status");
            if (status != null) {
                switch (status) {
                    case "PLANIFIE": // considéré en cours
                        maintenancesByStatus.setInProgress(maintenancesByStatus.getInProgress() + 1);
                        break;
                    case "PENDING": // attente validation
                        maintenancesByStatus.setValidationCount(maintenancesByStatus.getValidationCount() + 1);
                        break;
                    case "TERMINE":
                        maintenancesByStatus.setCompleted(maintenancesByStatus.getCompleted() + 1);
                        Instant createdAt = doc.getTimestamp("createdAt") != null
                                ? Instant.ofEpochSecond(doc.getTimestamp("createdAt").getSeconds(), doc.getTimestamp("createdAt").getNanos())
                                : null;
                        if (createdAt != null && !createdAt.isBefore(startOfMonth) && createdAt.isBefore(endOfMonth)) {
                            maintenancesCompletedThisMonth++;
                        }
                        break;
                }
            }
        }

        DashboardStats stats = new DashboardStats();
        stats.setSignalementsByStatus(signalementsByStatus);
        stats.setMaintenancesByStatus(maintenancesByStatus);
        stats.setSignalementsThisMonth(signalementsThisMonth);
        stats.setTotalSignalements(totalSignalements);
        stats.setMaintenancesCompletedThisMonth(maintenancesCompletedThisMonth);

        return stats;
    }
}
