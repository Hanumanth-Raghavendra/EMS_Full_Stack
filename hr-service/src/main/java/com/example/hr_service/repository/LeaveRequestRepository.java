package com.example.hr_service.repository;

import com.example.hr_service.entity.LeaveRequest;
import com.example.hr_service.entity.LeaveStatus;
import com.example.hr_service.entity.LeaveType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    @Query("""
            SELECT l FROM LeaveRequest l
            WHERE (:employeeId IS NULL OR l.employee.employeeId = :employeeId)
              AND (:status IS NULL OR l.status = :status)
              AND (:leaveType IS NULL OR l.leaveType = :leaveType)
              AND l.endDate >= :from
              AND l.startDate <= :to
            """)
    Page<LeaveRequest> search(@Param("employeeId") Long employeeId,
                              @Param("status") LeaveStatus status,
                              @Param("leaveType") LeaveType leaveType,
                              @Param("from") LocalDate from,
                              @Param("to") LocalDate to,
                              Pageable pageable);

    /** Requests of one employee, in the given statuses, that overlap [start, end]. */
    @Query("""
            SELECT l FROM LeaveRequest l
            WHERE l.employee.employeeId = :employeeId
              AND l.status IN :statuses
              AND l.startDate <= :end
              AND l.endDate >= :start
            """)
    List<LeaveRequest> findOverlapping(@Param("employeeId") Long employeeId,
                                       @Param("statuses") Collection<LeaveStatus> statuses,
                                       @Param("start") LocalDate start,
                                       @Param("end") LocalDate end);

    long countByStatus(LeaveStatus status);

    long countByEmployee_EmployeeIdAndStatus(Long employeeId, LeaveStatus status);

    /** Approved leave that is ongoing or starts within the window. */
    @Query("""
            SELECT l FROM LeaveRequest l
            WHERE l.status = :status
              AND l.endDate >= :from
              AND l.startDate <= :to
            ORDER BY l.startDate, l.leaveId
            """)
    List<LeaveRequest> findInWindow(@Param("status") LeaveStatus status,
                                    @Param("from") LocalDate from,
                                    @Param("to") LocalDate to);

    @Query("""
            SELECT l FROM LeaveRequest l
            WHERE l.employee.employeeId = :employeeId
              AND l.status IN :statuses
              AND l.endDate >= :from
            ORDER BY l.startDate
            """)
    List<LeaveRequest> findUpcomingForEmployee(@Param("employeeId") Long employeeId,
                                               @Param("statuses") Collection<LeaveStatus> statuses,
                                               @Param("from") LocalDate from);

    List<LeaveRequest> findTop5ByStatusOrderByAppliedAtAscLeaveIdAsc(LeaveStatus status);
}
