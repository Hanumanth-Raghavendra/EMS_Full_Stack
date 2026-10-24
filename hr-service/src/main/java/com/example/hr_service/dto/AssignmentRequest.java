package com.example.hr_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record AssignmentRequest(
        @NotNull(message = "Employee is required.")
        Long employeeId,

        @NotNull(message = "Project is required.")
        Long projectId,

        @NotBlank(message = "Role in project is required.")
        @Size(max = 100, message = "Role in project must be at most 100 characters.")
        String roleInProject,

        LocalDateTime assignedAt) {
}
