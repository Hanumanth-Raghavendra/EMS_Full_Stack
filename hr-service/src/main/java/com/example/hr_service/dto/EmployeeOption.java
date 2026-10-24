package com.example.hr_service.dto;

import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.EmployeeStatus;

import java.time.LocalDate;

/** Compact employee representation for dropdowns and dashboard lists. */
public record EmployeeOption(
        Long employeeId,
        String employeeCode,
        String fullName,
        String departmentName,
        String designationName,
        LocalDate dateOfJoining,
        EmployeeStatus status) {

    public static EmployeeOption from(Employee employee) {
        return new EmployeeOption(
                employee.getEmployeeId(),
                employee.getEmployeeCode(),
                employee.getFullName(),
                employee.getDepartment() == null ? null : employee.getDepartment().getDepartmentName(),
                employee.getDesignation() == null ? null : employee.getDesignation().getDesignationName(),
                employee.getDateOfJoining(),
                employee.getStatus());
    }
}
