package com.example.hr_service;

import com.example.hr_service.entity.Employee;
import com.example.hr_service.exception.ResourceNotFoundException;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.security.CurrentUserService;
import com.example.hr_service.service.AuditLogRecorder;
import com.example.hr_service.service.EmployeeServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceImplTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private AuditLogRecorder auditLogRecorder;

    @InjectMocks
    private EmployeeServiceImpl employeeService;

    @Test
    void getEmployeeById_whenEmployeeExists_returnsEmployee() {
        Long employeeId = 1L;
        Employee employee = new Employee();

        when(employeeRepository.findById(employeeId))
                .thenReturn(Optional.of(employee));

        Employee result = employeeService.getEmployeeById(employeeId);

        assertEquals(employee, result);
        verify(currentUserService).requireOwnEmployee(employeeId);
        verify(employeeRepository).findById(employeeId);
    }

    @Test
    void getEmployeeById_whenEmployeeDoesNotExist_throwsException() {
        Long employeeId = 999L;

        when(employeeRepository.findById(employeeId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> employeeService.getEmployeeById(employeeId));

        verify(currentUserService).requireOwnEmployee(employeeId);
        verify(employeeRepository).findById(employeeId);
    }

    @Test
    void getAllEmployees_whenAdmin_returnsAllEmployees() {
        Employee first = new Employee();
        Employee second = new Employee();

        when(currentUserService.isEmployee()).thenReturn(false);
        when(employeeRepository.findAll())
                .thenReturn(List.of(first, second));

        List<Employee> result = employeeService.getAllEmployees();

        assertEquals(2, result.size());
        verify(employeeRepository).findAll();
    }

    @Test
    void getAllEmployees_whenEmployee_returnsOnlyOwnEmployee() {
        Long employeeId = 5L;
        Employee employee = new Employee();

        when(currentUserService.isEmployee()).thenReturn(true);
        when(currentUserService.getCurrentEmployeeId()).thenReturn(employeeId);
        when(employeeRepository.findById(employeeId))
                .thenReturn(Optional.of(employee));

        List<Employee> result = employeeService.getAllEmployees();

        assertEquals(List.of(employee), result);
        verify(employeeRepository).findById(employeeId);
    }

    @Test
    void searchEmployees_whenAdminAndSearchIsBlank_returnsAllEmployees() {
        Employee employee = new Employee();

        when(currentUserService.isEmployee()).thenReturn(false);
        when(employeeRepository.findAll())
                .thenReturn(List.of(employee));

        List<Employee> result = employeeService.searchEmployees("   ");

        assertEquals(List.of(employee), result);
        verify(employeeRepository).findAll();
        verify(employeeRepository, never()).searchEmployees(any());
    }

    @Test
    void searchEmployees_whenAdminAndSearchProvided_usesRepositorySearch() {
        Employee employee = new Employee();

        when(currentUserService.isEmployee()).thenReturn(false);
        when(employeeRepository.searchEmployees("john"))
                .thenReturn(List.of(employee));

        List<Employee> result = employeeService.searchEmployees("  john  ");

        assertEquals(List.of(employee), result);
        verify(employeeRepository).searchEmployees("john");
    }

    @Test
    void searchEmployees_whenEmployeeSearchMatchesOwnRecord_returnsOwnRecord() {
        Long employeeId = 5L;
        Employee employee = new Employee();
        employee.setEmployeeId(employeeId);
        employee.setFirstName("John");
        employee.setLastName("Smith");

        when(currentUserService.isEmployee()).thenReturn(true);
        when(currentUserService.getCurrentEmployeeId()).thenReturn(employeeId);
        when(employeeRepository.findById(employeeId))
                .thenReturn(Optional.of(employee));

        List<Employee> result = employeeService.searchEmployees("john");

        assertEquals(List.of(employee), result);
    }

    @Test
    void searchEmployees_whenEmployeeSearchDoesNotMatch_returnsEmptyList() {
        Long employeeId = 5L;
        Employee employee = new Employee();
        employee.setEmployeeId(employeeId);
        employee.setFirstName("John");

        when(currentUserService.isEmployee()).thenReturn(true);
        when(currentUserService.getCurrentEmployeeId()).thenReturn(employeeId);
        when(employeeRepository.findById(employeeId))
                .thenReturn(Optional.of(employee));

        List<Employee> result = employeeService.searchEmployees("xyz");

        assertEquals(List.of(), result);
    }

    @Test
    void createEmployee_whenAdmin_savesAndRecordsAudit() {
        Employee employee = new Employee();
        employee.setEmployeeId(10L);

        when(currentUserService.isEmployee()).thenReturn(false);
        when(employeeRepository.save(employee))
                .thenReturn(employee);

        Employee result = employeeService.createEmployee(employee);

        assertEquals(employee, result);
        verify(employeeRepository).save(employee);
        verify(auditLogRecorder).record(
                eq("CREATE"),
                eq("Employee"),
                eq(10L),
                isNull(),
                any(String.class));
    }

    @Test
    void createEmployee_whenEmployee_throwsAccessDenied() {
        when(currentUserService.isEmployee()).thenReturn(true);

        assertThrows(
                AccessDeniedException.class,
                () -> employeeService.createEmployee(new Employee()));

        verify(employeeRepository, never()).save(any());
        verifyNoInteractions(auditLogRecorder);
    }

    @Test
    void deleteEmployee_whenEmployee_throwsAccessDenied() {
        when(currentUserService.isEmployee()).thenReturn(true);

        assertThrows(
                AccessDeniedException.class,
                () -> employeeService.deleteEmployee(1L));

        verify(employeeRepository, never()).deleteById(any());
    }

    @Test
    void deleteEmployee_whenEmployeeDoesNotExist_throwsNotFound() {
        when(currentUserService.isEmployee()).thenReturn(false);
        when(employeeRepository.existsById(999L))
                .thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> employeeService.deleteEmployee(999L));

        verify(employeeRepository, never()).deleteById(any());
    }

    @Test
    void deleteEmployee_whenAdminAndEmployeeExists_deletesAndRecordsAudit() {
        Long employeeId = 1L;
        Employee employee = new Employee();
        employee.setEmployeeId(employeeId);

        when(currentUserService.isEmployee()).thenReturn(false);
        when(employeeRepository.existsById(employeeId))
                .thenReturn(true);
        when(employeeRepository.findById(employeeId))
                .thenReturn(Optional.of(employee));

        employeeService.deleteEmployee(employeeId);

        verify(employeeRepository).deleteById(employeeId);
        verify(auditLogRecorder).record(
                eq("DELETE"),
                eq("Employee"),
                eq(employeeId),
                any(String.class),
                isNull());
    }
}