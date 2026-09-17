package com.example.hr_service.controller;

import com.example.hr_service.dto.AttendanceRequestDTO;
import com.example.hr_service.dto.AttendanceResponseDTO;
import com.example.hr_service.service.AttendanceService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @GetMapping
    public ResponseEntity<List<AttendanceResponseDTO>> getAllAttendance() {

        return ResponseEntity.ok(attendanceService.getAllAttendance());
    }

    @GetMapping("/{attendanceId}")
    public ResponseEntity<AttendanceResponseDTO> getAttendanceById(
            @PathVariable Long attendanceId) {

        AttendanceResponseDTO attendance = attendanceService.getAttendanceById(attendanceId);

        if (attendance == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(attendance);
    }

    @PostMapping
    public ResponseEntity<AttendanceResponseDTO> createAttendance(
            @Valid @RequestBody AttendanceRequestDTO dto) {

        return ResponseEntity.ok(
                attendanceService.createAttendance(dto));
    }

    @PutMapping("/{attendanceId}")
    public ResponseEntity<AttendanceResponseDTO> updateAttendance(
            @PathVariable Long attendanceId,
            @Valid @RequestBody AttendanceRequestDTO dto) {

        return ResponseEntity.ok(
                attendanceService.updateAttendance(attendanceId, dto));
    }

    @DeleteMapping("/{attendanceId}")
    public ResponseEntity<Void> deleteAttendance(
            @PathVariable Long attendanceId) {

        attendanceService.deleteAttendance(attendanceId);

        return ResponseEntity.noContent().build();
    }
}