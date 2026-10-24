package com.example.hr_service.service;

import com.example.hr_service.dto.EmployeeContactRequest;
import com.example.hr_service.dto.EmployeeOption;
import com.example.hr_service.dto.EmployeeRequest;
import com.example.hr_service.dto.EmployeeResponse;
import com.example.hr_service.dto.PageResponse;
import com.example.hr_service.entity.Department;
import com.example.hr_service.entity.Designation;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.EmployeeStatus;
import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.entity.User;
import com.example.hr_service.exception.BadRequestException;
import com.example.hr_service.exception.ConflictException;
import com.example.hr_service.exception.ForbiddenOperationException;
import com.example.hr_service.exception.ResourceNotFoundException;
import com.example.hr_service.repository.DepartmentRepository;
import com.example.hr_service.repository.DesignationRepository;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.UserRepository;
import com.example.hr_service.security.CurrentUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class EmployeeService {

    static final String ENTITY = "Employee";

    private static final Map<String, String> SORTS = Map.of(
            "employeeId", "employeeId",
            "employeeCode", "employeeCode",
            "firstName", "firstName",
            "lastName", "lastName",
            "email", "email",
            "dateOfJoining", "dateOfJoining",
            "status", "status");

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUser;
    private final AuditLogRecorder audit;
    private final Clock clock;

    public EmployeeService(EmployeeRepository employeeRepository,
                           DepartmentRepository departmentRepository,
                           DesignationRepository designationRepository,
                           UserRepository userRepository,
                           CurrentUserService currentUser,
                           AuditLogRecorder audit,
                           Clock clock) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.designationRepository = designationRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
        this.audit = audit;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ queries

    @Transactional(readOnly = true)
    public PageResponse<EmployeeResponse> search(String search, Long departmentId, EmployeeStatus status,
                                                 Integer page, Integer size, String sort) {
        if (currentUser.isEmployeeOnly()) {
            // Plain employees only ever see themselves.
            Employee self = load(currentUser.getCurrentEmployeeId());
            return PageResponse.of(List.of(toResponse(self, accountOf(self))), 0, 1, 1);
        }

        Pageable pageable = PageRequests.of(page, size, sort, SORTS, Sort.by("employeeId"));
        Page<Employee> result = employeeRepository.search(
                PageRequests.likePattern(search), departmentId, status, pageable);

        Map<Long, User> accounts = accountsFor(result.getContent());
        return PageResponse.from(result, employee -> toResponse(employee, accounts.get(employee.getEmployeeId())));
    }

    @Transactional(readOnly = true)
    public EmployeeResponse get(Long employeeId) {
        currentUser.requireSelfOrManager(employeeId, "You can only view your own employee record.");
        Employee employee = load(employeeId);
        return toResponse(employee, accountOf(employee));
    }

    @Transactional(readOnly = true)
    public EmployeeResponse me() {
        Employee employee = load(currentUser.getCurrentEmployeeId());
        return toResponse(employee, accountOf(employee));
    }

    @Transactional(readOnly = true)
    public List<EmployeeOption> options(boolean activeOnly, boolean withoutAccount) {
        return employeeRepository.findOptions(activeOnly ? EmployeeStatus.ACTIVE : null, withoutAccount)
                .stream()
                .map(EmployeeOption::from)
                .toList();
    }

    // ------------------------------------------------------------------ commands

    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        Employee employee = new Employee();
        apply(employee, request);
        Employee saved = employeeRepository.save(employee);

        audit.record(AuditAction.CREATE, ENTITY, saved.getEmployeeId(), null, AuditLogRecorder.describe(snapshot(saved)));
        return toResponse(saved, null);
    }

    @Transactional
    public EmployeeResponse update(Long employeeId, EmployeeRequest request) {
        Employee employee = load(employeeId);
        User account = accountOf(employee);
        requireCanManage(account, "update");

        if (currentUser.isSelf(employeeId) && request.status() == EmployeeStatus.INACTIVE) {
            throw BadRequestException.field("status", "You cannot deactivate your own employee record.");
        }
        if (request.status() == EmployeeStatus.INACTIVE && isLastUsableAdmin(account)) {
            throw new ConflictException("This employee is the last active administrator and cannot be deactivated.");
        }

        Map<String, Object> before = snapshot(employee);
        apply(employee, request);
        Employee saved = employeeRepository.save(employee);

        String[] changes = AuditLogRecorder.diff(before, snapshot(saved));
        if (changes != null) {
            audit.record(AuditAction.UPDATE, ENTITY, employeeId, changes[0], changes[1]);
        }
        return toResponse(saved, account);
    }

    /** Self-service: employees may change only their email and phone. */
    @Transactional
    public EmployeeResponse updateMyContact(EmployeeContactRequest request) {
        Employee employee = load(currentUser.getCurrentEmployeeId());
        String email = normaliseEmail(request.email());

        if (employeeRepository.existsByEmailIgnoreCaseAndEmployeeIdNot(email, employee.getEmployeeId())) {
            throw ConflictException.field("email", "Another employee already uses this email.");
        }

        Map<String, Object> before = Map.of("email", nullSafe(employee.getEmail()), "phone", nullSafe(employee.getPhone()));
        employee.setEmail(email);
        employee.setPhone(request.phone().trim());
        Map<String, Object> after = Map.of("email", employee.getEmail(), "phone", employee.getPhone());

        String[] changes = AuditLogRecorder.diff(before, after);
        if (changes != null) {
            audit.record(AuditAction.UPDATE, ENTITY, employee.getEmployeeId(), changes[0], changes[1]);
        }
        return toResponse(employee, accountOf(employee));
    }

    /**
     * Permanently deletes an employee together with their attendance, leave,
     * project assignments and login account. Setting the status to INACTIVE is
     * the recommended, non-destructive alternative.
     */
    @Transactional
    public void delete(Long employeeId) {
        Employee employee = load(employeeId);
        User account = accountOf(employee);

        if (currentUser.isSelf(employeeId)) {
            throw new ForbiddenOperationException("You cannot delete your own employee record.");
        }
        requireCanManage(account, "delete");
        if (isLastUsableAdmin(account)) {
            throw new ConflictException("This employee is the last active administrator and cannot be deleted.");
        }

        String description = AuditLogRecorder.describe(snapshot(employee));
        employeeRepository.deleteEmployeeProjectAssignments(employeeId);
        employeeRepository.deleteAttendanceRecords(employeeId);
        employeeRepository.clearLeaveApprovals(employeeId);
        employeeRepository.deleteLeaveRequests(employeeId);
        employeeRepository.deleteUsersForEmployee(employeeId);
        employeeRepository.delete(employee);

        audit.record(AuditAction.DELETE, ENTITY, employeeId, description, null);
    }

    // ------------------------------------------------------------------ helpers

    Employee load(Long employeeId) {
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> ResourceNotFoundException.of(ENTITY, employeeId));
    }

    private void apply(Employee employee, EmployeeRequest request) {
        Long currentId = employee.getEmployeeId();
        String code = request.employeeCode().trim().toUpperCase(Locale.ROOT);
        String email = normaliseEmail(request.email());

        Map<String, String> conflicts = new LinkedHashMap<>();
        boolean codeTaken = currentId == null
                ? employeeRepository.existsByEmployeeCodeIgnoreCase(code)
                : employeeRepository.existsByEmployeeCodeIgnoreCaseAndEmployeeIdNot(code, currentId);
        if (codeTaken) {
            conflicts.put("employeeCode", "This employee code is already in use.");
        }
        boolean emailTaken = currentId == null
                ? employeeRepository.existsByEmailIgnoreCase(email)
                : employeeRepository.existsByEmailIgnoreCaseAndEmployeeIdNot(email, currentId);
        if (emailTaken) {
            conflicts.put("email", "Another employee already uses this email.");
        }
        if (!conflicts.isEmpty()) {
            throw new ConflictException(conflicts.values().iterator().next(), conflicts);
        }

        if (request.dateOfJoining().isAfter(LocalDate.now(clock))) {
            throw BadRequestException.field("dateOfJoining", "Date of joining cannot be in the future.");
        }

        Department department = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> BadRequestException.field("departmentId", "Selected department does not exist."));
        Designation designation = designationRepository.findById(request.designationId())
                .orElseThrow(() -> BadRequestException.field("designationId", "Selected designation does not exist."));
        if (designation.getDepartment() == null
                || !designation.getDepartment().getDepartmentId().equals(department.getDepartmentId())) {
            throw BadRequestException.field("designationId",
                    "The designation '" + designation.getDesignationName() + "' does not belong to "
                            + department.getDepartmentName() + ".");
        }

        employee.setEmployeeCode(code);
        employee.setFirstName(request.firstName().trim());
        employee.setLastName(request.lastName().trim());
        employee.setEmail(email);
        employee.setPhone(request.phone().trim());
        employee.setDateOfJoining(request.dateOfJoining());
        employee.setDepartment(department);
        employee.setDesignation(designation);
        employee.setStatus(request.status());
    }

    private void requireCanManage(User account, String verb) {
        SystemRole targetRole = account == null ? null : account.getSystemRole();
        if (!currentUser.canManage(targetRole)) {
            String who = targetRole == null ? "this employee" : "a " + targetRole.label() + " account holder";
            throw new ForbiddenOperationException("You are not allowed to " + verb + " the record of " + who + ".");
        }
    }

    private boolean isLastUsableAdmin(User account) {
        return account != null
                && account.getSystemRole() == SystemRole.ADMIN
                && account.isEnabled()
                && userRepository.countUsableAdmins(EmployeeStatus.ACTIVE) <= 1;
    }

    private User accountOf(Employee employee) {
        return userRepository.findFirstByEmployee_EmployeeId(employee.getEmployeeId()).orElse(null);
    }

    private Map<Long, User> accountsFor(List<Employee> employees) {
        if (employees.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = employees.stream().map(Employee::getEmployeeId).toList();
        return userRepository.findByEmployee_EmployeeIdIn(ids).stream()
                .collect(Collectors.toMap(user -> user.getEmployee().getEmployeeId(), Function.identity(),
                        (first, second) -> first));
    }

    private EmployeeResponse toResponse(Employee employee, User account) {
        boolean canManage = currentUser.isManager()
                && currentUser.canManage(account == null ? null : account.getSystemRole());
        return EmployeeResponse.from(employee, account, canManage);
    }

    private static Map<String, Object> snapshot(Employee employee) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("code", employee.getEmployeeCode());
        values.put("name", employee.getFullName());
        values.put("email", employee.getEmail());
        values.put("phone", employee.getPhone());
        values.put("joined", employee.getDateOfJoining());
        values.put("department", employee.getDepartment() == null ? null : employee.getDepartment().getDepartmentName());
        values.put("designation", employee.getDesignation() == null ? null : employee.getDesignation().getDesignationName());
        values.put("status", employee.getStatus());
        return values;
    }

    private static String normaliseEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static Object nullSafe(Object value) {
        return value == null ? "" : value;
    }
}
