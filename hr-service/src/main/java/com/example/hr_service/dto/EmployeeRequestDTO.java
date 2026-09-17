package com.example.hr_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class EmployeeRequestDTO {

    @NotBlank
    @Size(max = 30)
    @Pattern(regexp = "[A-Za-z0-9_-]+", message = "Employee code may contain only letters, numbers, hyphens and underscores")
    private String employeeCode;

    @NotBlank
    @Size(max = 50)
    @Pattern(regexp = "[A-Za-z]+(?:[ '-][A-Za-z]+)*", message = "Invalid first name")
    private String firstName;

    @NotBlank
    @Size(max = 50)
    @Pattern(regexp = "[A-Za-z]+(?:[ '-][A-Za-z]+)*", message = "Invalid last name")
    private String lastName;

    @NotBlank
    @Email
    @Size(max = 100)
    private String email;

    @NotBlank
    @Pattern(regexp = "[6-9][0-9]{9}", message = "Phone must be a valid 10-digit mobile number")
    private String phone;

    @NotNull
    @PastOrPresent(message = "Date of joining cannot be in the future")
    private LocalDate dateOfJoining;

    @NotNull
    private Long departmentId;

    @NotNull
    private Long designationId;

    @NotBlank
    @Pattern(regexp = "ACTIVE|INACTIVE", message = "Status must be ACTIVE or INACTIVE")
    private String status;

    public EmployeeRequestDTO() {}
    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public LocalDate getDateOfJoining() { return dateOfJoining; }
    public void setDateOfJoining(LocalDate dateOfJoining) { this.dateOfJoining = dateOfJoining; }
    public Long getDepartmentId() { return departmentId; }
    public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }
    public Long getDesignationId() { return designationId; }
    public void setDesignationId(Long designationId) { this.designationId = designationId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
