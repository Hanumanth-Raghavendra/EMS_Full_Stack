package com.example.hr_service.dto;

import com.example.hr_service.entity.SystemRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** Password changes go through the dedicated reset endpoint. */
public record UserUpdateRequest(
        @NotBlank(message = "Username is required.")
        @Pattern(regexp = ValidationPatterns.USERNAME, message = ValidationPatterns.USERNAME_MESSAGE)
        String username,

        @NotNull(message = "Role is required.")
        SystemRole role,

        @NotNull(message = "Enabled flag is required.")
        Boolean enabled) {
}
