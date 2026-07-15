package com.road_maintenance.service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.road_maintenance.dto.MaintenanceDTO;
import com.road_maintenance.model.Team;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class MaintenanceAutomationService {

    private static final Logger logger = LoggerFactory.getLogger(MaintenanceAutomationService.class);
    private static final String REPORTS_COLLECTION = "reports";
    private static final String USERS_COLLECTION = "users";
    private static final String MAINTENANCES_COLLECTION = "maintenances";
    private static final int MAX_MAINTENANCES_PER_DAY = 3;

    private final MaintenanceService maintenanceService;
    private final TeamService teamService;

    public MaintenanceAutomationService(MaintenanceService maintenanceService, TeamService teamService) {
        this.maintenanceService = maintenanceService;
        this.teamService = teamService;
    }

    @Scheduled(cron = "0 0 2 * * *") // chaque jour à 2h du matin
    public void runAutomation() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();

        // 1️⃣ Reset des maintenances PENDING > 48h
        resetPendingMaintenances(db);

        // 2️⃣ Récupérer tous les signalements NOUVEAU
        List<QueryDocumentSnapshot> allReports = db.collection(REPORTS_COLLECTION)
                .get()
                .get()
                .getDocuments();

        List<QueryDocumentSnapshot> newReports = allReports.stream()
                .filter(doc -> {
                    String s = doc.getString("status");
                    return s != null && s.trim().equalsIgnoreCase("NOUVEAU");
                })
                .sorted(Comparator.comparing(doc -> {
                    Date reportedAt = doc.getDate("reportedAt");
                    return reportedAt != null ? reportedAt : new Date(0);
                }))
                .collect(Collectors.toList());

        logger.info("Automation: {} signalements NOUVEAU à traiter.", newReports.size());
        if (newReports.isEmpty()) return;

        List<Team> teams = teamService.getAllTeams();

        Map<String, Map<LocalDate, Long>> localAssignments = new HashMap<>();
        Map<String, Integer> counterMap = new HashMap<>();

        // 3️⃣ Boucle pour assigner les maintenances
        for (DocumentSnapshot reportDoc : newReports) {
            try {
                String reportId = reportDoc.getId();

                Map.Entry<LocalDate, Team> slot = findAvailableSlot(db, teams, localAssignments);
                if (slot == null) {
                    logger.warn("Pas de slot disponible pour signalement {}", reportId);
                    continue;
                }

                LocalDate assignedDate = slot.getKey();
                Team assignedTeam = slot.getValue();

                MaintenanceDTO dto = new MaintenanceDTO();

                // --- Extract detectedByName from user document ---
                String detectedByName = "AUTO";
                Object detectedByObj = reportDoc.get("detectedBy");

                if (detectedByObj instanceof DocumentReference ref) {
                    DocumentSnapshot userSnap = ref.get().get();
                    if (userSnap.exists()) {
                        detectedByName = Optional.ofNullable(userSnap.getString("name"))
                                .filter(s -> !s.isBlank())
                                .orElse("AUTO");
                    }
                } else if (detectedByObj instanceof String uid) {
                    DocumentSnapshot userSnap = db.collection(USERS_COLLECTION).document(uid).get().get();
                    if (userSnap.exists()) {
                        detectedByName = Optional.ofNullable(userSnap.getString("name"))
                                .filter(s -> !s.isBlank())
                                .orElse("AUTO");
                    }
                }

                // --- Date string (yyyyMMdd) ---
                String dateStr = Optional.ofNullable(reportDoc.getDate("reportedAt"))
                        .map(d -> d.toInstant().atZone(ZoneId.systemDefault())
                                .toLocalDate().toString().replace("-", ""))
                        .orElse(LocalDate.now().toString().replace("-", ""));

                // --- Generate key (detectedByName.date) ---
                String key = detectedByName + "." + dateStr;

                // --- Increment index ---
                int index = counterMap.getOrDefault(key, 0) + 1;
                counterMap.put(key, index);

                // --- Final title ---
                String title = key + "-" + index;

                dto.setTitle(title);
                dto.setSignalementId(reportId);
                dto.setStatus("PENDING");
                dto.setTeamId(assignedTeam.getId());
                dto.setPlannedDate(Date.from(assignedDate.atStartOfDay(ZoneId.systemDefault()).toInstant()).toInstant());

                maintenanceService.createMaintenance(dto);

                // Update report status
                db.collection(REPORTS_COLLECTION).document(reportId).update("status", "EN_VALIDATION");

                // Track assignment locally
                localAssignments
                        .computeIfAbsent(assignedTeam.getId(), k -> new HashMap<>())
                        .merge(assignedDate, 1L, Long::sum);

                logger.info("Maintenance créée pour signalement {} avec l’équipe {} le {} (title={})",
                        reportId, assignedTeam.getName(), assignedDate, title);

            } catch (Exception e) {
                logger.error("Erreur assignation signalement {}: {}", reportDoc.getId(), e.getMessage(), e);
            }
        }
    }

    private List<String> resetPendingMaintenances(Firestore db) throws ExecutionException, InterruptedException {
        List<QueryDocumentSnapshot> pendingMaintenances = db.collection(MAINTENANCES_COLLECTION)
                .whereEqualTo("status", "PENDING")
                .get()
                .get()
                .getDocuments();

        Instant now = Instant.now();
        List<String> resetSignalements = new ArrayList<>();

        for (DocumentSnapshot maintenanceDoc : pendingMaintenances) {
            Timestamp createdAt = maintenanceDoc.getTimestamp("createdAt");
            if (createdAt == null) continue;

            Instant createdInstant = createdAt.toDate().toInstant();
            if (createdInstant.plusSeconds(48 * 3600).isBefore(now)) {
                String signalementId = maintenanceDoc.getString("signalementId");

                db.collection(MAINTENANCES_COLLECTION).document(maintenanceDoc.getId()).delete();
                logger.info("Maintenance {} expirée -> supprimée", maintenanceDoc.getId());

                if (signalementId != null) {
                    db.collection(REPORTS_COLLECTION).document(signalementId).update("status", "NOUVEAU");
                    resetSignalements.add(signalementId);
                    logger.info("Signalement {} remis à NOUVEAU", signalementId);
                }
            }
        }
        return resetSignalements;
    }

    private Map.Entry<LocalDate, Team> findAvailableSlot(
            Firestore db,
            List<Team> teams,
            Map<String, Map<LocalDate, Long>> localAssignments
    ) throws ExecutionException, InterruptedException {
        LocalDate today = LocalDate.now();

        for (int day = 0; day < 30; day++) {
            LocalDate candidateDate = today.plusDays(day);
            Instant startOfDay = candidateDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
            Instant endOfDay = candidateDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

            Map<String, Long> counts = new HashMap<>();

            for (Team team : teams) {
                long existing = db.collection(MAINTENANCES_COLLECTION)
                        .whereEqualTo("teamId", team.getId())
                        .whereGreaterThanOrEqualTo("plannedDate", Date.from(startOfDay))
                        .whereLessThan("plannedDate", Date.from(endOfDay))
                        .get()
                        .get()
                        .getDocuments()
                        .size();

                long local = localAssignments
                        .getOrDefault(team.getId(), Collections.emptyMap())
                        .getOrDefault(candidateDate, 0L);

                counts.put(team.getId(), existing + local);
            }

            Optional<Team> leastBusy = teams.stream()
                    .filter(t -> counts.getOrDefault(t.getId(), 0L) < MAX_MAINTENANCES_PER_DAY)
                    .min(Comparator.comparing(t -> counts.getOrDefault(t.getId(), 0L)));

            if (leastBusy.isPresent()) {
                return new AbstractMap.SimpleEntry<>(candidateDate, leastBusy.get());
            }
        }
        return null;
    }
}
