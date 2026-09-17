package com.example.hr_service.service;

import com.example.hr_service.dto.AttendanceRequestDTO;
import com.example.hr_service.dto.AttendanceResponseDTO;

import java.util.List;

public interface AttendanceService {

    List<AttendanceResponseDTO> getAllAttendance();

    AttendanceResponseDTO getAttendanceById(Long attendanceId);

    AttendanceResponseDTO createAttendance(AttendanceRequestDTO dto);

    AttendanceResponseDTO updateAttendance(Long attendanceId, AttendanceRequestDTO dto);

    void deleteAttendance(Long attendanceId);
}