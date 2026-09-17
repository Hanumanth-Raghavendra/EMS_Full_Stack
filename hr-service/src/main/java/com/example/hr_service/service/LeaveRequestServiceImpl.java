package com.example.hr_service.service;

import com.example.hr_service.dto.LeaveRequestDTO;
import com.example.hr_service.dto.LeaveRequestResponseDTO;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.LeaveRequest;
import com.example.hr_service.entity.User;
import com.example.hr_service.exception.ResourceNotFoundException;
import com.example.hr_service.mapper.LeaveRequestMapper;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.LeaveRequestRepository;
import com.example.hr_service.repository.UserRepository;
import com.example.hr_service.security.CurrentUserService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LeaveRequestServiceImpl implements LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final LeaveRequestMapper leaveRequestMapper;
    private final CurrentUserService currentUserService;
    private final AuditLogRecorder auditLogRecorder;

    public LeaveRequestServiceImpl(
            LeaveRequestRepository leaveRequestRepository,
            EmployeeRepository employeeRepository,
            UserRepository userRepository,
            LeaveRequestMapper leaveRequestMapper,
            CurrentUserService currentUserService,
            AuditLogRecorder auditLogRecorder) {

        this.leaveRequestRepository = leaveRequestRepository;
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.leaveRequestMapper = leaveRequestMapper;
        this.currentUserService = currentUserService;
        this.auditLogRecorder = auditLogRecorder;
    }

    @Override
    public List<LeaveRequestResponseDTO> getAllLeaveRequests() {

        List<LeaveRequest> requests = currentUserService.isEmployee()
                ? leaveRequestRepository.findByEmployee_EmployeeId(
                        currentUserService.getCurrentEmployeeId())
                : leaveRequestRepository.findAll();

        return requests.stream()
                .map(leaveRequestMapper::toResponseDTO)
                .toList();
    }

    @Override
    public LeaveRequestResponseDTO getLeaveRequestById(Long leaveId) {

        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElse(null);

        if (leaveRequest == null) {
            return null;
        }

        ensureEmployeeOwnsRecord(leaveRequest);

        return leaveRequestMapper.toResponseDTO(leaveRequest);
    }

    @Override
    @Transactional
    public LeaveRequestResponseDTO createLeaveRequest(LeaveRequestDTO dto) {

        if (currentUserService.isEmployee()) {
            LeaveRequest leaveRequest = new LeaveRequest();
            Employee employee = employeeRepository.findById(
                    currentUserService.getCurrentEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            // Employees can submit only their own leave requests, always as PENDING.
            leaveRequest.setEmployee(employee);
            leaveRequest.setStartDate(dto.getStartDate());
            leaveRequest.setEndDate(dto.getEndDate());
            leaveRequest.setReason(dto.getReason());
            leaveRequest.setStatus("PENDING");
            leaveRequest.setApprovedBy(null);

            LeaveRequest saved = leaveRequestRepository.save(leaveRequest);

            auditLogRecorder.record(
                    "CREATE",
                    "LeaveRequest",
                    saved.getLeaveId(),
                    null,
                    formatLeaveRequest(saved));

            return leaveRequestMapper.toResponseDTO(saved);
        }

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        LeaveRequest leaveRequest = leaveRequestMapper.toEntity(dto);
        leaveRequest.setEmployee(employee);

        if ("APPROVED".equalsIgnoreCase(dto.getStatus())) {

    if (dto.getApprovedBy() == null) {
        throw new IllegalArgumentException(
                "Approved By is required when leave status is APPROVED.");
    }

    User user = userRepository.findById(dto.getApprovedBy())
            .orElseThrow(() ->
                    new ResourceNotFoundException(
                            "Approving user not found"));

    if (user.getRole() == null ||
            !"ADMIN".equalsIgnoreCase(
                    user.getRole().getRoleName())) {

        throw new IllegalArgumentException(
                "Only an ADMIN user can approve leave requests.");
    }

    leaveRequest.setApprovedBy(user);

} else {

    leaveRequest.setApprovedBy(null);
}

        LeaveRequest savedLeaveRequest = leaveRequestRepository.save(leaveRequest);

        auditLogRecorder.record(
                "CREATE",
                "LeaveRequest",
                savedLeaveRequest.getLeaveId(),
                null,
                formatLeaveRequest(savedLeaveRequest));

        return leaveRequestMapper.toResponseDTO(savedLeaveRequest);
    }

    @Override
    @Transactional
    public LeaveRequestResponseDTO updateLeaveRequest(
            Long leaveId,
            LeaveRequestDTO dto) {

        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        ensureEmployeeOwnsRecord(leaveRequest);

        if (currentUserService.isEmployee()) {
            if (!"PENDING".equalsIgnoreCase(leaveRequest.getStatus())) {
                throw new AccessDeniedException(
                        "Employees can modify only pending leave requests.");
            }

            String oldValue = formatLeaveRequest(leaveRequest);

            // Employees cannot change employee, status, or approver.
            leaveRequest.setStartDate(dto.getStartDate());
            leaveRequest.setEndDate(dto.getEndDate());
            leaveRequest.setReason(dto.getReason());
            leaveRequest.setStatus("PENDING");
            leaveRequest.setApprovedBy(null);

            LeaveRequest updated = leaveRequestRepository.save(leaveRequest);

            auditLogRecorder.record(
                    "UPDATE",
                    "LeaveRequest",
                    updated.getLeaveId(),
                    oldValue,
                    formatLeaveRequest(updated));

            return leaveRequestMapper.toResponseDTO(updated);
        }

        String oldValue = formatLeaveRequest(leaveRequest);

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        leaveRequest.setEmployee(employee);
        leaveRequest.setStartDate(dto.getStartDate());
        leaveRequest.setEndDate(dto.getEndDate());
        leaveRequest.setReason(dto.getReason());
        leaveRequest.setStatus(dto.getStatus());

        if ("APPROVED".equalsIgnoreCase(dto.getStatus())) {

                if (dto.getApprovedBy() == null) {
                        throw new IllegalArgumentException(
                                        "Approved By is required when leave status is APPROVED.");
                }

                User user = userRepository.findById(dto.getApprovedBy())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Approving user not found"));

                if (user.getRole() == null ||
                                !"ADMIN".equalsIgnoreCase(
                                                user.getRole().getRoleName())) {

                        throw new IllegalArgumentException(
                                        "Only an ADMIN user can approve leave requests.");
                }

                leaveRequest.setApprovedBy(user);

        } else {

                leaveRequest.setApprovedBy(null);
        }

        LeaveRequest updatedLeaveRequest = leaveRequestRepository.save(leaveRequest);

        auditLogRecorder.record(
                "UPDATE",
                "LeaveRequest",
                updatedLeaveRequest.getLeaveId(),
                oldValue,
                formatLeaveRequest(updatedLeaveRequest));

        return leaveRequestMapper.toResponseDTO(updatedLeaveRequest);
    }

    @Override
    @Transactional
    public void deleteLeaveRequest(Long leaveId) {

        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        ensureEmployeeOwnsRecord(leaveRequest);

        if (currentUserService.isEmployee()) {
            if (!"PENDING".equalsIgnoreCase(leaveRequest.getStatus())) {
                throw new AccessDeniedException(
                        "Employees can delete only pending leave requests.");
            }

            String oldValue = formatLeaveRequest(leaveRequest);
            leaveRequestRepository.delete(leaveRequest);

            auditLogRecorder.record(
                    "DELETE",
                    "LeaveRequest",
                    leaveId,
                    oldValue,
                    null);
            return;
        }

        String oldValue = formatLeaveRequest(leaveRequest);
        leaveRequestRepository.delete(leaveRequest);

        auditLogRecorder.record(
                "DELETE",
                "LeaveRequest",
                leaveId,
                oldValue,
                null);
    }

    private void ensureEmployeeOwnsRecord(LeaveRequest leaveRequest) {
        if (currentUserService.isEmployee()
                && !currentUserService.getCurrentEmployeeId().equals(
                        leaveRequest.getEmployee().getEmployeeId())) {
            throw new AccessDeniedException(
                    "Employees can access only their own leave requests.");
        }
    }

    private String formatLeaveRequest(LeaveRequest leaveRequest) {
        return String.format(
                "employeeId=%s, startDate=%s, endDate=%s, reason=%s, status=%s, approvedBy=%s",
                leaveRequest.getEmployee().getEmployeeId(),
                leaveRequest.getStartDate(),
                leaveRequest.getEndDate(),
                leaveRequest.getReason(),
                leaveRequest.getStatus(),
                leaveRequest.getApprovedBy() == null
                        ? null
                        : leaveRequest.getApprovedBy().getUserId());
    }
}
