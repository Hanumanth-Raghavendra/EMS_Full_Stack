package com.example.hr_service.repository;

import com.example.hr_service.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Modifying
    @Query(value = "DELETE FROM employee_projects WHERE project_id = :projectId", nativeQuery = true)
    int deleteEmployeeProjectAssignments(@Param("projectId") Long projectId);
}