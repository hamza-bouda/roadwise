package com.road_maintenance.dto;

import java.time.Instant;

public class TeamDTO {
    private String id;
    private String name;
    private Integer members;
    private String specialization;
    private Instant createdAt;

    // Default constructor
    public TeamDTO() {}

    // Constructor for mapping
    public TeamDTO(String id, String name, Integer members, String specialization, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.members = members;
        this.specialization = specialization;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getMembers() { return members; }
    public void setMembers(Integer members) { this.members = members; }
    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}