package com.example.hr_service.service;

import com.example.hr_service.dto.AttendanceRequestDTO;
import com.example.hr_service.dto.AttendanceResponseDTO;
import com.example.hr_service.entity.Attendance;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.mapper.AttendanceMapper;
import com.example.hr_service.repository.AttendanceRepository;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.security.CurrentUserService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceMapper attendanceMapper;
    private final CurrentUserService currentUserService;

    public AttendanceServiceImpl(
            AttendanceRepository attendanceRepository,
            EmployeeRepository employeeRepository,
            AttendanceMapper attendanceMapper,
            CurrentUserService currentUserService) {

        this.attendanceRepository = attendanceRepository;
        this.employeeRepository = employeeRepository;
        this.attendanceMapper = attendanceMapper;
        this.currentUserService = currentUserService;
    }

    @Override
    public List<AttendanceResponseDTO> getAllAttendance() {
        return attendanceRepository.findAll()
                .stream()
                .filter(this::canRead)
                .map(attendanceMapper::toResponseDTO)
                .toList();
    }

    @Override
    public AttendanceResponseDTO getAttendanceById(Long attendanceId) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElse(null);

        if (attendance == null) {
            return null;
        }

        if (!canRead(attendance)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Employees can access only their own attendance records.");
        }

        return attendanceMapper.toResponseDTO(attendance);
    }

    @Override
    public AttendanceResponseDTO createAttendance(AttendanceRequestDTO dto) {
        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        Attendance attendance = attendanceMapper.toEntity(dto);
        attendance.setEmployee(employee);

        Attendance savedAttendance = attendanceRepository.save(attendance);

        return attendanceMapper.toResponseDTO(savedAttendance);
    }

    @Override
    public AttendanceResponseDTO updateAttendance(
            Long attendanceId,
            AttendanceRequestDTO dto) {

        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance not found"));

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        attendance.setEmployee(employee);
        attendance.setAttendanceDate(dto.getAttendanceDate());
        attendance.setStatus(dto.getStatus());
        attendance.setCheckIn(dto.getCheckIn());
        attendance.setCheckOut(dto.getCheckOut());

        Attendance updatedAttendance = attendanceRepository.save(attendance);

        return attendanceMapper.toResponseDTO(updatedAttendance);
    }

    @Override
    public void deleteAttendance(Long attendanceId) {
        attendanceRepository.deleteById(attendanceId);
    }

    private boolean canRead(Attendance attendance) {
        return !currentUserService.isEmployee()
                || currentUserService.getCurrentEmployeeId().equals(
                attendance.getEmployee().getEmployeeId());
    }
}
