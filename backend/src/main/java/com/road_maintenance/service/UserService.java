package com.road_maintenance.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.road_maintenance.model.User;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final String COLLECTION_NAME = "users";
    private static final String TEAMS_COLLECTION = "teams";

    private Timestamp parseStringToTimestamp(Object value) throws ParseException {
        if (value instanceof Timestamp) {
            return (Timestamp) value;
        } else if (value instanceof String) {
            SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
            isoFormat.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            Date date = isoFormat.parse((String) value);
            return Timestamp.of(date);
        }
        throw new ParseException("Invalid createdAt format", 0);
    }

    private String parseTeamId(Object value, Firestore db) {
        if (value == null) {
            return null;
        } else if (value instanceof DocumentReference) {
            return ((DocumentReference) value).getId();
        } else if (value instanceof String) {
            String teamId = (String) value;
            return teamId.isEmpty() ? null : teamId;
        }
        return null;
    }

    private Map<String, Object> createUserData(User user, DocumentReference teamRef) {
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId());
        userData.put("name", user.getName());
        userData.put("email", user.getEmail());
        userData.put("role", user.getRole());
        userData.put("createdAt", user.getCreatedAt());
        userData.put("teamId", teamRef);
        return userData;
    }

    public String createUser(User user) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();

        // Use WriteBatch for atomic operations
        WriteBatch batch = db.batch();

        // Create user document with auto-generated ID
        DocumentReference userDoc = db.collection(COLLECTION_NAME).document();
        user.setId(userDoc.getId());

        // Prepare team reference if provided
        DocumentReference teamRef = null;
        if (user.getTeamId() != null && !user.getTeamId().isEmpty()) {
            teamRef = db.collection(TEAMS_COLLECTION).document(user.getTeamId());
        }

        // Create user data
        Map<String, Object> userData = createUserData(user, teamRef);

        // Add user creation to batch
        batch.set(userDoc, userData);

        // If user is assigned to a team, increment team members count
        if (teamRef != null) {
            batch.update(teamRef, "members", FieldValue.increment(1));
        }

        // Execute all operations atomically
        ApiFuture<List<WriteResult>> result = batch.commit();
        result.get(); // Single blocking call

        return "User created successfully at: " + userDoc.getId();
    }

    public String updateUser(User user) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();

        DocumentReference userDoc = db.collection(COLLECTION_NAME).document(user.getId());

        // Prepare team reference if provided
        DocumentReference teamRef = null;
        if (user.getTeamId() != null && !user.getTeamId().isEmpty()) {
            teamRef = db.collection(TEAMS_COLLECTION).document(user.getTeamId());
        }

        // Create user data
        Map<String, Object> userData = createUserData(user, teamRef);

        // Update user with merge option
        ApiFuture<WriteResult> result = userDoc.set(userData, SetOptions.merge());

        return "User updated at: " + result.get().getUpdateTime();
    }

    public String assignUserToTeam(String userId, String teamId) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();

        // First, get current user data to check existing team
        DocumentReference userDoc = db.collection(COLLECTION_NAME).document(userId);
        DocumentSnapshot userSnapshot = userDoc.get().get();

        if (!userSnapshot.exists()) {
            throw new RuntimeException("User not found");
        }

        String currentTeamId = parseTeamId(userSnapshot.get("teamId"), db);

        // Use WriteBatch for atomic operations
        WriteBatch batch = db.batch();

        // Prepare new team reference
        DocumentReference newTeamRef = null;
        if (teamId != null && !teamId.isEmpty()) {
            newTeamRef = db.collection(TEAMS_COLLECTION).document(teamId);
        }

        // Update user's team assignment
        Map<String, Object> userUpdate = new HashMap<>();
        userUpdate.put("teamId", newTeamRef);
        batch.set(userDoc, userUpdate, SetOptions.merge());

        // Update team member counts
        if (teamId != null && !teamId.isEmpty()) {
            // Increment new team members count
            DocumentReference newTeamDoc = db.collection(TEAMS_COLLECTION).document(teamId);
            batch.update(newTeamDoc, "members", FieldValue.increment(1));
        }

        if (currentTeamId != null && !currentTeamId.isEmpty()) {
            // Decrement previous team members count
            DocumentReference prevTeamDoc = db.collection(TEAMS_COLLECTION).document(currentTeamId);
            batch.update(prevTeamDoc, "members", FieldValue.increment(-1));
        }

        // Execute all operations atomically
        ApiFuture<List<WriteResult>> result = batch.commit();
        result.get();

        return "User assigned to team successfully";
    }

    public List<User> getAllUsers() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();

        // Single query to get all users
        ApiFuture<QuerySnapshot> query = db.collection(COLLECTION_NAME).get();

        return query.get().getDocuments().stream()
                .map(doc -> {
                    try {
                        User user = new User();
                        user.setId(doc.getString("id"));
                        user.setName(doc.getString("name"));
                        user.setEmail(doc.getString("email"));
                        user.setRole(doc.getString("role"));
                        user.setTeamId(parseTeamId(doc.get("teamId"), db));
                        user.setCreatedAt(parseStringToTimestamp(doc.get("createdAt")));
                        return user;
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to parse user data for document: " + doc.getId(), e);
                    }
                })
                .collect(Collectors.toList());
    }

    public User getUserById(String id) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();

        DocumentReference docRef = db.collection(COLLECTION_NAME).document(id);
        ApiFuture<DocumentSnapshot> future = docRef.get();
        DocumentSnapshot snapshot = future.get();

        if (!snapshot.exists()) {
            throw new RuntimeException("User not found with ID: " + id);
        }

        try {
            User user = new User();
            user.setId(snapshot.getString("id"));
            user.setName(snapshot.getString("name"));
            user.setEmail(snapshot.getString("email"));
            user.setRole(snapshot.getString("role"));
            user.setTeamId(parseTeamId(snapshot.get("teamId"), db));
            user.setCreatedAt(parseStringToTimestamp(snapshot.get("createdAt")));
            return user;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse user data for ID: " + id, e);
        }
    }

    // Additional utility method to delete user
    public String deleteUser(String userId) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();

        // First get user to check if they're in a team
        DocumentReference userDoc = db.collection(COLLECTION_NAME).document(userId);
        DocumentSnapshot userSnapshot = userDoc.get().get();

        if (!userSnapshot.exists()) {
            throw new RuntimeException("User not found");
        }

        String teamId = parseTeamId(userSnapshot.get("teamId"), db);

        WriteBatch batch = db.batch();

        // Delete user
        batch.delete(userDoc);

        // If user was in a team, decrement team members count
        if (teamId != null && !teamId.isEmpty()) {
            DocumentReference teamDoc = db.collection(TEAMS_COLLECTION).document(teamId);
            batch.update(teamDoc, "members", FieldValue.increment(-1));
        }

        // Execute all operations atomically
        ApiFuture<List<WriteResult>> result = batch.commit();
        result.get();

        return "User deleted successfully";
    }

    // Utility method to get users by team
    public List<User> getUsersByTeam(String teamId) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference teamRef = db.collection(TEAMS_COLLECTION).document(teamId);

        ApiFuture<QuerySnapshot> query = db.collection(COLLECTION_NAME)
                .whereEqualTo("teamId", teamRef)
                .get();

        return query.get().getDocuments().stream()
                .map(doc -> {
                    try {
                        User user = new User();
                        user.setId(doc.getString("id"));
                        user.setName(doc.getString("name"));
                        user.setEmail(doc.getString("email"));
                        user.setRole(doc.getString("role"));
                        user.setTeamId(parseTeamId(doc.get("teamId"), db));
                        user.setCreatedAt(parseStringToTimestamp(doc.get("createdAt")));
                        return user;
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to parse user data for document: " + doc.getId(), e);
                    }
                })
                .collect(Collectors.toList());
    }
}