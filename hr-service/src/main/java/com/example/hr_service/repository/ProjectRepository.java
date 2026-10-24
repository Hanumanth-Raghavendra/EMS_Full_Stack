package com.example.hr_service.repository;

import com.example.hr_service.entity.Project;
import com.example.hr_service.entity.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    boolean existsByProjectNameIgnoreCase(String projectName);

    boolean existsByProjectNameIgnoreCaseAndProjectIdNot(String projectName, Long projectId);

    long countByStatus(ProjectStatus status);

    @Query("""
            SELECT p FROM Project p
            WHERE (:search = '' OR LOWER(p.projectName) LIKE :search OR LOWER(p.description) LIKE :search)
              AND (:status IS NULL OR p.status = :status)
            ORDER BY p.projectId
            """)
    List<Project> search(@Param("search") String search, @Param("status") ProjectStatus status);

    @Modifying
    @Query(value = "DELETE FROM employee_projects WHERE project_id = :projectId", nativeQuery = true)
    int deleteEmployeeProjectAssignments(@Param("projectId") Long projectId);
}
