package com.example.hr_service.dto;

import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.entity.User;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record CurrentUserResponse(
        Long userId,
        String username,
        SystemRole role,
        Long employeeId,
        String employeeCode,
        String fullName,
        String email,
        String phone,
        String departmentName,
        String designationName,
        LocalDate dateOfJoining,
        LocalDateTime lastLoginAt) {

    public static CurrentUserResponse from(User user) {
        Employee employee = user.getEmployee();
        return new CurrentUserResponse(
                user.getUserId(),
                user.getUsername(),
                user.getSystemRole(),
                employee.getEmployeeId(),
                employee.getEmployeeCode(),
                employee.getFullName(),
                employee.getEmail(),
                employee.getPhone(),
                employee.getDepartment() == null ? null : employee.getDepartment().getDepartmentName(),
                employee.getDesignation() == null ? null : employee.getDesignation().getDesignationName(),
                employee.getDateOfJoining(),
                user.getLastLoginAt());
    }
}
