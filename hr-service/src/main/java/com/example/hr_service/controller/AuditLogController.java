package com.example.hr_service.controller;

import com.example.hr_service.dto.AuditFiltersResponse;
import com.example.hr_service.dto.AuditLogResponse;
import com.example.hr_service.dto.PageResponse;
import com.example.hr_service.service.AuditLogService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/** Read-only audit trail (administrators only). */
@RestController
@RequestMapping("/api/audit-logs")
@PreAuthorize(Access.ADMIN)
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public PageResponse<AuditLogResponse> search(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityName,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort) {
        return auditLogService.search(action, entityName, username, from, to, page, size, sort);
    }

    @GetMapping("/filters")
    public AuditFiltersResponse filters() {
        return auditLogService.filters();
    }
}
