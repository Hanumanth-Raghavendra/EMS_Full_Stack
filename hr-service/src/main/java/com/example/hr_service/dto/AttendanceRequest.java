package com.example.hr_service.dto;

import com.example.hr_service.entity.AttendanceStatus;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AttendanceRequest(
        @NotNull(message = "Employee is required.")
        Long employeeId,

        @NotNull(message = "Date is required.")
        LocalDate attendanceDate,

        @NotNull(message = "Status is required.")
        AttendanceStatus status,

        LocalDateTime checkIn,

        LocalDateTime checkOut) {
}
