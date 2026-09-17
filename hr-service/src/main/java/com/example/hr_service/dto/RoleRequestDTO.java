package com.example.hr_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RoleRequestDTO {
    @NotBlank @Size(min=2,max=50)
    private String roleName;
    public RoleRequestDTO() {}
    public String getRoleName(){return roleName;}
    public void setRoleName(String roleName){this.roleName=roleName;}
}
