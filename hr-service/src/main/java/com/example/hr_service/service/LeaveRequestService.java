package com.example.hr_service.service;

import com.example.hr_service.dto.LeaveRequestDTO;
import com.example.hr_service.dto.LeaveRequestResponseDTO;

import java.util.List;

public interface LeaveRequestService {

    List<LeaveRequestResponseDTO> getAllLeaveRequests();

    LeaveRequestResponseDTO getLeaveRequestById(Long leaveId);

    LeaveRequestResponseDTO createLeaveRequest(LeaveRequestDTO dto);

    LeaveRequestResponseDTO updateLeaveRequest(Long leaveId, LeaveRequestDTO dto);

    void deleteLeaveRequest(Long leaveId);
}