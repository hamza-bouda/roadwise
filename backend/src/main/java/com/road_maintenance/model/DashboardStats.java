package com.road_maintenance.model;

public class DashboardStats {
    private StatusCount signalementsByStatus;
    private StatusCount maintenancesByStatus;
    private int signalementsThisMonth;
    private int totalSignalements;
    private int maintenancesCompletedThisMonth;

    public static class StatusCount {
        public int validationCount; // 🔥 ajouter ce champ
        public int newCount;
        public int inProgress;
        public int repaired;
        public int scheduled;
        public int completed;

        // Getters & setters
        public int getValidationCount() { return validationCount; }
        public void setValidationCount(int validationCount) { this.validationCount = validationCount; }

        public int getNewCount() { return newCount; }
        public void setNewCount(int newCount) { this.newCount = newCount; }
        public int getInProgress() { return inProgress; }
        public void setInProgress(int inProgress) { this.inProgress = inProgress; }
        public int getRepaired() { return repaired; }
        public void setRepaired(int repaired) { this.repaired = repaired; }
        public int getScheduled() { return scheduled; }
        public void setScheduled(int scheduled) { this.scheduled = scheduled; }
        public int getCompleted() { return completed; }
        public void setCompleted(int completed) { this.completed = completed; }
    }

    // Getters and setters for DashboardStats
    public StatusCount getSignalementsByStatus() { return signalementsByStatus; }
    public void setSignalementsByStatus(StatusCount signalementsByStatus) { this.signalementsByStatus = signalementsByStatus; }
    public StatusCount getMaintenancesByStatus() { return maintenancesByStatus; }
    public void setMaintenancesByStatus(StatusCount maintenancesByStatus) { this.maintenancesByStatus = maintenancesByStatus; }
    public int getSignalementsThisMonth() { return signalementsThisMonth; }
    public void setSignalementsThisMonth(int signalementsThisMonth) { this.signalementsThisMonth = signalementsThisMonth; }
    public int getTotalSignalements() { return totalSignalements; }
    public void setTotalSignalements(int totalSignalements) { this.totalSignalements = totalSignalements; }
    public int getMaintenancesCompletedThisMonth() { return maintenancesCompletedThisMonth; }
    public void setMaintenancesCompletedThisMonth(int maintenancesCompletedThisMonth) { this.maintenancesCompletedThisMonth = maintenancesCompletedThisMonth; }
}