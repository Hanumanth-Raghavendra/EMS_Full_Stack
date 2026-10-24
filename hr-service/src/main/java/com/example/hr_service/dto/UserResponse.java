package com.example.hr_service.dto;

import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.entity.User;

import java.time.LocalDateTime;

public record UserResponse(
        Long userId,
        String username,
        Long employeeId,
        String employeeCode,
        String employeeName,
        SystemRole role,
        boolean enabled,
        boolean employeeActive,
        LocalDateTime lastLoginAt,
        LocalDateTime createdAt,
        boolean canManage,
        boolean self) {

    public static UserResponse from(User user, boolean canManage, boolean self) {
        Employee employee = user.getEmployee();
        return new UserResponse(
                user.getUserId(),
                user.getUsername(),
                employee.getEmployeeId(),
                employee.getEmployeeCode(),
                employee.getFullName(),
                user.getSystemRole(),
                Boolean.TRUE.equals(user.getEnabled()),
                employee.isActive(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                canManage,
                self);
    }
}
