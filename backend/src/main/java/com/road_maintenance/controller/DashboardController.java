package com.road_maintenance.controller;

import com.road_maintenance.model.DashboardStats;
import com.road_maintenance.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/dashboard/stats")
    public DashboardStats getDashboardStats() throws ExecutionException, InterruptedException {
        return dashboardService.getDashboardStats();
    }
}