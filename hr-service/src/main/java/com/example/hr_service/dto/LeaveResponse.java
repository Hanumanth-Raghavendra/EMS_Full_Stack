package com.example.hr_service.dto;

import com.example.hr_service.entity.LeaveStatus;
import com.example.hr_service.entity.LeaveType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record LeaveResponse(
        Long leaveId,
        Long employeeId,
        String employeeCode,
        String employeeName,
        LeaveType leaveType,
        LocalDate startDate,
        LocalDate endDate,
        int days,
        String reason,
        LeaveStatus status,
        LocalDateTime appliedAt,
        Long reviewedById,
        String reviewedByUsername,
        LocalDateTime reviewedAt,
        String reviewComment,
        Permissions permissions) {

    /** What the current user may do with this request, so the UI never guesses. */
    public record Permissions(boolean edit, boolean cancel, boolean review, boolean delete) {
    }
}
