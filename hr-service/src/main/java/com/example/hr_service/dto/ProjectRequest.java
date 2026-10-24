package com.example.hr_service.dto;

import com.example.hr_service.entity.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ProjectRequest(
        @NotBlank(message = "Project name is required.")
        @Size(max = 150, message = "Project name must be at most 150 characters.")
        String projectName,

        @Size(max = 1000, message = "Description must be at most 1000 characters.")
        String description,

        LocalDate startDate,

        LocalDate endDate,

        @NotNull(message = "Status is required.")
        ProjectStatus status) {
}
