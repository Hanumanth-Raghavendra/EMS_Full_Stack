package com.example.hr_service;

import com.example.hr_service.dto.LeaveRequestDTO;
import com.example.hr_service.dto.LeaveRequestResponseDTO;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.LeaveRequest;
import com.example.hr_service.entity.Role;
import com.example.hr_service.entity.User;
import com.example.hr_service.mapper.LeaveRequestMapper;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.LeaveRequestRepository;
import com.example.hr_service.repository.UserRepository;
import com.example.hr_service.security.CurrentUserService;
import com.example.hr_service.service.AuditLogRecorder;
import com.example.hr_service.service.LeaveRequestServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveRequestServiceImplTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private LeaveRequestMapper leaveRequestMapper;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private AuditLogRecorder auditLogRecorder;

    @InjectMocks
    private LeaveRequestServiceImpl leaveRequestService;

    private Employee employee(Long id) {
        Employee employee = new Employee();
        employee.setEmployeeId(id);
        employee.setFirstName("Test");
        employee.setLastName("Employee");
        return employee;
    }

    private LeaveRequest leaveRequest(Long leaveId, Long employeeId, String status) {
        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setLeaveId(leaveId);
        leaveRequest.setEmployee(employee(employeeId));
        leaveRequest.setStartDate(LocalDate.of(2026, 9, 1));
        leaveRequest.setEndDate(LocalDate.of(2026, 9, 3));
        leaveRequest.setReason("Personal work");
        leaveRequest.setStatus(status);
        return leaveRequest;
    }

    private LeaveRequestDTO dto(Long employeeId, String status) {
        LeaveRequestDTO dto = new LeaveRequestDTO();
        dto.setEmployeeId(employeeId);
        dto.setStartDate(LocalDate.of(2026, 9, 1));
        dto.setEndDate(LocalDate.of(2026, 9, 3));
        dto.setReason("Personal work");
        dto.setStatus(status);
        return dto;
    }

    // ---------------------------------------------------------
    // GET ALL
    // ---------------------------------------------------------

    @Test
    void shouldGetAllLeaveRequestsForAdmin() {
        LeaveRequest request = leaveRequest(1L, 10L, "PENDING");
        LeaveRequestResponseDTO response = new LeaveRequestResponseDTO();

        when(currentUserService.isEmployee()).thenReturn(false);
        when(leaveRequestRepository.findAll()).thenReturn(List.of(request));
        when(leaveRequestMapper.toResponseDTO(request)).thenReturn(response);

        List<LeaveRequestResponseDTO> result = leaveRequestService.getAllLeaveRequests();

        assertEquals(1, result.size());
        assertSame(response, result.get(0));

        verify(leaveRequestRepository).findAll();
        verify(leaveRequestMapper).toResponseDTO(request);
    }

    @Test
    void shouldGetOnlyOwnLeaveRequestsForEmployee() {
        LeaveRequest request = leaveRequest(1L, 10L, "PENDING");
        LeaveRequestResponseDTO response = new LeaveRequestResponseDTO();

        when(currentUserService.isEmployee()).thenReturn(true);
        when(currentUserService.getCurrentEmployeeId()).thenReturn(10L);
        when(leaveRequestRepository.findByEmployee_EmployeeId(10L))
                .thenReturn(List.of(request));
        when(leaveRequestMapper.toResponseDTO(request)).thenReturn(response);

        List<LeaveRequestResponseDTO> result = leaveRequestService.getAllLeaveRequests();

        assertEquals(1, result.size());
        verify(leaveRequestRepository)
                .findByEmployee_EmployeeId(10L);
        verify(leaveRequestRepository, never()).findAll();
    }

    // ---------------------------------------------------------
    // GET BY ID
    // ---------------------------------------------------------

    @Test
    void shouldReturnLeaveRequestById() {
        LeaveRequest request = leaveRequest(1L, 10L, "PENDING");
        LeaveRequestResponseDTO response = new LeaveRequestResponseDTO();

        when(leaveRequestRepository.findById(1L))
                .thenReturn(Optional.of(request));
        when(currentUserService.isEmployee()).thenReturn(false);
        when(leaveRequestMapper.toResponseDTO(request)).thenReturn(response);

        LeaveRequestResponseDTO result = leaveRequestService.getLeaveRequestById(1L);

        assertSame(response, result);
    }

    @Test
    void shouldReturnNullWhenLeaveRequestDoesNotExist() {
        when(leaveRequestRepository.findById(999L))
                .thenReturn(Optional.empty());

        LeaveRequestResponseDTO result = leaveRequestService.getLeaveRequestById(999L);

        assertNull(result);
    }

    @Test
    void employeeShouldNotAccessAnotherEmployeesLeaveRequest() {
        LeaveRequest request = leaveRequest(1L, 20L, "PENDING");

        when(leaveRequestRepository.findById(1L))
                .thenReturn(Optional.of(request));
        when(currentUserService.isEmployee()).thenReturn(true);
        when(currentUserService.getCurrentEmployeeId()).thenReturn(10L);

        assertThrows(
                AccessDeniedException.class,
                () -> leaveRequestService.getLeaveRequestById(1L));
    }

    // ---------------------------------------------------------
    // CREATE
    // ---------------------------------------------------------

    @Test
    void employeeShouldCreateOwnPendingLeaveRequest() {
        LeaveRequestDTO requestDTO = dto(10L, "APPROVED");
        LeaveRequest saved = leaveRequest(1L, 10L, "PENDING");
        LeaveRequestResponseDTO response = new LeaveRequestResponseDTO();

        when(currentUserService.isEmployee()).thenReturn(true);
        when(currentUserService.getCurrentEmployeeId()).thenReturn(10L);
        when(employeeRepository.findById(10L))
                .thenReturn(Optional.of(employee(10L)));
        when(leaveRequestRepository.save(any(LeaveRequest.class)))
                .thenReturn(saved);
        when(leaveRequestMapper.toResponseDTO(saved)).thenReturn(response);

        LeaveRequestResponseDTO result = leaveRequestService.createLeaveRequest(requestDTO);

        assertSame(response, result);

        verify(leaveRequestRepository).save(any(LeaveRequest.class));
        verify(auditLogRecorder).record(
                eq("CREATE"),
                eq("LeaveRequest"),
                eq(1L),
                isNull(),
                anyString());
    }

    @Test
    void adminShouldCreatePendingLeaveRequest() {
        LeaveRequestDTO requestDTO = dto(10L, "PENDING");
        LeaveRequest entity = leaveRequest(1L, 10L, "PENDING");
        LeaveRequestResponseDTO response = new LeaveRequestResponseDTO();

        when(currentUserService.isEmployee()).thenReturn(false);
        when(employeeRepository.findById(10L))
                .thenReturn(Optional.of(employee(10L)));
        when(leaveRequestMapper.toEntity(requestDTO)).thenReturn(entity);
        when(leaveRequestRepository.save(entity)).thenReturn(entity);
        when(leaveRequestMapper.toResponseDTO(entity)).thenReturn(response);

        LeaveRequestResponseDTO result = leaveRequestService.createLeaveRequest(requestDTO);

        assertSame(response, result);
        verify(leaveRequestRepository).save(entity);
    }

    @Test
    void adminApprovalRequiresApprovedBy() {
        LeaveRequestDTO requestDTO = dto(10L, "APPROVED");

        when(currentUserService.isEmployee()).thenReturn(false);
        when(employeeRepository.findById(10L))
                .thenReturn(Optional.of(employee(10L)));
        when(leaveRequestMapper.toEntity(requestDTO))
                .thenReturn(leaveRequest(1L, 10L, "APPROVED"));

        assertThrows(
                IllegalArgumentException.class,
                () -> leaveRequestService.createLeaveRequest(requestDTO));

        verify(leaveRequestRepository, never()).save(any());
    }

    @Test
    void onlyAdminCanApproveLeaveRequest() {
        LeaveRequestDTO requestDTO = dto(10L, "APPROVED");
        requestDTO.setApprovedBy(50L);

        User nonAdmin = new User();
        Role role = new Role();
        role.setRoleName("EMPLOYEE");
        nonAdmin.setRole(role);

        when(currentUserService.isEmployee()).thenReturn(false);
        when(employeeRepository.findById(10L))
                .thenReturn(Optional.of(employee(10L)));
        when(leaveRequestMapper.toEntity(requestDTO))
                .thenReturn(leaveRequest(1L, 10L, "APPROVED"));
        when(userRepository.findById(50L))
                .thenReturn(Optional.of(nonAdmin));

        assertThrows(
                IllegalArgumentException.class,
                () -> leaveRequestService.createLeaveRequest(requestDTO));

        verify(leaveRequestRepository, never()).save(any());
    }

    // ---------------------------------------------------------
    // UPDATE
    // ---------------------------------------------------------

    @Test
    void employeeShouldUpdateOwnPendingLeaveRequest() {
        LeaveRequest existing = leaveRequest(1L, 10L, "PENDING");
        LeaveRequestDTO requestDTO = dto(10L, "APPROVED");
        LeaveRequestResponseDTO response = new LeaveRequestResponseDTO();

        when(leaveRequestRepository.findById(1L))
                .thenReturn(Optional.of(existing));
        when(currentUserService.isEmployee()).thenReturn(true);
        when(currentUserService.getCurrentEmployeeId()).thenReturn(10L);
        when(leaveRequestRepository.save(existing)).thenReturn(existing);
        when(leaveRequestMapper.toResponseDTO(existing)).thenReturn(response);

        LeaveRequestResponseDTO result = leaveRequestService.updateLeaveRequest(1L, requestDTO);

        assertSame(response, result);
        assertEquals("PENDING", existing.getStatus());
        assertNull(existing.getApprovedBy());

        verify(auditLogRecorder).record(
                eq("UPDATE"),
                eq("LeaveRequest"),
                eq(1L),
                anyString(),
                anyString());
    }

    @Test
    void employeeCannotUpdateNonPendingLeaveRequest() {
        LeaveRequest existing = leaveRequest(1L, 10L, "APPROVED");

        when(leaveRequestRepository.findById(1L))
                .thenReturn(Optional.of(existing));
        when(currentUserService.isEmployee()).thenReturn(true);
        when(currentUserService.getCurrentEmployeeId()).thenReturn(10L);

        assertThrows(
                AccessDeniedException.class,
                () -> leaveRequestService.updateLeaveRequest(
                        1L,
                        dto(10L, "PENDING")));

        verify(leaveRequestRepository, never()).save(any());
    }

    // ---------------------------------------------------------
    // DELETE
    // ---------------------------------------------------------

    @Test
    void employeeShouldDeleteOwnPendingLeaveRequest() {
        LeaveRequest existing = leaveRequest(1L, 10L, "PENDING");

        when(leaveRequestRepository.findById(1L))
                .thenReturn(Optional.of(existing));
        when(currentUserService.isEmployee()).thenReturn(true);
        when(currentUserService.getCurrentEmployeeId()).thenReturn(10L);

        leaveRequestService.deleteLeaveRequest(1L);

        verify(leaveRequestRepository).delete(existing);
        verify(auditLogRecorder).record(
                eq("DELETE"),
                eq("LeaveRequest"),
                eq(1L),
                anyString(),
                isNull());
    }

    @Test
    void employeeCannotDeleteApprovedLeaveRequest() {
        LeaveRequest existing = leaveRequest(1L, 10L, "APPROVED");

        when(leaveRequestRepository.findById(1L))
                .thenReturn(Optional.of(existing));
        when(currentUserService.isEmployee()).thenReturn(true);
        when(currentUserService.getCurrentEmployeeId()).thenReturn(10L);

        assertThrows(
                AccessDeniedException.class,
                () -> leaveRequestService.deleteLeaveRequest(1L));

        verify(leaveRequestRepository, never()).delete(any());
    }

    @Test
    void adminShouldDeleteLeaveRequest() {
        LeaveRequest existing = leaveRequest(1L, 10L, "APPROVED");

        when(leaveRequestRepository.findById(1L))
                .thenReturn(Optional.of(existing));
        when(currentUserService.isEmployee()).thenReturn(false);

        leaveRequestService.deleteLeaveRequest(1L);

        verify(leaveRequestRepository).delete(existing);
        verify(auditLogRecorder).record(
                eq("DELETE"),
                eq("LeaveRequest"),
                eq(1L),
                anyString(),
                isNull());
    }
}