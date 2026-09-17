package com.example.hr_service.service;

import com.example.hr_service.entity.Employee;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.security.CurrentUserService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.hr_service.exception.ResourceNotFoundException;

import java.util.List;

@Service
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final CurrentUserService currentUserService;
    private final AuditLogRecorder auditLogRecorder;

    public EmployeeServiceImpl(
            EmployeeRepository employeeRepository,
            CurrentUserService currentUserService,
            AuditLogRecorder auditLogRecorder) {

        this.employeeRepository = employeeRepository;
        this.currentUserService = currentUserService;
        this.auditLogRecorder = auditLogRecorder;
    }

    @Override
    public List<Employee> getAllEmployees() {
        if (currentUserService.isEmployee()) {
            return List.of(getEmployeeById(currentUserService.getCurrentEmployeeId()));
        }

        return employeeRepository.findAll();
    }

    @Override
    public List<Employee> searchEmployees(String search) {
        if (currentUserService.isEmployee()) {
            Employee own = getEmployeeById(currentUserService.getCurrentEmployeeId());
            if (search == null || search.trim().isEmpty()) {
                return List.of(own);
            }

            String q = search.trim().toLowerCase();
            boolean matches = String.valueOf(own.getEmployeeId()).contains(q)
                    || contains(own.getEmployeeCode(), q)
                    || contains(own.getFirstName(), q)
                    || contains(own.getLastName(), q)
                    || contains(own.getEmail(), q);

            return matches ? List.of(own) : List.of();
        }

        if (search == null || search.trim().isEmpty()) {
            return employeeRepository.findAll();
        }

        return employeeRepository.searchEmployees(search.trim());
    }

    @Override
    public Employee getEmployeeById(Long employeeId) {
        currentUserService.requireOwnEmployee(employeeId);

        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }

    @Override
    public Employee createEmployee(Employee employee) {
        if (currentUserService.isEmployee()) {
            throw new AccessDeniedException("Employees cannot create employee records.");
        }
        Employee saved = employeeRepository.save(employee);

        auditLogRecorder.record(
                "CREATE",
                "Employee",
                saved.getEmployeeId(),
                null,
                formatEmployee(saved));

        return saved;
    }

    @Override
    public Employee updateEmployee(
            Long employeeId,
            Employee employee) {

        Employee existing = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        if (currentUserService.isEmployee()) {
            currentUserService.requireOwnEmployee(employeeId);

            String oldValue = String.format(
                    "email=%s, phone=%s",
                    existing.getEmail(),
                    existing.getPhone());

            // EMPLOYEE can only change personal contact details.
            existing.setEmail(employee.getEmail());
            existing.setPhone(employee.getPhone());

            Employee updated = employeeRepository.save(existing);

            String newValue = String.format(
                    "email=%s, phone=%s",
                    updated.getEmail(),
                    updated.getPhone());

            auditLogRecorder.record(
                    "UPDATE",
                    "Employee",
                    updated.getEmployeeId(),
                    oldValue,
                    newValue);

            return updated;
        }

        String oldValue = formatEmployee(existing);

        existing.setEmployeeCode(employee.getEmployeeCode());
        existing.setFirstName(employee.getFirstName());
        existing.setLastName(employee.getLastName());
        existing.setEmail(employee.getEmail());
        existing.setPhone(employee.getPhone());
        existing.setDateOfJoining(employee.getDateOfJoining());
        existing.setDepartment(employee.getDepartment());
        existing.setDesignation(employee.getDesignation());
        existing.setStatus(employee.getStatus());

        Employee updated = employeeRepository.save(existing);

        auditLogRecorder.record(
                "UPDATE",
                "Employee",
                updated.getEmployeeId(),
                oldValue,
                formatEmployee(updated));

        return updated;
    }

    @Override
    @Transactional
    public void deleteEmployee(Long employeeId) {
        if (currentUserService.isEmployee()) {
            throw new AccessDeniedException("Employees cannot delete employee records.");
        }

        if (!employeeRepository.existsById(employeeId)) {
            throw new ResourceNotFoundException("Employee not found");
        }

        Employee existing = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        String oldValue = formatEmployee(existing);

        employeeRepository.deleteEmployeeProjectAssignments(employeeId);
        employeeRepository.deleteAttendanceRecords(employeeId);
        employeeRepository.clearLeaveApprovals(employeeId);
        employeeRepository.deleteLeaveRequests(employeeId);
        employeeRepository.deleteUsersForEmployee(employeeId);
        employeeRepository.deleteById(employeeId);

        auditLogRecorder.record(
                "DELETE",
                "Employee",
                employeeId,
                oldValue,
                null);
    }

    private String formatEmployee(Employee employee) {
        return String.format(
                "%s - %s %s | %s | %s | %s",
                employee.getEmployeeCode(),
                employee.getFirstName(),
                employee.getLastName(),
                employee.getEmail(),
                employee.getDepartment() != null ? employee.getDepartment().getDepartmentName() : "",
                employee.getDesignation() != null ? employee.getDesignation().getDesignationName() : "");
    }

    private boolean contains(String value, String query) {
        return value != null && value.toLowerCase().contains(query);
    }
}
