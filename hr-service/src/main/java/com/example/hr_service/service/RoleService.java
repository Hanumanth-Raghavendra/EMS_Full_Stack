package com.example.hr_service.service;

import java.util.List;

import com.example.hr_service.dto.RoleRequestDTO;
import com.example.hr_service.dto.RoleResponseDTO;

public interface RoleService {

    List<RoleResponseDTO> getAllRoles();

    RoleResponseDTO getRoleById(Long roleId);

    RoleResponseDTO createRole(RoleRequestDTO dto);

    RoleResponseDTO updateRole(Long roleId, RoleRequestDTO dto);

    void deleteRole(Long roleId);
}