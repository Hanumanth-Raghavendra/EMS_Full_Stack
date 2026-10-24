package com.example.hr_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartmentRequest(
        @NotBlank(message = "Department name is required.")
        @Size(max = 100, message = "Department name must be at most 100 characters.")
        String departmentName,

        @Size(max = 500, message = "Description must be at most 500 characters.")
        String description) {
}
