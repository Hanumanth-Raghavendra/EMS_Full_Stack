package com.example.hr_service.security;

import com.example.hr_service.entity.User;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof User user)) {
            throw new AuthenticationCredentialsNotFoundException("Authenticated user not available");
        }

        return user;
    }

    public Long getCurrentUserId() {
        return getCurrentUser().getUserId();
    }

    public Long getCurrentEmployeeId() {
        return getCurrentUser().getEmployee().getEmployeeId();
    }

    public boolean isEmployee() {
        return "EMPLOYEE".equalsIgnoreCase(getCurrentUser().getRole().getRoleName());
    }

    public boolean isAdminOrHr() {
        String role = getCurrentUser().getRole().getRoleName();
        return "ADMIN".equalsIgnoreCase(role) || "HR".equalsIgnoreCase(role);
    }

    public void requireOwnEmployee(Long employeeId) {
        if (isEmployee() && !getCurrentEmployeeId().equals(employeeId)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Employees can access only their own employee record.");
        }
    }
}
