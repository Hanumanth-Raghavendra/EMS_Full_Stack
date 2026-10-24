package com.example.hr_service.dto;

import com.example.hr_service.entity.Department;

public record DepartmentResponse(
        Long departmentId,
        String departmentName,
        String description,
        long employeeCount,
        long designationCount) {

    public static DepartmentResponse from(Department department, long employeeCount, long designationCount) {
        return new DepartmentResponse(
                department.getDepartmentId(),
                department.getDepartmentName(),
                department.getDescription(),
                employeeCount,
                designationCount);
    }
}
