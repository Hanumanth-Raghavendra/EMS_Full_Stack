package com.example.hr_service.repository;

import com.example.hr_service.entity.EmployeeProject;
import com.example.hr_service.entity.EmployeeProjectId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeProjectRepository
        extends JpaRepository<EmployeeProject, EmployeeProjectId> {

    List<EmployeeProject> findByEmployee_EmployeeId(Long employeeId);
}