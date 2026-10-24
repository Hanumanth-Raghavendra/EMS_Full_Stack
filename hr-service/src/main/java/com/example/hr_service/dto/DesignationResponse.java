package com.example.hr_service.dto;

import com.example.hr_service.entity.Designation;

public record DesignationResponse(
        Long designationId,
        String designationName,
        Long departmentId,
        String departmentName,
        long employeeCount) {

    public static DesignationResponse from(Designation designation, long employeeCount) {
        return new DesignationResponse(
                designation.getDesignationId(),
                designation.getDesignationName(),
                designation.getDepartment() == null ? null : designation.getDepartment().getDepartmentId(),
                designation.getDepartment() == null ? null : designation.getDepartment().getDepartmentName(),
                employeeCount);
    }
}
