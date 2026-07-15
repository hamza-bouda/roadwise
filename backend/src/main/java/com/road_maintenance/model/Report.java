package com.road_maintenance.model;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.firebase.cloud.FirestoreClient;

public class Report {
    private String id;
    private String description;
    private double latitude;
    private double longitude;
    private String imageUrl;
    private Timestamp reportedAt;
    private String status;
    private DocumentReference detectedBy;
    private DocumentReference maintenance;
    private String maintenanceId; // Added for API compatibility

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Timestamp getReportedAt() {
        return reportedAt;
    }

    public void setReportedAt(Timestamp reportedAt) {
        this.reportedAt = reportedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public DocumentReference getDetectedBy() {
        return detectedBy;
    }

    public void setDetectedBy(DocumentReference detectedBy) {
        this.detectedBy = detectedBy;
    }

    public DocumentReference getMaintenance() {
        return maintenance;
    }

    public void setMaintenance(DocumentReference maintenance) {
        this.maintenance = maintenance;
        this.maintenanceId = maintenance != null ? maintenance.getId() : null;
    }

    public String getMaintenanceId() {
        return maintenanceId;
    }

    public void setMaintenanceId(Object maintenanceId) {
        if (maintenanceId instanceof DocumentReference) {
            this.maintenance = (DocumentReference) maintenanceId;
            this.maintenanceId = ((DocumentReference) maintenanceId).getId();
        } else if (maintenanceId instanceof String) {
            this.maintenanceId = (String) maintenanceId;
            this.maintenance = maintenanceId != null ? FirestoreClient.getFirestore().collection("maintenances").document((String) maintenanceId) : null;
        } else {
            this.maintenanceId = null;
            this.maintenance = null;
        }
    }
}