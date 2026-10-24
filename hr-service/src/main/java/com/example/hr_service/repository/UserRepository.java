package com.example.hr_service.repository;

import com.example.hr_service.entity.EmployeeStatus;
import com.example.hr_service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findFirstByUsernameIgnoreCaseOrderByUserIdAsc(String username);

    /** Exact match first, then case-insensitive (usernames are unique ignoring case). */
    default Optional<User> findForLogin(String username) {
        if (username == null || username.isBlank()) {
            return Optional.empty();
        }
        String trimmed = username.trim();
        Optional<User> exact = findByUsername(trimmed);
        return exact.isPresent() ? exact : findFirstByUsernameIgnoreCaseOrderByUserIdAsc(trimmed);
    }

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCaseAndUserIdNot(String username, Long userId);

    boolean existsByEmployee_EmployeeId(Long employeeId);

    Optional<User> findFirstByEmployee_EmployeeId(Long employeeId);

    List<User> findByEmployee_EmployeeIdIn(Collection<Long> employeeIds);

    @Query("SELECT COUNT(u) FROM User u WHERE UPPER(u.role.roleName) = UPPER(:roleName)")
    long countByRoleName(@Param("roleName") String roleName);

    /** Administrators who can actually sign in right now. */
    @Query("""
            SELECT COUNT(u) FROM User u
            WHERE UPPER(u.role.roleName) = 'ADMIN'
              AND u.enabled = true
              AND u.employee.status = :active
            """)
    long countUsableAdmins(@Param("active") EmployeeStatus active);

    long countByRole_RoleId(Long roleId);

    @Query("""
            SELECT u FROM User u
            WHERE (:search = ''
                   OR LOWER(u.username) LIKE :search
                   OR LOWER(u.employee.firstName) LIKE :search
                   OR LOWER(u.employee.lastName) LIKE :search
                   OR LOWER(u.employee.employeeCode) LIKE :search)
            ORDER BY u.userId
            """)
    List<User> search(@Param("search") String search);

    @Modifying
    @Query(value = "UPDATE leave_requests SET approved_by = NULL WHERE approved_by = :userId", nativeQuery = true)
    int clearLeaveReviews(@Param("userId") Long userId);
}
