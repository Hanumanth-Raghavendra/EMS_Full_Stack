package com.example.hr_service.service;

import com.example.hr_service.config.AppProperties;
import com.example.hr_service.dto.AttendanceRequest;
import com.example.hr_service.dto.AttendanceResponse;
import com.example.hr_service.dto.PageResponse;
import com.example.hr_service.dto.TodayAttendanceResponse;
import com.example.hr_service.entity.Attendance;
import com.example.hr_service.entity.AttendanceStatus;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.LeaveStatus;
import com.example.hr_service.exception.BadRequestException;
import com.example.hr_service.exception.ConflictException;
import com.example.hr_service.exception.ResourceNotFoundException;
import com.example.hr_service.repository.AttendanceRepository;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.LeaveRequestRepository;
import com.example.hr_service.security.CurrentUserService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AttendanceService {

    private static final String ENTITY = "Attendance";
    private static final int DEFAULT_RANGE_DAYS = 30;

    private static final Map<String, String> SORTS = Map.of(
            "attendanceDate", "attendanceDate",
            "status", "status",
            "checkIn", "checkIn",
            "employeeName", "employee.firstName");

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final CurrentUserService currentUser;
    private final AuditLogRecorder audit;
    private final AppProperties properties;
    private final Clock clock;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             EmployeeRepository employeeRepository,
                             LeaveRequestRepository leaveRequestRepository,
                             CurrentUserService currentUser,
                             AuditLogRecorder audit,
                             AppProperties properties,
                             Clock clock) {
        this.attendanceRepository = attendanceRepository;
        this.employeeRepository = employeeRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.currentUser = currentUser;
        this.audit = audit;
        this.properties = properties;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ queries

    @Transactional(readOnly = true)
    public PageResponse<AttendanceResponse> search(Long employeeId, AttendanceStatus status,
                                                   LocalDate from, LocalDate to,
                                                   Integer page, Integer size, String sort) {
        Long scopedEmployee = currentUser.isEmployeeOnly() ? currentUser.getCurrentEmployeeId() : employeeId;

        LocalDate end = to != null ? to : LocalDate.now(clock);
        LocalDate start = from != null ? from : end.minusDays(DEFAULT_RANGE_DAYS - 1L);
        if (start.isAfter(end)) {
            throw BadRequestException.field("from", "'From' date must be on or before the 'to' date.");
        }
        if (ChronoUnit.DAYS.between(start, end) > 366) {
            throw BadRequestException.field("from", "Please choose a range of at most one year.");
        }

        Sort defaultSort = Sort.by(Sort.Order.desc("attendanceDate"), Sort.Order.asc("attendanceId"));
        return PageResponse.from(
                attendanceRepository.search(scopedEmployee, status, start, end,
                        PageRequests.of(page, size, sort, SORTS, defaultSort)),
                AttendanceResponse::from);
    }

    @Transactional(readOnly = true)
    public AttendanceResponse get(Long attendanceId) {
        Attendance attendance = load(attendanceId);
        currentUser.requireSelfOrManager(attendance.getEmployee().getEmployeeId(),
                "You can only view your own attendance.");
        return AttendanceResponse.from(attendance);
    }

    @Transactional(readOnly = true)
    public TodayAttendanceResponse today() {
        return todayFor(currentUser.getCurrentEmployeeId());
    }

    @Transactional(readOnly = true)
    public TodayAttendanceResponse todayFor(Long employeeId) {
        LocalDate today = LocalDate.now(clock);
        Attendance record = attendanceRepository.findByEmployee_EmployeeIdAndAttendanceDate(employeeId, today)
                .orElse(null);
        boolean onLeave = isOnApprovedLeave(employeeId, today);
        boolean canCheckIn = record == null && !onLeave;
        boolean canCheckOut = record != null && record.getCheckIn() != null && record.getCheckOut() == null;
        return new TodayAttendanceResponse(today, record == null ? null : AttendanceResponse.from(record),
                onLeave, canCheckIn, canCheckOut);
    }

    // ------------------------------------------------------------------ self service

    @Transactional
    public TodayAttendanceResponse checkIn() {
        Employee employee = employeeRepository.findById(currentUser.getCurrentEmployeeId()).orElseThrow();
        LocalDate today = LocalDate.now(clock);

        if (isOnApprovedLeave(employee.getEmployeeId(), today)) {
            throw new ConflictException("You are on approved leave today.");
        }
        if (attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDate(employee.getEmployeeId(), today)) {
            throw new ConflictException("You have already checked in today.");
        }

        Attendance attendance = new Attendance();
        attendance.setEmployee(employee);
        attendance.setAttendanceDate(today);
        attendance.setStatus(AttendanceStatus.PRESENT);
        attendance.setCheckIn(LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS));
        saveUnique(attendance);

        audit.record(AuditAction.CHECK_IN, ENTITY, attendance.getAttendanceId(), null,
                "date=" + today + ", time=" + attendance.getCheckIn().toLocalTime());
        return todayFor(employee.getEmployeeId());
    }

    @Transactional
    public TodayAttendanceResponse checkOut() {
        Long employeeId = currentUser.getCurrentEmployeeId();
        LocalDate today = LocalDate.now(clock);
        Attendance attendance = attendanceRepository.findByEmployee_EmployeeIdAndAttendanceDate(employeeId, today)
                .orElseThrow(() -> new ConflictException("You have not checked in today."));

        if (attendance.getCheckIn() == null) {
            throw new ConflictException("Today's record has no check-in time. Please contact HR.");
        }
        if (attendance.getCheckOut() != null) {
            throw new ConflictException("You have already checked out today.");
        }

        LocalDateTime now = LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS);
        attendance.setCheckOut(now.isBefore(attendance.getCheckIn()) ? attendance.getCheckIn() : now);
        Long worked = attendance.getWorkedMinutes();
        if (attendance.getStatus() == AttendanceStatus.PRESENT && worked != null
                && worked < properties.attendance().halfDayThresholdMinutes()) {
            attendance.setStatus(AttendanceStatus.HALF_DAY);
        }

        audit.record(AuditAction.CHECK_OUT, ENTITY, attendance.getAttendanceId(), null,
                "date=" + today + ", time=" + attendance.getCheckOut().toLocalTime()
                        + ", worked=" + worked + "m, status=" + attendance.getStatus());
        return todayFor(employeeId);
    }

    // ------------------------------------------------------------------ HR maintenance

    @Transactional
    public AttendanceResponse create(AttendanceRequest request) {
        Attendance attendance = new Attendance();
        apply(attendance, request);
        saveUnique(attendance);
        audit.record(AuditAction.CREATE, ENTITY, attendance.getAttendanceId(), null, describe(attendance));
        return AttendanceResponse.from(attendance);
    }

    @Transactional
    public AttendanceResponse update(Long attendanceId, AttendanceRequest request) {
        Attendance attendance = load(attendanceId);
        String before = describe(attendance);
        apply(attendance, request);
        saveUnique(attendance);
        audit.record(AuditAction.UPDATE, ENTITY, attendanceId, before, describe(attendance));
        return AttendanceResponse.from(attendance);
    }

    @Transactional
    public void delete(Long attendanceId) {
        Attendance attendance = load(attendanceId);
        String before = describe(attendance);
        attendanceRepository.delete(attendance);
        audit.record(AuditAction.DELETE, ENTITY, attendanceId, before, null);
    }

    // ------------------------------------------------------------------ helpers

    private void apply(Attendance attendance, AttendanceRequest request) {
        Employee employee = employeeRepository.findById(request.employeeId())
                .orElseThrow(() -> BadRequestException.field("employeeId", "Selected employee does not exist."));

        LocalDate date = request.attendanceDate();
        if (date.isAfter(LocalDate.now(clock))) {
            throw BadRequestException.field("attendanceDate", "Attendance cannot be recorded for a future date.");
        }

        Long currentId = attendance.getAttendanceId();
        boolean duplicate = currentId == null
                ? attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDate(employee.getEmployeeId(), date)
                : attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndAttendanceIdNot(
                        employee.getEmployeeId(), date, currentId);
        if (duplicate) {
            throw ConflictException.field("attendanceDate",
                    employee.getFullName() + " already has an attendance record for " + date + ".");
        }

        LocalDateTime checkIn = request.checkIn();
        LocalDateTime checkOut = request.checkOut();
        boolean works = request.status() == AttendanceStatus.PRESENT || request.status() == AttendanceStatus.HALF_DAY;

        Map<String, String> errors = new LinkedHashMap<>();
        if (!works && (checkIn != null || checkOut != null)) {
            errors.put("status", "Check-in/out times only apply to PRESENT or HALF_DAY.");
        }
        if (checkIn != null && !checkIn.toLocalDate().equals(date)) {
            errors.put("checkIn", "Check-in must be on the attendance date.");
        }
        if (checkOut != null && checkIn == null) {
            errors.put("checkIn", "Enter a check-in time before a check-out time.");
        }
        if (checkOut != null && checkIn != null && checkOut.isBefore(checkIn)) {
            errors.put("checkOut", "Check-out must be after check-in.");
        }
        if (checkOut != null && checkOut.toLocalDate().isAfter(date.plusDays(1))) {
            errors.put("checkOut", "Check-out must be on the attendance date (or the next morning for night shifts).");
        }
        if (!errors.isEmpty()) {
            throw new BadRequestException(errors.values().iterator().next(), errors);
        }

        attendance.setEmployee(employee);
        attendance.setAttendanceDate(date);
        attendance.setStatus(request.status());
        attendance.setCheckIn(checkIn == null ? null : checkIn.truncatedTo(ChronoUnit.SECONDS));
        attendance.setCheckOut(checkOut == null ? null : checkOut.truncatedTo(ChronoUnit.SECONDS));
    }

    /** Saves and turns a race on the unique (employee, day) index into a clean 409. */
    private void saveUnique(Attendance attendance) {
        try {
            attendanceRepository.saveAndFlush(attendance);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("An attendance record already exists for this employee and date.");
        }
    }

    private boolean isOnApprovedLeave(Long employeeId, LocalDate date) {
        return !leaveRequestRepository.findOverlapping(employeeId, List.of(LeaveStatus.APPROVED), date, date).isEmpty();
    }

    private Attendance load(Long attendanceId) {
        return attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> ResourceNotFoundException.of(ENTITY, attendanceId));
    }

    /** Per-status counts for one employee over a date range (used by the dashboard). */
    @Transactional(readOnly = true)
    public Map<String, Long> countsForEmployee(Long employeeId, LocalDate from, LocalDate to) {
        Map<AttendanceStatus, Long> counts = new EnumMap<>(AttendanceStatus.class);
        for (AttendanceStatus status : AttendanceStatus.values()) {
            counts.put(status, 0L);
        }
        for (Object[] row : attendanceRepository.countByStatusForEmployee(employeeId, from, to)) {
            counts.put((AttendanceStatus) row[0], ((Number) row[1]).longValue());
        }
        Map<String, Long> result = new LinkedHashMap<>();
        counts.forEach((status, count) -> result.put(status.name(), count));
        return result;
    }

    private static String describe(Attendance attendance) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("employee", attendance.getEmployee().getEmployeeCode());
        values.put("date", attendance.getAttendanceDate());
        values.put("status", attendance.getStatus());
        values.put("checkIn", attendance.getCheckIn() == null ? null : attendance.getCheckIn().toLocalTime());
        values.put("checkOut", attendance.getCheckOut() == null ? null : attendance.getCheckOut().toLocalTime());
        return AuditLogRecorder.describe(values);
    }
}
