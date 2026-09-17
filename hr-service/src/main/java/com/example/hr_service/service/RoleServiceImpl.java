package com.example.hr_service.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.hr_service.dto.RoleRequestDTO;
import com.example.hr_service.dto.RoleResponseDTO;
import com.example.hr_service.entity.Role;
import com.example.hr_service.exception.ResourceNotFoundException;
import com.example.hr_service.mapper.RoleMapper;
import com.example.hr_service.repository.RoleRepository;

@Service
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;

    public RoleServiceImpl(
            RoleRepository roleRepository,
            RoleMapper roleMapper) {

        this.roleRepository = roleRepository;
        this.roleMapper = roleMapper;
    }

    @Override
    public List<RoleResponseDTO> getAllRoles() {

        return roleRepository.findAll()
                .stream()
                .map(roleMapper::toResponseDTO)
                .toList();
    }

    @Override
    public RoleResponseDTO getRoleById(Long roleId) {

        Role role = roleRepository.findById(roleId)
                .orElse(null);

        if (role == null) {
            return null;
        }

        return roleMapper.toResponseDTO(role);
    }

    @Override
    public RoleResponseDTO createRole(RoleRequestDTO dto) {

        Role role = roleMapper.toEntity(dto);

        Role savedRole = roleRepository.save(role);

        return roleMapper.toResponseDTO(savedRole);
    }

    @Override
    public RoleResponseDTO updateRole(
            Long roleId,
            RoleRequestDTO dto) {

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        role.setRoleName(dto.getRoleName());

        Role updatedRole = roleRepository.save(role);

        return roleMapper.toResponseDTO(updatedRole);
    }

    @Override
    public void deleteRole(Long roleId) {

        roleRepository.deleteById(roleId);
    }
}