package com.example.hr_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DesignationRequest(
        @NotBlank(message = "Designation name is required.")
        @Size(max = 100, message = "Designation name must be at most 100 characters.")
        String designationName,

        @NotNull(message = "Department is required.")
        Long departmentId) {
}
