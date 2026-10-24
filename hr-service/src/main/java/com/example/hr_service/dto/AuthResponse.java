package com.example.hr_service.dto;

import java.time.Instant;

public record AuthResponse(
        String token,
        Instant expiresAt,
        CurrentUserResponse user) {
}
