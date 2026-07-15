package com.road_maintenance.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initFirebase() {
        System.out.println("🔥 Entering initFirebase()");
        try (InputStream serviceAccount = getClass().getClassLoader()
                .getResourceAsStream("firebase-service-account.json")) {

            if (serviceAccount == null) {
                System.err.println("❌ Could not find firebase-service-account.json");
                throw new RuntimeException("Missing Firebase credentials file");
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                System.out.println("✅ Firebase initialized");
            } else {
                System.out.println("ℹ️ Firebase already initialized");
            }

        } catch (IOException e) {
            System.err.println("❌ Firebase init failed: " + e.getMessage());
        }
    }

    @Bean
    public Firestore firestore() {
        return FirestoreClient.getFirestore();  // Correct way to get Firestore instance
    }
}