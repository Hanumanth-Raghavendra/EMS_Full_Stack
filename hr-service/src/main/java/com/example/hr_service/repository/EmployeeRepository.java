package com.example.hr_service.repository;

import com.example.hr_service.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmployeeRepository
                extends JpaRepository<Employee, Long> {

        boolean existsByEmail(String email);

        boolean existsByEmployeeCode(String employeeCode);

        @Query("""
                        SELECT e
                        FROM Employee e
                        WHERE
                            LOWER(e.employeeCode) LIKE LOWER(CONCAT('%', :search, '%'))
                            OR LOWER(e.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                            OR LOWER(e.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
                            OR LOWER(e.email) LIKE LOWER(CONCAT('%', :search, '%'))
                        ORDER BY e.employeeId
                        """)
        List<Employee> searchEmployees(
                        @Param("search") String search);

        @Modifying
        @Query(value = "DELETE FROM employee_projects WHERE employee_id = :employeeId", nativeQuery = true)
        int deleteEmployeeProjectAssignments(@Param("employeeId") Long employeeId);

        @Modifying
        @Query(value = "DELETE FROM attendance WHERE employee_id = :employeeId", nativeQuery = true)
        int deleteAttendanceRecords(@Param("employeeId") Long employeeId);

        @Modifying
        @Query(value = "UPDATE leave_requests SET approved_by = NULL WHERE approved_by IN (SELECT user_id FROM users WHERE employee_id = :employeeId)", nativeQuery = true)
        int clearLeaveApprovals(@Param("employeeId") Long employeeId);

        @Modifying
        @Query(value = "DELETE FROM leave_requests WHERE employee_id = :employeeId", nativeQuery = true)
        int deleteLeaveRequests(@Param("employeeId") Long employeeId);

        @Modifying
        @Query(value = "DELETE FROM users WHERE employee_id = :employeeId", nativeQuery = true)
        int deleteUsersForEmployee(@Param("employeeId") Long employeeId);
}