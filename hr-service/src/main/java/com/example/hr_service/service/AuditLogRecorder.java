package com.example.hr_service.service;

import com.example.hr_service.entity.AuditLog;
import com.example.hr_service.repository.AuditLogRepository;
import com.example.hr_service.security.CurrentUserService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuditLogRecorder {

    private final AuditLogRepository auditLogRepository;
    private final CurrentUserService currentUserService;

    public AuditLogRecorder(
            AuditLogRepository auditLogRepository,
            CurrentUserService currentUserService) {
        this.auditLogRepository = auditLogRepository;
        this.currentUserService = currentUserService;
    }

    public void record(
            String action,
            String entityName,
            Long entityId,
            String oldValue,
            String newValue) {

        AuditLog auditLog = new AuditLog();
        auditLog.setUserId(currentUserService.getCurrentUserId());
        auditLog.setAction(action);
        auditLog.setEntityName(entityName);
        auditLog.setEntityId(entityId);
        auditLog.setOldValue(oldValue);
        auditLog.setNewValue(newValue);
        auditLog.setCreatedAt(LocalDateTime.now());

        auditLogRepository.save(auditLog);
    }
}
