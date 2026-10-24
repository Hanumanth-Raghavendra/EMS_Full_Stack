package com.example.hr_service.controller;

import com.example.hr_service.dto.AuthResponse;
import com.example.hr_service.dto.ChangePasswordRequest;
import com.example.hr_service.dto.CurrentUserResponse;
import com.example.hr_service.dto.LoginRequest;
import com.example.hr_service.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        return authService.login(request, http.getRemoteAddr());
    }

    @GetMapping("/me")
    @PreAuthorize(Access.AUTHENTICATED)
    public CurrentUserResponse me() {
        return authService.me();
    }

    @PostMapping("/change-password")
    @PreAuthorize(Access.AUTHENTICATED)
    public AuthResponse changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return authService.changePassword(request);
    }
}
