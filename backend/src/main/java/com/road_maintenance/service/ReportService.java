package com.road_maintenance.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.road_maintenance.model.Report;
import com.road_maintenance.dto.ReportDTO;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

@Service
public class ReportService {

    private static final String COLLECTION_NAME = "reports";
    private static final String USER_COLLECTION_NAME = "users";

    public String createReport(Report report) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document();
        report.setId(docRef.getId());
        report.setReportedAt(Timestamp.now());
        ApiFuture<WriteResult> future = docRef.set(report);
        future.get();
        return docRef.getId();
    }

    public ReportDTO updateStatus(String id, String status) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document(id);
        ApiFuture<WriteResult> future = docRef.update("status", status);
        future.get();
        return getReportById(id);
    }

    public List<ReportDTO> getAllReports() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        ApiFuture<QuerySnapshot> future = db.collection(COLLECTION_NAME).get();
        List<QueryDocumentSnapshot> documents = future.get().getDocuments();
        List<ReportDTO> reportDTOs = new ArrayList<>();
        for (QueryDocumentSnapshot doc : documents) {
            Report report = doc.toObject(Report.class);
            report.setId(doc.getId());
            ReportDTO dto = new ReportDTO(report);
            // Resolve detectedBy reference to get the user name
            if (report.getDetectedBy() != null) {
                DocumentSnapshot userSnapshot = report.getDetectedBy().get().get();
                if (userSnapshot.exists()) {
                    String name = userSnapshot.getString("name");
                    dto.setDetectedByName(name != null ? name : "Unknown User");
                } else {
                    dto.setDetectedByName("Unknown User");
                }
            } else {
                dto.setDetectedByName("Unknown User");
            }
            reportDTOs.add(dto);
        }
        return reportDTOs;
    }

    public ReportDTO getReportById(String id) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(COLLECTION_NAME).document(id);
        DocumentSnapshot snapshot = docRef.get().get();
        if (snapshot.exists()) {
            Report report = snapshot.toObject(Report.class);
            report.setId(id);
            ReportDTO dto = new ReportDTO(report);
            // Resolve detectedBy reference to get the user name
            if (report.getDetectedBy() != null) {
                DocumentSnapshot userSnapshot = report.getDetectedBy().get().get();
                if (userSnapshot.exists()) {
                    String name = userSnapshot.getString("name");
                    dto.setDetectedByName(name != null ? name : "Unknown User");
                } else {
                    dto.setDetectedByName("Unknown User");
                }
            } else {
                dto.setDetectedByName("Unknown User");
            }
            return dto;
        }
        return null;
    }
}