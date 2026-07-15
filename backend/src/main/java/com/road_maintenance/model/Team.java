package com.road_maintenance.model;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.annotation.PropertyName;
import java.time.Instant;

public class Team {
    private String id;
    private String name;
    @JsonSerialize(using = ToStringSerializer.class)
    private Instant createdAt;
    private int members;

    public Team() {}

    public Team(String id, String name, Timestamp createdAt, int members) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt != null ? createdAt.toDate().toInstant() : null;
        this.members = members;
    }

    @PropertyName("id")
    public String getId() { return id; }
    @PropertyName("id")
    public void setId(String id) { this.id = id; }

    @PropertyName("name")
    public String getName() { return name; }
    @PropertyName("name")
    public void setName(String name) { this.name = name; }

    @PropertyName("createdAt")
    public Instant getCreatedAt() { return createdAt; }
    @PropertyName("createdAt")
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    @PropertyName("members")
    public int getMembers() { return members; }
    @PropertyName("members")
    public void setMembers(int members) { this.members = members; }
}