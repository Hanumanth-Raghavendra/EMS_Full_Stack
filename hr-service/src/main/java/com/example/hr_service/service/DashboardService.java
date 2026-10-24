package com.example.hr_service.service;

import com.example.hr_service.dto.DashboardResponse;
import com.example.hr_service.dto.EmployeeOption;
import com.example.hr_service.entity.AttendanceStatus;
import com.example.hr_service.entity.EmployeeStatus;
import com.example.hr_service.entity.LeaveStatus;
import com.example.hr_service.entity.ProjectStatus;
import com.example.hr_service.repository.AttendanceRepository;
import com.example.hr_service.repository.DepartmentRepository;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.LeaveRequestRepository;
import com.example.hr_service.repository.ProjectRepository;
import com.example.hr_service.security.CurrentUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Aggregates for the dashboard, computed with a handful of grouped queries. */
@Service
public class DashboardService {

    private static final int TREND_DAYS = 7;

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final ProjectRepository projectRepository;
    private final LeaveRequestRepository leaveRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceService attendanceService;
    private final LeaveService leaveService;
    private final ProjectService projectService;
    private final CurrentUserService currentUser;
    private final Clock clock;

    public DashboardService(EmployeeRepository employeeRepository,
                            DepartmentRepository departmentRepository,
                            ProjectRepository projectRepository,
                            LeaveRequestRepository leaveRepository,
                            AttendanceRepository attendanceRepository,
                            AttendanceService attendanceService,
                            LeaveService leaveService,
                            ProjectService projectService,
                            CurrentUserService currentUser,
                            Clock clock) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.projectRepository = projectRepository;
        this.leaveRepository = leaveRepository;
        this.attendanceRepository = attendanceRepository;
        this.attendanceService = attendanceService;
        this.leaveService = leaveService;
        this.projectService = projectService;
        this.currentUser = currentUser;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DashboardResponse summary() {
        LocalDate today = LocalDate.now(clock);
        return new DashboardResponse(today, personal(today), currentUser.isManager() ? organization(today) : null);
    }

    private DashboardResponse.Personal personal(LocalDate today) {
        Long employeeId = currentUser.getCurrentEmployeeId();
        return new DashboardResponse.Personal(
                attendanceService.todayFor(employeeId),
                leaveService.balanceFor(employeeId, today.getYear()).balances(),
                leaveRepository.countByEmployee_EmployeeIdAndStatus(employeeId, LeaveStatus.PENDING),
                leaveService.upcomingFor(employeeId),
                projectService.activeProjectCountFor(employeeId),
                attendanceService.countsForEmployee(employeeId, today.withDayOfMonth(1), today));
    }

    private DashboardResponse.Organization organization(LocalDate today) {
        long active = employeeRepository.countByStatus(EmployeeStatus.ACTIVE);

        Map<String, Long> todayCounts = new LinkedHashMap<>();
        for (AttendanceStatus status : AttendanceStatus.values()) {
            todayCounts.put(status.name(), 0L);
        }
        long marked = 0;
        for (Object[] row : attendanceRepository.countByStatusOn(today)) {
            long count = ((Number) row[1]).longValue();
            todayCounts.put(((AttendanceStatus) row[0]).name(), count);
            marked += count;
        }
        todayCounts.put("NOT_MARKED", Math.max(0, active - marked));

        List<DashboardResponse.NameCount> headcount = new ArrayList<>();
        for (Object[] row : employeeRepository.headcountByDepartment(EmployeeStatus.ACTIVE)) {
            headcount.add(new DashboardResponse.NameCount((String) row[0], ((Number) row[1]).longValue()));
        }

        LocalDate weekEnd = today.plusDays(6);
        return new DashboardResponse.Organization(
                employeeRepository.count(),
                active,
                departmentRepository.count(),
                projectRepository.countByStatus(ProjectStatus.ACTIVE),
                leaveRepository.countByStatus(LeaveStatus.PENDING),
                todayCounts,
                headcount,
                trend(today),
                leaveService.map(leaveRepository.findTop5ByStatusOrderByAppliedAtAscLeaveIdAsc(LeaveStatus.PENDING)),
                leaveService.map(leaveRepository.findInWindow(LeaveStatus.APPROVED, today, weekEnd)),
                employeeRepository.findTop5ByDateOfJoiningLessThanEqualOrderByDateOfJoiningDescEmployeeIdDesc(today)
                        .stream().map(EmployeeOption::from).toList());
    }

    private List<DashboardResponse.DailyAttendance> trend(LocalDate today) {
        LocalDate from = today.minusDays(TREND_DAYS - 1L);
        Map<LocalDate, Map<AttendanceStatus, Long>> byDay = new HashMap<>();
        for (Object[] row : attendanceRepository.countByDayAndStatus(from, today)) {
            byDay.computeIfAbsent((LocalDate) row[0], day -> new EnumMap<>(AttendanceStatus.class))
                    .put((AttendanceStatus) row[1], ((Number) row[2]).longValue());
        }
        List<DashboardResponse.DailyAttendance> days = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(today); day = day.plusDays(1)) {
            Map<AttendanceStatus, Long> counts = byDay.getOrDefault(day, Map.of());
            days.add(new DashboardResponse.DailyAttendance(day,
                    counts.getOrDefault(AttendanceStatus.PRESENT, 0L),
                    counts.getOrDefault(AttendanceStatus.HALF_DAY, 0L),
                    counts.getOrDefault(AttendanceStatus.ABSENT, 0L),
                    counts.getOrDefault(AttendanceStatus.LEAVE, 0L)));
        }
        return days;
    }
}
