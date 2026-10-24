package com.example.hr_service.dto;

import com.example.hr_service.entity.EmployeeStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record EmployeeRequest(
        @NotBlank(message = "Employee code is required.")
        @Pattern(regexp = ValidationPatterns.EMPLOYEE_CODE, message = ValidationPatterns.EMPLOYEE_CODE_MESSAGE)
        String employeeCode,

        @NotBlank(message = "First name is required.")
        @Size(max = 50, message = "First name must be at most 50 characters.")
        @Pattern(regexp = ValidationPatterns.PERSON_NAME, message = ValidationPatterns.PERSON_NAME_MESSAGE)
        String firstName,

        @NotBlank(message = "Last name is required.")
        @Size(max = 50, message = "Last name must be at most 50 characters.")
        @Pattern(regexp = ValidationPatterns.PERSON_NAME, message = ValidationPatterns.PERSON_NAME_MESSAGE)
        String lastName,

        @NotBlank(message = "Email is required.")
        @Email(message = "Enter a valid email address.")
        @Size(max = 100, message = "Email must be at most 100 characters.")
        String email,

        @NotBlank(message = "Phone is required.")
        @Pattern(regexp = ValidationPatterns.PHONE, message = ValidationPatterns.PHONE_MESSAGE)
        String phone,

        @NotNull(message = "Date of joining is required.")
        @PastOrPresent(message = "Date of joining cannot be in the future.")
        LocalDate dateOfJoining,

        @NotNull(message = "Department is required.")
        Long departmentId,

        @NotNull(message = "Designation is required.")
        Long designationId,

        @NotNull(message = "Status is required.")
        EmployeeStatus status) {
}
