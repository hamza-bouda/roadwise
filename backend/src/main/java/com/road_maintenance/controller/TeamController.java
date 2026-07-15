package com.road_maintenance.controller;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.road_maintenance.model.Team;
import com.road_maintenance.service.TeamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    @Autowired
    private TeamService teamService;

    @PostMapping
    public String createTeam(@RequestBody Team team) throws ExecutionException, InterruptedException {
        return teamService.createTeam(team);
    }

    @GetMapping
    public List<Team> getAllTeams() throws ExecutionException, InterruptedException {
        return teamService.getAllTeams();
    }

    @GetMapping("/{id}")
    public Team getTeamById(@PathVariable String id) throws ExecutionException, InterruptedException {
        return teamService.getTeamById(id);
    }

    @DeleteMapping("/{teamId}")
    public ResponseEntity<Void> deleteTeam(@PathVariable String teamId) {
        try {
            Firestore db = FirestoreClient.getFirestore();
            QuerySnapshot usersWithTeam = db.collection("users")
                    .whereEqualTo("teamId", db.collection("teams").document(teamId))
                    .get().get();
            if (!usersWithTeam.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            db.collection("teams").document(teamId).delete().get();
            return ResponseEntity.ok().build();
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/{teamId}/assign")
    public ResponseEntity<String> assignUserToTeam(@PathVariable String teamId, @RequestBody String userId)
            throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference userRef = db.collection("users").document(userId);
        DocumentSnapshot userSnapshot = userRef.get().get();
        if (!userSnapshot.exists()) {
            return ResponseEntity.badRequest().body("User not found");
        }

        // Update user's teamId
        userRef.update("teamId", db.collection("teams").document(teamId)).get();

        // Increment members count in the team
        Team team = teamService.getTeamById(teamId);
        team.setMembers(team.getMembers() + 1);
        teamService.updateTeamMembers(teamId, team.getMembers());

        return ResponseEntity.ok("User assigned to team");
    }
}