package com.example.hr_service.service;

import com.example.hr_service.config.AppProperties;
import com.example.hr_service.dto.InitialAdminRequest;
import com.example.hr_service.dto.InitialAdminResponse;
import com.example.hr_service.dto.SetupStatusResponse;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.EmployeeStatus;
import com.example.hr_service.entity.Role;
import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.entity.User;
import com.example.hr_service.exception.BadRequestException;
import com.example.hr_service.exception.ConflictException;
import com.example.hr_service.exception.ForbiddenOperationException;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.UserRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * One-time bootstrap of the first administrator on an empty installation.
 *
 * Safety rules:
 *  - only available while no ADMIN account exists;
 *  - optionally protected by SETUP_TOKEN so nobody can race you to claim a
 *    freshly deployed instance;
 *  - never exposes the employee list (the old /api/setup/employees endpoint
 *    leaked every employee's name to anonymous callers).
 */
@Service
public class SetupService {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final RoleService roleService;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogRecorder audit;
    private final AppProperties properties;
    private final Clock clock;
    private final JdbcTemplate jdbcTemplate;

    /** Arbitrary constant identifying the "first admin" critical section. */
    private static final long SETUP_LOCK_KEY = 0x454D53_5345545550L;

    public SetupService(UserRepository userRepository,
                        EmployeeRepository employeeRepository,
                        RoleService roleService,
                        PasswordEncoder passwordEncoder,
                        AuditLogRecorder audit,
                        AppProperties properties,
                        Clock clock,
                        JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.roleService = roleService;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
        this.properties = properties;
        this.clock = clock;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public boolean isSetupRequired() {
        return userRepository.countByRoleName(SystemRole.ADMIN.name()) == 0;
    }

    @Transactional(readOnly = true)
    public SetupStatusResponse status() {
        List<SetupStatusResponse.DemoAccount> demoAccounts = properties.demo().enabled()
                ? DemoAccounts.list(properties.demo().password())
                : List.of();
        return new SetupStatusResponse(
                isSetupRequired(),
                properties.setup().tokenRequired(),
                properties.demo().enabled(),
                demoAccounts);
    }

    @Transactional
    public InitialAdminResponse createFirstAdmin(InitialAdminRequest request) {
        verifyToken(request.setupToken());

        // A transaction-scoped database lock (released on commit/rollback) so two
        // simultaneous requests can never both create a "first" administrator,
        // even across several API instances.
        jdbcTemplate.execute("SELECT pg_advisory_xact_lock(" + SETUP_LOCK_KEY + ")");

        if (!isSetupRequired()) {
            throw new ConflictException("Setup has already been completed. Please sign in.");
        }

        String username = request.username().trim();
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw ConflictException.field("username", "This username is already taken.");
        }

        Employee employee = Texts.isBlank(request.existingEmployeeCode())
                ? createEmployee(request)
                : findExistingEmployee(request.existingEmployeeCode());

        Role adminRole = roleService.getRoleEntity(SystemRole.ADMIN);

        // Promote an existing account for this employee instead of creating a second one.
        User user = userRepository.findFirstByEmployee_EmployeeId(employee.getEmployeeId()).orElseGet(User::new);
        user.setEmployee(employee);
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(adminRole);
        user.setEnabled(true);
        user.bumpTokenVersion();
        User saved = userRepository.save(user);

        audit.recordAs(saved.getUserId(), saved.getUsername(), AuditAction.SETUP, "User", saved.getUserId(),
                null, "first administrator created for employee " + employee.getEmployeeCode());

        return new InitialAdminResponse(
                "Administrator account created. You can now sign in.",
                saved.getUserId(), saved.getUsername(), employee.getEmployeeId());
    }

    private void verifyToken(String provided) {
        if (!properties.setup().tokenRequired()) {
            return;
        }
        byte[] expected = properties.setup().token().getBytes(StandardCharsets.UTF_8);
        byte[] actual = (provided == null ? "" : provided.trim()).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, actual)) {
            throw new ForbiddenOperationException("The setup token is incorrect.");
        }
    }

    private Employee findExistingEmployee(String code) {
        Employee employee = employeeRepository.findFirstByEmployeeCodeIgnoreCase(code.trim())
                .orElseThrow(() -> BadRequestException.field("existingEmployeeCode",
                        "No employee with this code exists."));
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw BadRequestException.field("existingEmployeeCode", "This employee is inactive.");
        }
        return employee;
    }

    private Employee createEmployee(InitialAdminRequest request) {
        Map<String, String> missing = new LinkedHashMap<>();
        if (Texts.isBlank(request.employeeCode())) {
            missing.put("employeeCode", "Employee code is required.");
        }
        if (Texts.isBlank(request.firstName())) {
            missing.put("firstName", "First name is required.");
        }
        if (Texts.isBlank(request.lastName())) {
            missing.put("lastName", "Last name is required.");
        }
        if (Texts.isBlank(request.email())) {
            missing.put("email", "Email is required.");
        }
        if (!missing.isEmpty()) {
            throw new BadRequestException("Please fill in your employee details.", missing);
        }

        if (employeeRepository.existsByEmployeeCodeIgnoreCase(request.employeeCode().trim())) {
            throw ConflictException.field("employeeCode",
                    "This employee code already exists. Use 'link existing employee' instead.");
        }
        if (employeeRepository.existsByEmailIgnoreCase(request.email().trim())) {
            throw ConflictException.field("email", "An employee with this email already exists.");
        }

        Employee employee = new Employee();
        employee.setEmployeeCode(request.employeeCode().trim().toUpperCase());
        employee.setFirstName(request.firstName().trim());
        employee.setLastName(request.lastName().trim());
        employee.setEmail(request.email().trim().toLowerCase());
        employee.setPhone(Texts.trimToNull(request.phone()));
        employee.setDateOfJoining(LocalDate.now(clock));
        employee.setStatus(EmployeeStatus.ACTIVE);
        return employeeRepository.save(employee);
    }
}
