package com.road_maintenance.model;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.google.cloud.firestore.DocumentReference;
import com.road_maintenance.model.DocumentReferenceSerializer;
import java.time.Instant;

public class Maintenance {
    private String id;
    private String title;
    private Instant plannedDate;
    private String type;
    private int estimatedDurationHours;
    private String status;
    @JsonSerialize(using = DocumentReferenceSerializer.class)
    private DocumentReference team;
    @JsonSerialize(using = DocumentReferenceSerializer.class)
    private DocumentReference signalement;
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

    public DocumentReference getTeam() {
        return team;
    }

    public void setTeam(DocumentReference team) {
        this.team = team;
    }

    public DocumentReference getSignalement() {
        return signalement;
    }

    public void setSignalement(DocumentReference signalement) {
        this.signalement = signalement;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}