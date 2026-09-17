package com.example.hr_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class UserRequestDTO {
    @NotNull private Long employeeId;
    @NotBlank @Size(min = 3, max = 50) private String username;
    @Size(max = 255) private String passwordHash;
    @NotNull private Long roleId;
    @NotNull private Boolean enabled;

    public UserRequestDTO() {}
    public Long getEmployeeId(){ return employeeId; }
    public void setEmployeeId(Long employeeId){ this.employeeId=employeeId; }
    public String getUsername(){ return username; }
    public void setUsername(String username){ this.username=username; }
    public String getPasswordHash(){ return passwordHash; }
    public void setPasswordHash(String passwordHash){ this.passwordHash=passwordHash; }
    public Long getRoleId(){ return roleId; }
    public void setRoleId(Long roleId){ this.roleId=roleId; }
    public Boolean getEnabled(){ return enabled; }
    public void setEnabled(Boolean enabled){ this.enabled=enabled; }
}
