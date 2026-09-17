package com.example.hr_service.controller;

import com.example.hr_service.dto.AuditLogRequestDTO;
import com.example.hr_service.dto.AuditLogResponseDTO;
import com.example.hr_service.service.AuditLogService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<List<AuditLogResponseDTO>> getAllAuditLogs() {

        return ResponseEntity.ok(auditLogService.getAllAuditLogs());
    }

    @GetMapping("/{auditId}")
    public ResponseEntity<AuditLogResponseDTO> getAuditLogById(
            @PathVariable Long auditId) {

        AuditLogResponseDTO auditLog =
                auditLogService.getAuditLogById(auditId);

        if (auditLog == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(auditLog);
    }

    @PostMapping
    public ResponseEntity<AuditLogResponseDTO> createAuditLog(
            @Valid @RequestBody AuditLogRequestDTO dto) {

        return ResponseEntity.ok(
                auditLogService.createAuditLog(dto));
    }

    @PutMapping("/{auditId}")
    public ResponseEntity<AuditLogResponseDTO> updateAuditLog(
            @PathVariable Long auditId,
            @Valid @RequestBody AuditLogRequestDTO dto) {

        return ResponseEntity.ok(
                auditLogService.updateAuditLog(
                        auditId, dto));
    }

    @DeleteMapping("/{auditId}")
    public ResponseEntity<Void> deleteAuditLog(
            @PathVariable Long auditId) {

        auditLogService.deleteAuditLog(auditId);

        return ResponseEntity.noContent().build();
    }
}