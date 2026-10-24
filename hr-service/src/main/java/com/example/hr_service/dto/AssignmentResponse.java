package com.example.hr_service.dto;

import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.EmployeeProject;
import com.example.hr_service.entity.Project;
import com.example.hr_service.entity.ProjectStatus;

import java.time.LocalDateTime;

public record AssignmentResponse(
        Long employeeId,
        String employeeCode,
        String employeeName,
        Long projectId,
        String projectName,
        ProjectStatus projectStatus,
        String roleInProject,
        LocalDateTime assignedAt) {

    public static AssignmentResponse from(EmployeeProject assignment) {
        Employee employee = assignment.getEmployee();
        Project project = assignment.getProject();
        return new AssignmentResponse(
                employee.getEmployeeId(),
                employee.getEmployeeCode(),
                employee.getFullName(),
                project.getProjectId(),
                project.getProjectName(),
                project.getStatus(),
                assignment.getRoleInProject(),
                assignment.getAssignedAt());
    }
}
