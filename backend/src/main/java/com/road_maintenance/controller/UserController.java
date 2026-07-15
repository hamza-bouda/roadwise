package com.road_maintenance.controller;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.google.firebase.auth.UserRecord.CreateRequest;
import com.google.firebase.cloud.FirestoreClient;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.road_maintenance.dto.UserDTO;
import com.road_maintenance.model.User;
import com.road_maintenance.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private JavaMailSender mailSender;

    private String generateRandomPassword() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[12];
        random.nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes).substring(0, 12);
    }

    private void sendPasswordEmail(String email, String password, String name) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("Road Maintenance Team <roadmaintenace@gmail.com>");
            message.setTo(email);
            message.setSubject("Your New Account Password");
            message.setText(
                    "Hello " + name + ",\n\n" +
                            "Your account has been created. Here is your temporary password: " + password + "\n" +
                            "Please log in and change your password as soon as possible.\n\n" +
                            "Best regards,\nRoad Maintenance Team"
            );
            mailSender.send(message);
            System.out.println("Password email sent successfully to: " + email);
        } catch (MailException e) {
            System.err.println("Failed to send password email to " + email + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    @PostMapping("/create")
    public ResponseEntity<UserDTO> createUser(@RequestBody UserDTO userDTO) {
        try {
            if (userDTO.getName() == null || userDTO.getEmail() == null ||
                    userDTO.getRole() == null || userDTO.getCreatedAt() == null) {
                return ResponseEntity.badRequest().body(new UserDTO() {{ setError("Missing required fields"); }});
            }

            // Remove the check for existing user since we want to create if not exists
            String password = generateRandomPassword();
            CreateRequest request = new CreateRequest()
                    .setEmail(userDTO.getEmail())
                    .setDisplayName(userDTO.getName())
                    .setPassword(password);
            UserRecord userRecord;
            try {
                userRecord = FirebaseAuth.getInstance().createUser(request);
            } catch (FirebaseAuthException e) {
                if (e.getErrorCode().equals("email-already-in-use")) {
                    return ResponseEntity.badRequest().body(new UserDTO() {{ setError("User with this email already exists"); }});
                }
                throw e;
            }

            User user = new User();
            user.setId(userRecord.getUid());
            user.setName(userDTO.getName());
            user.setEmail(userDTO.getEmail());
            user.setRole(userDTO.getRole());
            user.setTeamId(userDTO.getTeamId());
            Instant createdAtInstant = userDTO.getCreatedAt().toInstant();
            user.setCreatedAt(com.google.cloud.Timestamp.ofTimeSecondsAndNanos(
                    createdAtInstant.getEpochSecond(),
                    createdAtInstant.getNano()
            ));

            userService.createUser(user);

            try {
                sendPasswordEmail(userDTO.getEmail(), password, userDTO.getName());
            } catch (Exception e) {
                System.err.println("Email sending failed: " + e.getMessage());
            }

            return ResponseEntity.ok(new UserDTO(user));
        } catch (FirebaseAuthException e) {
            return ResponseEntity.badRequest().body(new UserDTO() {{ setError("Firebase error: " + e.getMessage()); }});
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.badRequest().body(new UserDTO() {{ setError(e.getMessage()); }});
        }
    }

    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        try {
            List<User> users = userService.getAllUsers();
            List<UserDTO> userDTOs = users.stream().map(UserDTO::new).collect(Collectors.toList());
            return ResponseEntity.ok(userDTOs.isEmpty() ? new ArrayList<>() : userDTOs);
        } catch (ExecutionException | InterruptedException e) {
            UserDTO errorDTO = new UserDTO();
            errorDTO.setError(e.getMessage());
            return ResponseEntity.badRequest().body(List.of(errorDTO));
        }
    }

    @PatchMapping("/{userId}/team")
    public ResponseEntity<UserDTO> assignUserToTeam(@PathVariable String userId, @RequestBody UserDTO userDTO) {
        try {
            String teamId = userDTO.getTeamId();
            if (teamId != null && !teamId.isEmpty()) {
                Firestore db = FirestoreClient.getFirestore();
                DocumentSnapshot teamSnapshot = db.collection("teams").document(teamId).get().get();
                if (!teamSnapshot.exists()) {
                    return ResponseEntity.badRequest().body(new UserDTO() {{ setError("Team not found"); }});
                }
            }
            userService.assignUserToTeam(userId, teamId);
            User user = userService.getUserById(userId);
            return ResponseEntity.ok(new UserDTO(user));
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.badRequest().body(new UserDTO() {{ setError(e.getMessage()); }});
        }
    }
    // Add delete user endpoint with better error handling
    @DeleteMapping("/{userId}")
    public ResponseEntity<String> deleteUser(@PathVariable String userId) {
        try {
            // First check if user is assigned to a team
            User user = userService.getUserById(userId);

            if (user.getTeamId() != null && !user.getTeamId().isEmpty()) {
                return ResponseEntity.badRequest().body("Cannot delete user assigned to a team");
            }

            // Delete user from Firestore first (this is safer)
            String result = userService.deleteUser(userId);
            System.out.println("Successfully deleted user from Firestore: " + userId);

            // Then delete from Firebase Authentication
            try {
                FirebaseAuth.getInstance().deleteUser(userId);
                System.out.println("Successfully deleted user from Firebase Authentication: " + userId);
            } catch (FirebaseAuthException e) {
                System.err.println("Failed to delete user from Firebase Auth: " + e.getMessage());
                // Log the error but still return success since Firestore deletion succeeded
                // The user will be unable to login but their data is cleaned up
                return ResponseEntity.ok(result + " (Note: User authentication record could not be removed: " + e.getMessage() + ")");
            }

            return ResponseEntity.ok(result);
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.badRequest().body("Error deleting user: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error deleting user: " + e.getMessage());
        }
    }
}