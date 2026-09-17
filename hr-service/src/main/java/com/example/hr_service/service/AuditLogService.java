package com.example.hr_service.service;

import com.example.hr_service.dto.AuditLogRequestDTO;
import com.example.hr_service.dto.AuditLogResponseDTO;

import java.util.List;

public interface AuditLogService {

    List<AuditLogResponseDTO> getAllAuditLogs();

    AuditLogResponseDTO getAuditLogById(Long auditId);

    AuditLogResponseDTO createAuditLog(AuditLogRequestDTO auditLogRequestDTO);

    AuditLogResponseDTO updateAuditLog(
            Long auditId,
            AuditLogRequestDTO auditLogRequestDTO);

    void deleteAuditLog(Long auditId);
}