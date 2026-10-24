package com.example.hr_service.controller;

import com.example.hr_service.dto.InitialAdminRequest;
import com.example.hr_service.dto.InitialAdminResponse;
import com.example.hr_service.dto.SetupStatusResponse;
import com.example.hr_service.service.SetupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Public endpoints used before anyone can sign in. */
@RestController
@RequestMapping("/api/setup")
public class SetupController {

    private final SetupService setupService;

    public SetupController(SetupService setupService) {
        this.setupService = setupService;
    }

    @GetMapping("/status")
    public SetupStatusResponse status() {
        return setupService.status();
    }

    @PostMapping("/first-admin")
    @ResponseStatus(HttpStatus.CREATED)
    public InitialAdminResponse createFirstAdmin(@Valid @RequestBody InitialAdminRequest request) {
        return setupService.createFirstAdmin(request);
    }
}
