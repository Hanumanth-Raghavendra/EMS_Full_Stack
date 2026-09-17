package com.example.hr_service.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
public class EmployeeProjectId implements Serializable {

    private Long employeeId;
    private Long projectId;

    public EmployeeProjectId() {
    }

    public EmployeeProjectId(Long employeeId, Long projectId) {
        this.employeeId = employeeId;
        this.projectId = projectId;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }
}