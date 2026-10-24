package com.example.hr_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record AssignmentUpdateRequest(
        @NotBlank(message = "Role in project is required.")
        @Size(max = 100, message = "Role in project must be at most 100 characters.")
        String roleInProject,

        LocalDateTime assignedAt) {
}
