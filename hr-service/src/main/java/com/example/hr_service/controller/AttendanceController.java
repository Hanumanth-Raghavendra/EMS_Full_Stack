package com.example.hr_service.controller;

import com.example.hr_service.dto.AttendanceRequest;
import com.example.hr_service.dto.AttendanceResponse;
import com.example.hr_service.dto.PageResponse;
import com.example.hr_service.dto.TodayAttendanceResponse;
import com.example.hr_service.entity.AttendanceStatus;
import com.example.hr_service.service.AttendanceService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    /** Defaults to the last 30 days. Employees always receive only their own records. */
    @GetMapping
    @PreAuthorize(Access.AUTHENTICATED)
    public PageResponse<AttendanceResponse> search(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) AttendanceStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort) {
        return attendanceService.search(employeeId, status, from, to, page, size, sort);
    }

    @GetMapping("/today")
    @PreAuthorize(Access.AUTHENTICATED)
    public TodayAttendanceResponse today() {
        return attendanceService.today();
    }

    @PostMapping("/check-in")
    @PreAuthorize(Access.AUTHENTICATED)
    public TodayAttendanceResponse checkIn() {
        return attendanceService.checkIn();
    }

    @PostMapping("/check-out")
    @PreAuthorize(Access.AUTHENTICATED)
    public TodayAttendanceResponse checkOut() {
        return attendanceService.checkOut();
    }

    @GetMapping("/{attendanceId}")
    @PreAuthorize(Access.AUTHENTICATED)
    public AttendanceResponse get(@PathVariable Long attendanceId) {
        return attendanceService.get(attendanceId);
    }

    @PostMapping
    @PreAuthorize(Access.MANAGER)
    @ResponseStatus(HttpStatus.CREATED)
    public AttendanceResponse create(@Valid @RequestBody AttendanceRequest request) {
        return attendanceService.create(request);
    }

    @PutMapping("/{attendanceId}")
    @PreAuthorize(Access.MANAGER)
    public AttendanceResponse update(@PathVariable Long attendanceId, @Valid @RequestBody AttendanceRequest request) {
        return attendanceService.update(attendanceId, request);
    }

    @DeleteMapping("/{attendanceId}")
    @PreAuthorize(Access.MANAGER)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long attendanceId) {
        attendanceService.delete(attendanceId);
    }
}
