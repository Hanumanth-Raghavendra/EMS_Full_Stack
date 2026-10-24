package com.example.hr_service.dto;

import com.example.hr_service.entity.AuditLog;

import java.time.LocalDateTime;

public record AuditLogResponse(
        Long auditId,
        Long userId,
        String username,
        String action,
        String entityName,
        Long entityId,
        String oldValue,
        String newValue,
        LocalDateTime createdAt) {

    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(
                log.getAuditId(),
                log.getUserId(),
                log.getUsername(),
                log.getAction(),
                log.getEntityName(),
                log.getEntityId(),
                log.getOldValue(),
                log.getNewValue(),
                log.getCreatedAt());
    }
}
