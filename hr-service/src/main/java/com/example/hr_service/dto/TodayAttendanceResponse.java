package com.example.hr_service.dto;

import java.time.LocalDate;

/** Drives the check-in / check-out card for the signed-in user. */
public record TodayAttendanceResponse(
        LocalDate date,
        AttendanceResponse record,
        boolean onApprovedLeave,
        boolean canCheckIn,
        boolean canCheckOut) {
}
