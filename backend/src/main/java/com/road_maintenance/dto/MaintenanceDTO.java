package com.road_maintenance.dto;

import java.time.Instant;

public class MaintenanceDTO {
    private String id;
    private String title;
    private Instant plannedDate;
    private String type;
    private int estimatedDurationHours;
    private String status;
    private TeamDetails teamDetails;
    private String teamId; // Added for team reference ID
    private String signalementId;
    private Instant createdAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Instant getPlannedDate() {
        return plannedDate;
    }

    public void setPlannedDate(Instant plannedDate) {
        this.plannedDate = plannedDate;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public int getEstimatedDurationHours() {
        return estimatedDurationHours;
    }

    public void setEstimatedDurationHours(int estimatedDurationHours) {
        this.estimatedDurationHours = estimatedDurationHours;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public TeamDetails getTeamDetails() {
        return teamDetails;
    }

    public void setTeamDetails(TeamDetails teamDetails) {
        this.teamDetails = teamDetails;
    }

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }

    public String getSignalementId() {
        return signalementId;
    }

    public void setSignalementId(String signalementId) {
        this.signalementId = signalementId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public static class TeamDetails {
        private String name;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }
}
