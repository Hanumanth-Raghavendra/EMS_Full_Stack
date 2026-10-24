package com.example.hr_service.dto;

import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.security.PasswordPolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record UserCreateRequest(
        @NotNull(message = "Employee is required.")
        Long employeeId,

        @NotBlank(message = "Username is required.")
        @Pattern(regexp = ValidationPatterns.USERNAME, message = ValidationPatterns.USERNAME_MESSAGE)
        String username,

        @NotBlank(message = "Password is required.")
        @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
        String password,

        @NotNull(message = "Role is required.")
        SystemRole role,

        Boolean enabled) {
}
