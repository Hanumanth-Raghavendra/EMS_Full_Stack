package com.example.hr_service.repository;

import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.EmployeeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndEmployeeIdNot(String email, Long employeeId);

    boolean existsByEmployeeCodeIgnoreCase(String employeeCode);

    boolean existsByEmployeeCodeIgnoreCaseAndEmployeeIdNot(String employeeCode, Long employeeId);

    Optional<Employee> findFirstByEmployeeCodeIgnoreCase(String employeeCode);

    long countByStatus(EmployeeStatus status);

    long countByDepartment_DepartmentId(Long departmentId);

    long countByDesignation_DesignationId(Long designationId);

    /**
     * Paged search. {@code search} must be '' (no filter) or an already
     * lower-cased LIKE pattern such as '%anita%'.
     */
    @Query("""
            SELECT e FROM Employee e
            LEFT JOIN e.department d
            WHERE (:search = ''
                   OR LOWER(e.firstName) LIKE :search
                   OR LOWER(e.lastName) LIKE :search
                   OR LOWER(CONCAT(e.firstName, ' ', e.lastName)) LIKE :search
                   OR LOWER(e.email) LIKE :search
                   OR LOWER(e.employeeCode) LIKE :search)
              AND (:departmentId IS NULL OR d.departmentId = :departmentId)
              AND (:status IS NULL OR e.status = :status)
            """)
    Page<Employee> search(@Param("search") String search,
                          @Param("departmentId") Long departmentId,
                          @Param("status") EmployeeStatus status,
                          Pageable pageable);

    /** Lightweight list for dropdowns. */
    @Query("""
            SELECT e FROM Employee e
            WHERE (:status IS NULL OR e.status = :status)
              AND (:withoutAccount = false
                   OR NOT EXISTS (SELECT u FROM User u WHERE u.employee = e))
            ORDER BY e.firstName, e.lastName
            """)
    List<Employee> findOptions(@Param("status") EmployeeStatus status,
                               @Param("withoutAccount") boolean withoutAccount);

    @Query("""
            SELECT e.department.departmentId, COUNT(e) FROM Employee e
            WHERE e.department IS NOT NULL
            GROUP BY e.department.departmentId
            """)
    List<Object[]> countPerDepartment();

    @Query("""
            SELECT e.designation.designationId, COUNT(e) FROM Employee e
            WHERE e.designation IS NOT NULL
            GROUP BY e.designation.designationId
            """)
    List<Object[]> countPerDesignation();

    @Query("""
            SELECT d.departmentName, COUNT(e) FROM Employee e
            JOIN e.department d
            WHERE e.status = :status
            GROUP BY d.departmentName
            ORDER BY COUNT(e) DESC, d.departmentName
            """)
    List<Object[]> headcountByDepartment(@Param("status") EmployeeStatus status);

    List<Employee> findTop5ByDateOfJoiningLessThanEqualOrderByDateOfJoiningDescEmployeeIdDesc(LocalDate date);

    // ---- cascading clean-up used when an employee record is deleted ----

    @Modifying
    @Query(value = "DELETE FROM employee_projects WHERE employee_id = :employeeId", nativeQuery = true)
    int deleteEmployeeProjectAssignments(@Param("employeeId") Long employeeId);

    @Modifying
    @Query(value = "DELETE FROM attendance WHERE employee_id = :employeeId", nativeQuery = true)
    int deleteAttendanceRecords(@Param("employeeId") Long employeeId);

    @Modifying
    @Query(value = """
            UPDATE leave_requests SET approved_by = NULL
            WHERE approved_by IN (SELECT user_id FROM users WHERE employee_id = :employeeId)
            """, nativeQuery = true)
    int clearLeaveApprovals(@Param("employeeId") Long employeeId);

    @Modifying
    @Query(value = "DELETE FROM leave_requests WHERE employee_id = :employeeId", nativeQuery = true)
    int deleteLeaveRequests(@Param("employeeId") Long employeeId);

    /**
     * Flushes before and clears the persistence context after: the account
     * may already be loaded as an entity, and a stale managed User pointing
     * at the employee being removed would make the next flush fail.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM users WHERE employee_id = :employeeId", nativeQuery = true)
    int deleteUsersForEmployee(@Param("employeeId") Long employeeId);
}
