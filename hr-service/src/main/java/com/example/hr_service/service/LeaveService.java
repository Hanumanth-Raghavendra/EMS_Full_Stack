package com.example.hr_service.service;

import com.example.hr_service.config.AppProperties;
import com.example.hr_service.dto.LeaveApplyRequest;
import com.example.hr_service.dto.LeaveBalanceResponse;
import com.example.hr_service.dto.LeaveResponse;
import com.example.hr_service.dto.LeaveReviewRequest;
import com.example.hr_service.dto.PageResponse;
import com.example.hr_service.entity.Attendance;
import com.example.hr_service.entity.AttendanceStatus;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.EmployeeStatus;
import com.example.hr_service.entity.LeaveRequest;
import com.example.hr_service.entity.LeaveStatus;
import com.example.hr_service.entity.LeaveType;
import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.entity.User;
import com.example.hr_service.exception.BadRequestException;
import com.example.hr_service.exception.ConflictException;
import com.example.hr_service.exception.ForbiddenOperationException;
import com.example.hr_service.exception.ResourceNotFoundException;
import com.example.hr_service.repository.AttendanceRepository;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.LeaveRequestRepository;
import com.example.hr_service.repository.UserRepository;
import com.example.hr_service.security.CurrentUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Leave workflow: apply -> (edit) -> approve / reject -> (cancel).
 *
 * Business rules:
 *  - end date on or after start date, within a single calendar year;
 *  - at least one working day, at most app.leave.max-days-per-request;
 *  - no overlap with the employee's other pending/approved requests;
 *  - cannot exceed the annual quota of the leave type (pending days count);
 *  - reviewers cannot review their own request, HR cannot review HR/admin
 *    requests, and a rejection needs a reason;
 *  - approving creates LEAVE attendance entries for the working days, and
 *    cancelling/deleting approved leave removes them again.
 */
@Service
public class LeaveService {

    private static final String ENTITY = "LeaveRequest";
    private static final LocalDate MIN_DATE = LocalDate.of(1900, 1, 1);
    private static final LocalDate MAX_DATE = LocalDate.of(2999, 12, 31);
    private static final int BACKDATE_LIMIT_DAYS = 30;
    private static final List<LeaveStatus> ACTIVE = List.of(LeaveStatus.PENDING, LeaveStatus.APPROVED);

    private static final Map<String, String> SORTS = Map.of(
            "startDate", "startDate",
            "appliedAt", "appliedAt",
            "status", "status",
            "leaveType", "leaveType",
            "employeeName", "employee.firstName");

    private final LeaveRequestRepository leaveRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final CurrentUserService currentUser;
    private final LeaveCalendar calendar;
    private final AuditLogRecorder audit;
    private final AppProperties properties;
    private final Clock clock;

    public LeaveService(LeaveRequestRepository leaveRepository,
                        EmployeeRepository employeeRepository,
                        UserRepository userRepository,
                        AttendanceRepository attendanceRepository,
                        CurrentUserService currentUser,
                        LeaveCalendar calendar,
                        AuditLogRecorder audit,
                        AppProperties properties,
                        Clock clock) {
        this.leaveRepository = leaveRepository;
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.attendanceRepository = attendanceRepository;
        this.currentUser = currentUser;
        this.calendar = calendar;
        this.audit = audit;
        this.properties = properties;
        this.clock = clock;
    }

    // ================================================================== queries

    @Transactional(readOnly = true)
    public PageResponse<LeaveResponse> search(Long employeeId, boolean mine, LeaveStatus status, LeaveType type,
                                              LocalDate from, LocalDate to,
                                              Integer page, Integer size, String sort) {
        Long scoped = currentUser.isEmployeeOnly() || mine ? currentUser.getCurrentEmployeeId() : employeeId;
        Sort defaultSort = Sort.by(Sort.Order.desc("startDate"), Sort.Order.desc("leaveId"));

        Page<LeaveRequest> result = leaveRepository.search(scoped, status, type,
                from == null ? MIN_DATE : from, to == null ? MAX_DATE : to,
                PageRequests.of(page, size, sort, SORTS, defaultSort));

        Map<Long, SystemRole> roles = rolesFor(result.getContent());
        return PageResponse.from(result, leave -> toResponse(leave, roles.get(leave.getEmployee().getEmployeeId())));
    }

    @Transactional(readOnly = true)
    public LeaveResponse get(Long leaveId) {
        LeaveRequest leave = load(leaveId);
        currentUser.requireSelfOrManager(leave.getEmployee().getEmployeeId(),
                "You can only view your own leave requests.");
        return toResponse(leave);
    }

    @Transactional(readOnly = true)
    public LeaveBalanceResponse balance(Long employeeId, Integer year) {
        Long target = employeeId == null ? currentUser.getCurrentEmployeeId() : employeeId;
        currentUser.requireSelfOrManager(target, "You can only view your own leave balance.");
        if (!employeeRepository.existsById(target)) {
            throw ResourceNotFoundException.of("Employee", target);
        }
        int effectiveYear = year == null ? LocalDate.now(clock).getYear() : year;
        return balanceFor(target, effectiveYear);
    }

    LeaveBalanceResponse balanceFor(Long employeeId, int year) {
        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd = LocalDate.of(year, 12, 31);
        List<LeaveRequest> requests = leaveRepository.findOverlapping(employeeId, ACTIVE, yearStart, yearEnd);

        List<LeaveBalanceResponse.Item> items = new ArrayList<>();
        for (LeaveType type : LeaveType.values()) {
            int used = 0;
            int pending = 0;
            for (LeaveRequest request : requests) {
                if (request.getLeaveType() != type) {
                    continue;
                }
                int days = calendar.countDaysWithin(request.getStartDate(), request.getEndDate(), yearStart, yearEnd);
                if (request.getStatus() == LeaveStatus.APPROVED) {
                    used += days;
                } else {
                    pending += days;
                }
            }
            Integer quota = properties.leave().quotaFor(type);
            Integer remaining = quota == null ? null : Math.max(0, quota - used - pending);
            items.add(new LeaveBalanceResponse.Item(type, quota, used, pending, remaining));
        }
        return new LeaveBalanceResponse(employeeId, year, items);
    }

    @Transactional(readOnly = true)
    public List<LeaveResponse> upcomingFor(Long employeeId) {
        return leaveRepository.findUpcomingForEmployee(employeeId, ACTIVE, LocalDate.now(clock)).stream()
                .limit(5)
                .map(this::toResponse)
                .toList();
    }

    // ================================================================== commands

    @Transactional
    public LeaveResponse apply(LeaveApplyRequest request) {
        Employee employee = resolveApplicant(request.employeeId());

        validate(employee, request.leaveType(), request.startDate(), request.endDate(), null);

        LeaveRequest leave = new LeaveRequest();
        leave.setEmployee(employee);
        leave.setLeaveType(request.leaveType());
        leave.setStartDate(request.startDate());
        leave.setEndDate(request.endDate());
        leave.setReason(request.reason().trim());
        leave.setStatus(LeaveStatus.PENDING);
        leave.setAppliedAt(LocalDateTime.now(clock));
        LeaveRequest saved = leaveRepository.save(leave);

        audit.record(AuditAction.CREATE, ENTITY, saved.getLeaveId(), null, describe(saved));
        return toResponse(saved);
    }

    @Transactional
    public LeaveResponse update(Long leaveId, LeaveApplyRequest request) {
        LeaveRequest leave = load(leaveId);
        requireOwnerOrManagerOf(leave, "edit");
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new ConflictException("Only pending requests can be edited.");
        }

        validate(leave.getEmployee(), request.leaveType(), request.startDate(), request.endDate(), leaveId);

        String before = describe(leave);
        leave.setLeaveType(request.leaveType());
        leave.setStartDate(request.startDate());
        leave.setEndDate(request.endDate());
        leave.setReason(request.reason().trim());

        audit.record(AuditAction.UPDATE, ENTITY, leaveId, before, describe(leave));
        return toResponse(leave);
    }

    @Transactional
    public LeaveResponse approve(Long leaveId, LeaveReviewRequest request) {
        LeaveRequest leave = loadForReview(leaveId);

        // Re-check the balance: other requests may have been approved since this one was filed.
        Integer quota = properties.leave().quotaFor(leave.getLeaveType());
        if (quota != null) {
            int year = leave.getStartDate().getYear();
            int alreadyUsed = balanceFor(leave.getEmployee().getEmployeeId(), year).balances().stream()
                    .filter(item -> item.leaveType() == leave.getLeaveType())
                    .mapToInt(LeaveBalanceResponse.Item::used)
                    .sum();
            int days = calendar.countDays(leave.getStartDate(), leave.getEndDate());
            if (alreadyUsed + days > quota) {
                throw new ConflictException("Approving this request would exceed the employee's "
                        + leave.getLeaveType() + " quota (" + Math.max(0, quota - alreadyUsed) + " day(s) left).");
            }
        }

        markReviewed(leave, LeaveStatus.APPROVED, request == null ? null : request.comment());
        int created = createLeaveAttendance(leave);

        audit.record(AuditAction.APPROVE, ENTITY, leaveId, "status=PENDING",
                "status=APPROVED, attendanceDays=" + created + commentSuffix(leave));
        return toResponse(leave);
    }

    @Transactional
    public LeaveResponse reject(Long leaveId, LeaveReviewRequest request) {
        String comment = request == null ? null : Texts.trimToNull(request.comment());
        if (comment == null) {
            throw BadRequestException.field("comment", "Please give a reason for rejecting this request.");
        }
        LeaveRequest leave = loadForReview(leaveId);
        markReviewed(leave, LeaveStatus.REJECTED, comment);

        audit.record(AuditAction.REJECT, ENTITY, leaveId, "status=PENDING", "status=REJECTED" + commentSuffix(leave));
        return toResponse(leave);
    }

    @Transactional
    public LeaveResponse cancel(Long leaveId) {
        LeaveRequest leave = load(leaveId);
        if (!permissionsFor(leave, accountRoleOf(leave.getEmployee())).cancel()) {
            if (!currentUser.isSelf(leave.getEmployee().getEmployeeId()) && !currentUser.isManager()) {
                throw new ForbiddenOperationException("You can only cancel your own leave requests.");
            }
            throw new ConflictException(leave.getStatus() == LeaveStatus.APPROVED
                    ? "Approved leave that has already started can only be cancelled by HR."
                    : "Only pending or approved requests can be cancelled.");
        }

        LeaveStatus previous = leave.getStatus();
        leave.setStatus(LeaveStatus.CANCELLED);
        int removed = previous == LeaveStatus.APPROVED ? removeLeaveAttendance(leave) : 0;

        audit.record(AuditAction.CANCEL, ENTITY, leaveId, "status=" + previous,
                "status=CANCELLED, attendanceDaysRemoved=" + removed);
        return toResponse(leave);
    }

    @Transactional
    public void delete(Long leaveId) {
        LeaveRequest leave = load(leaveId);
        if (!permissionsFor(leave, accountRoleOf(leave.getEmployee())).delete()) {
            throw new ForbiddenOperationException("You are not allowed to delete this leave request.");
        }
        String before = describe(leave);
        if (leave.getStatus() == LeaveStatus.APPROVED) {
            removeLeaveAttendance(leave);
        }
        leaveRepository.delete(leave);
        audit.record(AuditAction.DELETE, ENTITY, leaveId, before, null);
    }

    // ================================================================== rules

    private Employee resolveApplicant(Long requestedEmployeeId) {
        Long selfId = currentUser.getCurrentEmployeeId();
        if (requestedEmployeeId == null || requestedEmployeeId.equals(selfId)) {
            return employeeRepository.findById(selfId).orElseThrow();
        }
        if (!currentUser.isManager()) {
            throw new ForbiddenOperationException("You can only apply for leave for yourself.");
        }
        Employee employee = employeeRepository.findById(requestedEmployeeId)
                .orElseThrow(() -> BadRequestException.field("employeeId", "Selected employee does not exist."));
        if (!currentUser.canManage(accountRoleOf(employee))) {
            throw new ForbiddenOperationException("Only administrators can apply for leave on behalf of HR staff.");
        }
        return employee;
    }

    private void validate(Employee employee, LeaveType type, LocalDate start, LocalDate end, Long excludeLeaveId) {
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new BadRequestException("Leave cannot be requested for an inactive employee.");
        }
        if (end.isBefore(start)) {
            throw BadRequestException.field("endDate", "End date must be on or after the start date.");
        }
        if (start.getYear() != end.getYear()) {
            throw BadRequestException.field("endDate",
                    "Leave cannot span two calendar years. Please submit one request per year.");
        }

        LocalDate today = LocalDate.now(clock);
        if (!currentUser.isManager() && start.isBefore(today.minusDays(BACKDATE_LIMIT_DAYS))) {
            throw BadRequestException.field("startDate",
                    "Leave can be backdated by at most " + BACKDATE_LIMIT_DAYS + " days. Contact HR for older dates.");
        }
        if (start.isAfter(today.plusYears(1))) {
            throw BadRequestException.field("startDate", "Leave can be planned at most one year ahead.");
        }

        int days = calendar.countDays(start, end);
        if (days == 0) {
            throw BadRequestException.field("endDate", "The selected dates contain no working days.");
        }
        int maxDays = properties.leave().maxDaysPerRequest();
        if (days > maxDays) {
            throw BadRequestException.field("endDate",
                    "A single request can cover at most " + maxDays + " working days.");
        }

        List<LeaveRequest> overlapping = leaveRepository.findOverlapping(employee.getEmployeeId(), ACTIVE, start, end)
                .stream()
                .filter(other -> !Objects.equals(other.getLeaveId(), excludeLeaveId))
                .toList();
        if (!overlapping.isEmpty()) {
            LeaveRequest other = overlapping.get(0);
            throw ConflictException.field("startDate", "These dates overlap another " + other.getStatus().name()
                    .toLowerCase() + " request (" + other.getStartDate() + " to " + other.getEndDate() + ").");
        }

        Integer quota = properties.leave().quotaFor(type);
        if (quota != null) {
            LeaveBalanceResponse.Item item = balanceFor(employee.getEmployeeId(), start.getYear()).balances().stream()
                    .filter(balance -> balance.leaveType() == type)
                    .findFirst()
                    .orElseThrow();
            int reserved = item.used() + item.pending();
            if (excludeLeaveId != null) {
                LeaveRequest current = load(excludeLeaveId);
                if (current.getLeaveType() == type && current.getStartDate().getYear() == start.getYear()) {
                    reserved -= calendar.countDays(current.getStartDate(), current.getEndDate());
                }
            }
            int remaining = Math.max(0, quota - reserved);
            if (days > remaining) {
                throw BadRequestException.field("leaveType", "Not enough " + type.name().toLowerCase()
                        + " leave: " + remaining + " day(s) remaining in " + start.getYear() + ", "
                        + days + " requested.");
            }
        }
    }

    private LeaveRequest loadForReview(Long leaveId) {
        LeaveRequest leave = load(leaveId);
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new ConflictException("This request has already been " + leave.getStatus().name().toLowerCase() + ".");
        }
        if (currentUser.isSelf(leave.getEmployee().getEmployeeId())) {
            throw new ForbiddenOperationException("You cannot review your own leave request.");
        }
        if (!currentUser.canManage(accountRoleOf(leave.getEmployee()))) {
            throw new ForbiddenOperationException("Only administrators can review leave requests from HR staff.");
        }
        return leave;
    }

    private void markReviewed(LeaveRequest leave, LeaveStatus status, String comment) {
        User reviewer = userRepository.findById(currentUser.getCurrentUserId()).orElseThrow();
        leave.setStatus(status);
        leave.setReviewedBy(reviewer);
        leave.setReviewedAt(LocalDateTime.now(clock));
        leave.setReviewComment(Texts.trimToNull(comment));
    }

    private void requireOwnerOrManagerOf(LeaveRequest leave, String verb) {
        Long ownerId = leave.getEmployee().getEmployeeId();
        if (currentUser.isSelf(ownerId)) {
            return;
        }
        if (!currentUser.isManager() || !currentUser.canManage(accountRoleOf(leave.getEmployee()))) {
            throw new ForbiddenOperationException("You are not allowed to " + verb + " this leave request.");
        }
    }

    /** Fills working days of an approved leave with LEAVE attendance (existing records are kept). */
    private int createLeaveAttendance(LeaveRequest leave) {
        Long employeeId = leave.getEmployee().getEmployeeId();
        Set<LocalDate> existing = new HashSet<>(attendanceRepository.findDatesForEmployee(
                employeeId, leave.getStartDate(), leave.getEndDate()));

        List<Attendance> records = new ArrayList<>();
        for (LocalDate date : calendar.workingDays(leave.getStartDate(), leave.getEndDate())) {
            if (existing.contains(date)) {
                continue;
            }
            Attendance attendance = new Attendance();
            attendance.setEmployee(leave.getEmployee());
            attendance.setAttendanceDate(date);
            attendance.setStatus(AttendanceStatus.LEAVE);
            records.add(attendance);
        }
        attendanceRepository.saveAll(records);
        return records.size();
    }

    private int removeLeaveAttendance(LeaveRequest leave) {
        return attendanceRepository.deleteByEmployeeStatusAndRange(leave.getEmployee().getEmployeeId(),
                AttendanceStatus.LEAVE, leave.getStartDate(), leave.getEndDate());
    }

    // ================================================================== mapping

    private LeaveResponse toResponse(LeaveRequest leave) {
        return toResponse(leave, accountRoleOf(leave.getEmployee()));
    }

    private LeaveResponse toResponse(LeaveRequest leave, SystemRole ownerRole) {
        Employee employee = leave.getEmployee();
        User reviewer = leave.getReviewedBy();
        return new LeaveResponse(
                leave.getLeaveId(),
                employee.getEmployeeId(),
                employee.getEmployeeCode(),
                employee.getFullName(),
                leave.getLeaveType(),
                leave.getStartDate(),
                leave.getEndDate(),
                calendar.countDays(leave.getStartDate(), leave.getEndDate()),
                leave.getReason(),
                leave.getStatus(),
                leave.getAppliedAt(),
                reviewer == null ? null : reviewer.getUserId(),
                reviewer == null ? null : reviewer.getUsername(),
                leave.getReviewedAt(),
                leave.getReviewComment(),
                permissionsFor(leave, ownerRole));
    }

    private LeaveResponse.Permissions permissionsFor(LeaveRequest leave, SystemRole ownerRole) {
        boolean owner = currentUser.isSelf(leave.getEmployee().getEmployeeId());
        boolean manages = currentUser.isManager() && !owner && currentUser.canManage(ownerRole);
        LeaveStatus status = leave.getStatus();
        LocalDate today = LocalDate.now(clock);

        boolean pending = status == LeaveStatus.PENDING;
        boolean approved = status == LeaveStatus.APPROVED;

        boolean edit = pending && (owner || manages);
        boolean cancel = (owner && (pending || (approved && leave.getStartDate().isAfter(today))))
                || (manages && (pending || approved));
        boolean review = pending && manages;
        boolean delete = manages || (owner && currentUser.isAdmin());
        return new LeaveResponse.Permissions(edit, cancel, review, delete);
    }

    private SystemRole accountRoleOf(Employee employee) {
        return userRepository.findFirstByEmployee_EmployeeId(employee.getEmployeeId())
                .map(User::getSystemRole)
                .orElse(null);
    }

    private Map<Long, SystemRole> rolesFor(Collection<LeaveRequest> leaves) {
        if (leaves.isEmpty()) {
            return Map.of();
        }
        Set<Long> employeeIds = leaves.stream().map(l -> l.getEmployee().getEmployeeId()).collect(Collectors.toSet());
        return userRepository.findByEmployee_EmployeeIdIn(employeeIds).stream()
                .collect(Collectors.toMap(u -> u.getEmployee().getEmployeeId(), User::getSystemRole, (a, b) -> a));
    }

    private LeaveRequest load(Long leaveId) {
        return leaveRepository.findById(leaveId).orElseThrow(() -> ResourceNotFoundException.of("Leave request", leaveId));
    }

    private static String commentSuffix(LeaveRequest leave) {
        return leave.getReviewComment() == null ? "" : ", comment=" + leave.getReviewComment();
    }

    private String describe(LeaveRequest leave) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("employee", leave.getEmployee().getEmployeeCode());
        values.put("type", leave.getLeaveType());
        values.put("from", leave.getStartDate());
        values.put("to", leave.getEndDate());
        values.put("days", calendar.countDays(leave.getStartDate(), leave.getEndDate()));
        values.put("status", leave.getStatus());
        values.put("reason", leave.getReason());
        return AuditLogRecorder.describe(values);
    }

    /** Exposed for the dashboard. */
    @Transactional(readOnly = true)
    public List<LeaveResponse> map(List<LeaveRequest> leaves) {
        Map<Long, SystemRole> roles = rolesFor(leaves);
        return leaves.stream().map(leave -> toResponse(leave, roles.get(leave.getEmployee().getEmployeeId()))).toList();
    }
}
