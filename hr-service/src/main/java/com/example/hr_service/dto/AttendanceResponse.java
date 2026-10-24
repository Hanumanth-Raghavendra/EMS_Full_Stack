package com.example.hr_service.dto;

import com.example.hr_service.entity.Attendance;
import com.example.hr_service.entity.AttendanceStatus;
import com.example.hr_service.entity.Employee;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AttendanceResponse(
        Long attendanceId,
        Long employeeId,
        String employeeCode,
        String employeeName,
        LocalDate attendanceDate,
        AttendanceStatus status,
        LocalDateTime checkIn,
        LocalDateTime checkOut,
        Long workedMinutes) {

    public static AttendanceResponse from(Attendance attendance) {
        Employee employee = attendance.getEmployee();
        return new AttendanceResponse(
                attendance.getAttendanceId(),
                employee.getEmployeeId(),
                employee.getEmployeeCode(),
                employee.getFullName(),
                attendance.getAttendanceDate(),
                attendance.getStatus(),
                attendance.getCheckIn(),
                attendance.getCheckOut(),
                attendance.getWorkedMinutes());
    }
}
