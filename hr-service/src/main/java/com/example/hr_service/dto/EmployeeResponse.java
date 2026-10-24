package com.example.hr_service.dto;

import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.EmployeeStatus;
import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.entity.User;

import java.time.LocalDate;

public record EmployeeResponse(
        Long employeeId,
        String employeeCode,
        String firstName,
        String lastName,
        String fullName,
        String email,
        String phone,
        LocalDate dateOfJoining,
        Long departmentId,
        String departmentName,
        Long designationId,
        String designationName,
        EmployeeStatus status,
        String username,
        SystemRole accountRole,
        boolean canManage) {

    public static EmployeeResponse from(Employee employee, User account, boolean canManage) {
        return new EmployeeResponse(
                employee.getEmployeeId(),
                employee.getEmployeeCode(),
                employee.getFirstName(),
                employee.getLastName(),
                employee.getFullName(),
                employee.getEmail(),
                employee.getPhone(),
                employee.getDateOfJoining(),
                employee.getDepartment() == null ? null : employee.getDepartment().getDepartmentId(),
                employee.getDepartment() == null ? null : employee.getDepartment().getDepartmentName(),
                employee.getDesignation() == null ? null : employee.getDesignation().getDesignationId(),
                employee.getDesignation() == null ? null : employee.getDesignation().getDesignationName(),
                employee.getStatus(),
                account == null ? null : account.getUsername(),
                account == null ? null : account.getSystemRole(),
                canManage);
    }
}
