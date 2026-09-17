package com.example.hr_service.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.hr_service.dto.AuditLogRequestDTO;
import com.example.hr_service.dto.AuditLogResponseDTO;
import com.example.hr_service.entity.AuditLog;

@Mapper(componentModel = "spring")
public interface AuditLogMapper {

    @Mapping(target = "auditId", ignore = true)
    AuditLog toEntity(AuditLogRequestDTO dto);

    AuditLogResponseDTO toResponseDTO(AuditLog auditLog);
}