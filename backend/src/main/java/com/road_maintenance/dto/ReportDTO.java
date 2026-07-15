package com.road_maintenance.dto;

import com.google.cloud.Timestamp;
import com.road_maintenance.model.Report;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public class ReportDTO {
    private String id;
    private String description;
    private double latitude;
    private double longitude;
    private String imageUrl;
    private String reportedAt;
    private String status;
    private String detectedByName;
    private String maintenanceId;

    private static final DateTimeFormatter formatter = DateTimeFormatter
            .ISO_INSTANT
            .withZone(ZoneId.of("UTC"));

    public ReportDTO(Report report) {
        this.id = report.getId();
        this.description = report.getDescription();
        this.latitude = report.getLatitude();
        this.longitude = report.getLongitude();
        this.imageUrl = report.getImageUrl();
        this.status = report.getStatus();
        this.maintenanceId = report.getMaintenance() != null ? report.getMaintenance().getId() : null;
        this.reportedAt = report.getReportedAt() != null
                ? formatter.format(Instant.ofEpochSecond(
                report.getReportedAt().getSeconds(),
                report.getReportedAt().getNanos()))
                : null;
        // detectedByName will be set by ReportService
    }

    public ReportDTO() {}

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getReportedAt() { return reportedAt; }
    public void setReportedAt(String reportedAt) { this.reportedAt = reportedAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDetectedByName() { return detectedByName; }
    public void setDetectedByName(String detectedByName) { this.detectedByName = detectedByName; }
    public String getMaintenanceId() { return maintenanceId; }
    public void setMaintenanceId(String maintenanceId) { this.maintenanceId = maintenanceId; }
}