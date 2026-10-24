package com.example.hr_service.dto;

import com.example.hr_service.entity.Project;
import com.example.hr_service.entity.ProjectStatus;

import java.time.LocalDate;

public record ProjectResponse(
        Long projectId,
        String projectName,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        ProjectStatus status,
        long memberCount) {

    public static ProjectResponse from(Project project, long memberCount) {
        return new ProjectResponse(
                project.getProjectId(),
                project.getProjectName(),
                project.getDescription(),
                project.getStartDate(),
                project.getEndDate(),
                project.getStatus(),
                memberCount);
    }
}
