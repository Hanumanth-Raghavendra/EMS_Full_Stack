package com.example.hr_service.security;

import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.entity.User;
import com.example.hr_service.exception.ForbiddenOperationException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.Optional;

/**
 * Access to the signed-in account plus the ownership rules shared by every
 * service ("employees can only see their own records").
 */
@Service
public class CurrentUserService {

    public User getCurrentUser() {
        return findCurrentUser().orElseThrow(
                () -> new AuthenticationCredentialsNotFoundException("Authentication required"));
    }

    /** Empty when no one is signed in (e.g. during login or first-time setup). */
    public Optional<User> findCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        if (authentication.getPrincipal() instanceof User user) {
            return Optional.of(user);
        }
        return Optional.empty();
    }

    public Long getCurrentUserId() {
        return getCurrentUser().getUserId();
    }

    public Long getCurrentEmployeeId() {
        return getCurrentUser().getEmployee().getEmployeeId();
    }

    public SystemRole getCurrentRole() {
        return getCurrentUser().getSystemRole();
    }

    public boolean isAdmin() {
        return getCurrentRole() == SystemRole.ADMIN;
    }

    /** ADMIN or HR. */
    public boolean isManager() {
        return getCurrentRole().isManager();
    }

    public boolean isEmployeeOnly() {
        return getCurrentRole() == SystemRole.EMPLOYEE;
    }

    public boolean isSelf(Long employeeId) {
        return Objects.equals(getCurrentEmployeeId(), employeeId);
    }

    /** Employees may only touch their own employee id; managers may touch any. */
    public void requireSelfOrManager(Long employeeId, String message) {
        if (!isManager() && !isSelf(employeeId)) {
            throw new ForbiddenOperationException(message);
        }
    }

    /**
     * Role hierarchy for managing other people: ADMIN can manage everyone,
     * HR can manage plain employees (and people without an account), and
     * nobody below HR can manage anyone.
     *
     * @param targetRole the role of the account being managed, or null when
     *                   the employee has no account yet
     */
    public boolean canManage(SystemRole targetRole) {
        SystemRole actor = getCurrentRole();
        if (actor == SystemRole.ADMIN) {
            return true;
        }
        if (actor == SystemRole.HR) {
            return targetRole == null || targetRole == SystemRole.EMPLOYEE;
        }
        return false;
    }

    /** Usernames for the audit trail; "system" for unauthenticated work. */
    public String currentUsernameOrSystem() {
        return findCurrentUser().map(User::getUsername).orElse("system");
    }
}
