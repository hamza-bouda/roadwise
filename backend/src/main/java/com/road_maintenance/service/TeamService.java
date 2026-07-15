package com.road_maintenance.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.road_maintenance.model.Team;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class TeamService {

    private static final String COLLECTION_NAME = "teams";

    public String createTeam(Team team) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document();
        team.setId(docRef.getId());
        team.setCreatedAt(Instant.now());

        ApiFuture<WriteResult> result = docRef.set(new Team(
                team.getId(),
                team.getName(),
                Timestamp.ofTimeSecondsAndNanos(
                        team.getCreatedAt().getEpochSecond(),
                        team.getCreatedAt().getNano()
                ),
                team.getMembers()
        ));
        return "Team created at: " + result.get().getUpdateTime();
    }

    public List<Team> getAllTeams() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        ApiFuture<QuerySnapshot> query = db.collection(COLLECTION_NAME).get();
        return query.get().getDocuments().stream()
                .map(doc -> {
                    Team team = new Team();
                    team.setId(doc.getId());
                    team.setName(doc.getString("name"));
                    Timestamp createdAt = doc.getTimestamp("createdAt");
                    if (createdAt != null) {
                        team.setCreatedAt(createdAt.toDate().toInstant());
                    }
                    Long members = doc.getLong("members");
                    if (members != null) {
                        team.setMembers(members.intValue());
                    }
                    return team;
                })
                .collect(Collectors.toList());
    }

    public Team getTeamById(String id) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document(id);
        DocumentSnapshot snapshot = docRef.get().get();
        if (snapshot.exists()) {
            Team team = new Team();
            team.setId(snapshot.getId());
            team.setName(snapshot.getString("name"));
            Timestamp createdAt = snapshot.getTimestamp("createdAt");
            if (createdAt != null) {
                team.setCreatedAt(createdAt.toDate().toInstant());
            }
            Long members = snapshot.getLong("members");
            if (members != null) {
                team.setMembers(members.intValue());
            }
            return team;
        } else {
            throw new RuntimeException("Team not found");
        }
    }

    public void updateTeamMembers(String teamId, int members) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document(teamId);
        ApiFuture<WriteResult> result = docRef.update("members", members);
        result.get();
    }
}