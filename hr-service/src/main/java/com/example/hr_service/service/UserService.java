package com.example.hr_service.service;

import com.example.hr_service.dto.PasswordResetRequest;
import com.example.hr_service.dto.UserCreateRequest;
import com.example.hr_service.dto.UserResponse;
import com.example.hr_service.dto.UserUpdateRequest;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.EmployeeStatus;
import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.entity.User;
import com.example.hr_service.exception.BadRequestException;
import com.example.hr_service.exception.ConflictException;
import com.example.hr_service.exception.ForbiddenOperationException;
import com.example.hr_service.exception.ResourceNotFoundException;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.UserRepository;
import com.example.hr_service.security.CurrentUserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Login accounts.
 *
 * Hierarchy rules (enforced here, not just hidden in the UI):
 *  - ADMIN manages every account; HR manages only EMPLOYEE accounts and can
 *    only grant the EMPLOYEE role;
 *  - nobody can change their own role, disable or delete themselves;
 *  - the last usable administrator can never be demoted, disabled or deleted.
 */
@Service
public class UserService {

    private static final String ENTITY = "User";

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final RoleService roleService;
    private final CurrentUserService currentUser;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogRecorder audit;

    public UserService(UserRepository userRepository,
                       EmployeeRepository employeeRepository,
                       RoleService roleService,
                       CurrentUserService currentUser,
                       PasswordEncoder passwordEncoder,
                       AuditLogRecorder audit) {
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.roleService = roleService;
        this.currentUser = currentUser;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list(String search) {
        return userRepository.search(PageRequests.likePattern(search)).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long userId) {
        return toResponse(load(userId));
    }

    @Transactional
    public UserResponse create(UserCreateRequest request) {
        requireCanAssign(request.role());

        Employee employee = employeeRepository.findById(request.employeeId())
                .orElseThrow(() -> BadRequestException.field("employeeId", "Selected employee does not exist."));
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw BadRequestException.field("employeeId", "Accounts can only be created for active employees.");
        }
        if (userRepository.existsByEmployee_EmployeeId(employee.getEmployeeId())) {
            throw ConflictException.field("employeeId", employee.getFullName() + " already has an account.");
        }
        String username = request.username().trim();
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw ConflictException.field("username", "This username is already taken.");
        }

        User user = new User();
        user.setEmployee(employee);
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(roleService.getRoleEntity(request.role()));
        user.setEnabled(request.enabled() == null || request.enabled());
        User saved = userRepository.save(user);

        audit.record(AuditAction.CREATE, ENTITY, saved.getUserId(), null, AuditLogRecorder.describe(snapshot(saved)));
        return toResponse(saved);
    }

    @Transactional
    public UserResponse update(Long userId, UserUpdateRequest request) {
        User user = load(userId);
        requireCanManage(user);
        requireCanAssign(request.role());

        boolean self = isSelf(user);
        if (self && request.role() != user.getSystemRole()) {
            throw new ForbiddenOperationException("You cannot change your own role.");
        }
        if (self && !request.enabled()) {
            throw new ForbiddenOperationException("You cannot disable your own account.");
        }
        boolean losesAdmin = user.getSystemRole() == SystemRole.ADMIN
                && (request.role() != SystemRole.ADMIN || !request.enabled());
        if (losesAdmin && user.isEnabled() && userRepository.countUsableAdmins(EmployeeStatus.ACTIVE) <= 1) {
            throw new ConflictException("This is the last active administrator. Create another administrator first.");
        }

        String username = request.username().trim();
        if (userRepository.existsByUsernameIgnoreCaseAndUserIdNot(username, userId)) {
            throw ConflictException.field("username", "This username is already taken.");
        }

        Map<String, Object> before = snapshot(user);
        boolean securityRelevant = request.role() != user.getSystemRole()
                || !Objects.equals(request.enabled(), user.getEnabled())
                || !username.equals(user.getUsername());

        user.setUsername(username);
        user.setRole(roleService.getRoleEntity(request.role()));
        user.setEnabled(request.enabled());
        if (securityRelevant) {
            // Existing sessions carry the old role/username: sign them out.
            user.bumpTokenVersion();
        }

        String[] changes = AuditLogRecorder.diff(before, snapshot(user));
        if (changes != null) {
            audit.record(AuditAction.UPDATE, ENTITY, userId, changes[0], changes[1]);
        }
        return toResponse(user);
    }

    @Transactional
    public void resetPassword(Long userId, PasswordResetRequest request) {
        User user = load(userId);
        if (isSelf(user)) {
            throw new BadRequestException("Use 'Change password' on your profile to change your own password.");
        }
        requireCanManage(user);

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.bumpTokenVersion();
        audit.record(AuditAction.PASSWORD_RESET, ENTITY, userId, null, "password reset for " + user.getUsername());
    }

    @Transactional
    public void delete(Long userId) {
        User user = load(userId);
        if (isSelf(user)) {
            throw new ForbiddenOperationException("You cannot delete your own account.");
        }
        requireCanManage(user);
        if (user.getSystemRole() == SystemRole.ADMIN && user.isEnabled()
                && userRepository.countUsableAdmins(EmployeeStatus.ACTIVE) <= 1) {
            throw new ConflictException("This is the last active administrator and cannot be deleted.");
        }

        String before = AuditLogRecorder.describe(snapshot(user));
        userRepository.clearLeaveReviews(userId);
        userRepository.delete(user);
        audit.record(AuditAction.DELETE, ENTITY, userId, before, null);
    }

    // ------------------------------------------------------------------ helpers

    private User load(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> ResourceNotFoundException.of(ENTITY, userId));
    }

    private boolean isSelf(User user) {
        return Objects.equals(user.getUserId(), currentUser.getCurrentUserId());
    }

    private void requireCanManage(User target) {
        if (!currentUser.canManage(target.getSystemRole())) {
            throw new ForbiddenOperationException(
                    "Only administrators can manage " + target.getSystemRole().label() + " accounts.");
        }
    }

    private void requireCanAssign(SystemRole role) {
        if (!currentUser.canManage(role)) {
            throw new ForbiddenOperationException("Only administrators can grant the " + role.label() + " role.");
        }
    }

    private UserResponse toResponse(User user) {
        boolean self = isSelf(user);
        boolean canManage = !self && currentUser.canManage(user.getSystemRole());
        return UserResponse.from(user, canManage, self);
    }

    private static Map<String, Object> snapshot(User user) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("username", user.getUsername());
        values.put("employee", user.getEmployee().getEmployeeCode());
        values.put("role", user.getSystemRole());
        values.put("enabled", user.getEnabled());
        return values;
    }
}
