package com.example.hr_service.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Everything the dashboard needs in one round trip.
 * {@code organization} is null for plain employees.
 */
public record DashboardResponse(
        LocalDate today,
        Personal me,
        Organization organization) {

    public record Personal(
            TodayAttendanceResponse attendanceToday,
            List<LeaveBalanceResponse.Item> leaveBalance,
            long pendingLeaveRequests,
            List<LeaveResponse> upcomingLeave,
            long activeProjects,
            Map<String, Long> attendanceThisMonth) {
    }

    public record Organization(
            long totalEmployees,
            long activeEmployees,
            long departments,
            long activeProjects,
            long pendingLeaveRequests,
            Map<String, Long> attendanceToday,
            List<NameCount> headcountByDepartment,
            List<DailyAttendance> attendanceTrend,
            List<LeaveResponse> pendingApprovals,
            List<LeaveResponse> onLeaveThisWeek,
            List<EmployeeOption> recentHires) {
    }

    public record NameCount(String name, long count) {
    }

    public record DailyAttendance(LocalDate date, long present, long halfDay, long absent, long leave) {
    }
}
