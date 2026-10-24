package com.example.hr_service.dto;

import com.example.hr_service.security.PasswordPolicy;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Creates the very first administrator.
 *
 * Either link to an existing employee via {@code existingEmployeeCode}, or
 * provide the employee details below and a new employee record is created.
 */
public record InitialAdminRequest(
        @Size(max = 200)
        String setupToken,

        @Size(max = 30)
        String existingEmployeeCode,

        @Pattern(regexp = ValidationPatterns.EMPLOYEE_CODE, message = ValidationPatterns.EMPLOYEE_CODE_MESSAGE)
        String employeeCode,

        @Size(max = 50)
        @Pattern(regexp = ValidationPatterns.PERSON_NAME, message = ValidationPatterns.PERSON_NAME_MESSAGE)
        String firstName,

        @Size(max = 50)
        @Pattern(regexp = ValidationPatterns.PERSON_NAME, message = ValidationPatterns.PERSON_NAME_MESSAGE)
        String lastName,

        @Email(message = "Enter a valid email address.")
        @Size(max = 100)
        String email,

        @Pattern(regexp = ValidationPatterns.PHONE, message = ValidationPatterns.PHONE_MESSAGE)
        String phone,

        @NotBlank(message = "Username is required.")
        @Pattern(regexp = ValidationPatterns.USERNAME, message = ValidationPatterns.USERNAME_MESSAGE)
        String username,

        @NotBlank(message = "Password is required.")
        @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
        String password) {
}
