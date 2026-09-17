package com.example.hr_service.controller;

import com.example.hr_service.dto.LeaveRequestDTO;
import com.example.hr_service.dto.LeaveRequestResponseDTO;
import com.example.hr_service.service.LeaveRequestService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/leave-requests")
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;

    public LeaveRequestController(LeaveRequestService leaveRequestService) {
        this.leaveRequestService = leaveRequestService;
    }

    @GetMapping
    public ResponseEntity<List<LeaveRequestResponseDTO>> getAllLeaveRequests() {

        return ResponseEntity.ok(
                leaveRequestService.getAllLeaveRequests());
    }

    @GetMapping("/{leaveId}")
    public ResponseEntity<LeaveRequestResponseDTO> getLeaveRequestById(
            @PathVariable Long leaveId) {

        LeaveRequestResponseDTO leaveRequest = leaveRequestService.getLeaveRequestById(leaveId);

        if (leaveRequest == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(leaveRequest);
    }

    @PostMapping
    public ResponseEntity<LeaveRequestResponseDTO> createLeaveRequest(
            @Valid @RequestBody LeaveRequestDTO dto) {

        return ResponseEntity.ok(
                leaveRequestService.createLeaveRequest(dto));
    }

    @PutMapping("/{leaveId}")
    public ResponseEntity<LeaveRequestResponseDTO> updateLeaveRequest(
            @PathVariable Long leaveId,
            @Valid @RequestBody LeaveRequestDTO dto) {

        return ResponseEntity.ok(
                leaveRequestService.updateLeaveRequest(leaveId, dto));
    }

    @DeleteMapping("/{leaveId}")
    public ResponseEntity<Void> deleteLeaveRequest(
            @PathVariable Long leaveId) {

        leaveRequestService.deleteLeaveRequest(leaveId);

        return ResponseEntity.noContent().build();
    }
}