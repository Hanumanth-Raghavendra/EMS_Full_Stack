package com.example.hr_service.dto;

import com.example.hr_service.entity.LeaveType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Apply for leave. {@code employeeId} is optional: employees always apply
 * for themselves; HR/admins may apply on behalf of someone else.
 */
public record LeaveApplyRequest(
        Long employeeId,

        @NotNull(message = "Leave type is required.")
        LeaveType leaveType,

        @NotNull(message = "Start date is required.")
        LocalDate startDate,

        @NotNull(message = "End date is required.")
        LocalDate endDate,

        @NotBlank(message = "Please give a short reason.")
        @Size(min = 3, max = 500, message = "Reason must be 3-500 characters.")
        String reason) {
}
