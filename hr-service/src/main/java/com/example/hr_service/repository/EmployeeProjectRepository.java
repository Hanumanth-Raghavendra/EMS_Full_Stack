package com.example.hr_service.repository;

import com.example.hr_service.entity.EmployeeProject;
import com.example.hr_service.entity.EmployeeProjectId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmployeeProjectRepository extends JpaRepository<EmployeeProject, EmployeeProjectId> {

    List<EmployeeProject> findByEmployee_EmployeeId(Long employeeId);

    long countByEmployee_EmployeeId(Long employeeId);

    @Query("""
            SELECT ep FROM EmployeeProject ep
            WHERE (:employeeId IS NULL OR ep.employee.employeeId = :employeeId)
              AND (:projectId IS NULL OR ep.project.projectId = :projectId)
            ORDER BY ep.project.projectName, ep.employee.firstName, ep.employee.lastName
            """)
    List<EmployeeProject> search(@Param("employeeId") Long employeeId, @Param("projectId") Long projectId);

    @Query("SELECT ep.project.projectId, COUNT(ep) FROM EmployeeProject ep GROUP BY ep.project.projectId")
    List<Object[]> countPerProject();
}
