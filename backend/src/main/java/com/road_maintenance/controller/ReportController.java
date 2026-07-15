package com.road_maintenance.controller;

import com.road_maintenance.model.Report;
import com.road_maintenance.dto.ReportDTO;
import com.road_maintenance.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin
public class ReportController {

    @Autowired
    private ReportService reportService;

    @GetMapping
    public List<ReportDTO> getAllReports() throws ExecutionException, InterruptedException {
        return reportService.getAllReports();
    }

    @GetMapping("/{id}")
    public ReportDTO getReportById(@PathVariable String id) throws ExecutionException, InterruptedException {
        return reportService.getReportById(id);
    }

    @PatchMapping("/{id}/status")
    public ReportDTO updateStatus(@PathVariable String id, @RequestBody StatusUpdate statusUpdate) throws ExecutionException, InterruptedException {
        // Implement status update logic
        return reportService.getReportById(id); // Placeholder
    }
}

class StatusUpdate {
    private String status;
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}