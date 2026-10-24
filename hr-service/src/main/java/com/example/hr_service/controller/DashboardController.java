package com.example.hr_service.controller;

import com.example.hr_service.dto.DashboardResponse;
import com.example.hr_service.service.DashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    @PreAuthorize(Access.AUTHENTICATED)
    public DashboardResponse summary() {
        return dashboardService.summary();
    }
}
