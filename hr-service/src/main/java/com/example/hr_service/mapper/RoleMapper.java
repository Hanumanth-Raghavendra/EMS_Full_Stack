package com.example.hr_service.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.hr_service.dto.RoleRequestDTO;
import com.example.hr_service.dto.RoleResponseDTO;
import com.example.hr_service.entity.Role;

@Mapper(componentModel = "spring")
public interface RoleMapper {

    @Mapping(target = "roleId", ignore = true)
    Role toEntity(RoleRequestDTO dto);

    RoleResponseDTO toResponseDTO(Role role);
}