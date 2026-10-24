package com.example.hr_service.repository;

import com.example.hr_service.entity.Attendance;
import com.example.hr_service.entity.AttendanceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    Optional<Attendance> findByEmployee_EmployeeIdAndAttendanceDate(Long employeeId, LocalDate attendanceDate);

    boolean existsByEmployee_EmployeeIdAndAttendanceDate(Long employeeId, LocalDate attendanceDate);

    boolean existsByEmployee_EmployeeIdAndAttendanceDateAndAttendanceIdNot(
            Long employeeId, LocalDate attendanceDate, Long attendanceId);

    @Query("""
            SELECT a FROM Attendance a
            WHERE (:employeeId IS NULL OR a.employee.employeeId = :employeeId)
              AND (:status IS NULL OR a.status = :status)
              AND a.attendanceDate >= :from
              AND a.attendanceDate <= :to
            """)
    Page<Attendance> search(@Param("employeeId") Long employeeId,
                            @Param("status") AttendanceStatus status,
                            @Param("from") LocalDate from,
                            @Param("to") LocalDate to,
                            Pageable pageable);

    @Query("""
            SELECT a.status, COUNT(a) FROM Attendance a
            WHERE a.attendanceDate = :date
            GROUP BY a.status
            """)
    List<Object[]> countByStatusOn(@Param("date") LocalDate date);

    @Query("""
            SELECT a.attendanceDate, a.status, COUNT(a) FROM Attendance a
            WHERE a.attendanceDate >= :from AND a.attendanceDate <= :to
            GROUP BY a.attendanceDate, a.status
            """)
    List<Object[]> countByDayAndStatus(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("""
            SELECT a.status, COUNT(a) FROM Attendance a
            WHERE a.employee.employeeId = :employeeId
              AND a.attendanceDate >= :from AND a.attendanceDate <= :to
            GROUP BY a.status
            """)
    List<Object[]> countByStatusForEmployee(@Param("employeeId") Long employeeId,
                                            @Param("from") LocalDate from,
                                            @Param("to") LocalDate to);

    @Query("""
            SELECT a.attendanceDate FROM Attendance a
            WHERE a.employee.employeeId = :employeeId
              AND a.attendanceDate >= :from AND a.attendanceDate <= :to
            """)
    List<LocalDate> findDatesForEmployee(@Param("employeeId") Long employeeId,
                                         @Param("from") LocalDate from,
                                         @Param("to") LocalDate to);

    @Modifying
    @Query("""
            DELETE FROM Attendance a
            WHERE a.employee.employeeId = :employeeId
              AND a.status = :status
              AND a.attendanceDate >= :from AND a.attendanceDate <= :to
            """)
    int deleteByEmployeeStatusAndRange(@Param("employeeId") Long employeeId,
                                       @Param("status") AttendanceStatus status,
                                       @Param("from") LocalDate from,
                                       @Param("to") LocalDate to);
}
