package com.road_maintenance.dto;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class UserDTO {
    private String id;
    private String name;
    private String email;
    private String role;
    private String teamId;
    private ZonedDateTime createdAt;
    private String error;

    public UserDTO() {}

    public UserDTO(com.road_maintenance.model.User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.teamId = user.getTeamId();
        this.createdAt = user.getCreatedAt() != null ?
                ZonedDateTime.ofInstant(
                        user.getCreatedAt().toDate().toInstant(), // Convert Timestamp -> Date -> Instant
                        java.time.ZoneId.of("UTC")
                ) : null;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }

    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) {
        if (createdAt != null) {
            this.createdAt = ZonedDateTime.parse(createdAt, DateTimeFormatter.ISO_ZONED_DATE_TIME);
        }
    }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}