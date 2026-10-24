package com.example.hr_service.service;

import com.example.hr_service.dto.AuditFiltersResponse;
import com.example.hr_service.dto.AuditLogResponse;
import com.example.hr_service.dto.PageResponse;
import com.example.hr_service.exception.BadRequestException;
import com.example.hr_service.repository.AuditLogRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

/** Read-only access to the audit trail. There are deliberately no write endpoints. */
@Service
public class AuditLogService {

    private static final Map<String, String> SORTS = Map.of(
            "createdAt", "createdAt",
            "action", "action",
            "entityName", "entityName",
            "username", "username");

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> search(String action, String entityName, String username,
                                                 LocalDate from, LocalDate to,
                                                 Integer page, Integer size, String sort) {
        if (from != null && to != null && from.isAfter(to)) {
            throw BadRequestException.field("from", "'From' date must be on or before the 'to' date.");
        }
        LocalDateTime start = from == null ? LocalDateTime.of(1900, 1, 1, 0, 0) : from.atStartOfDay();
        LocalDateTime end = to == null ? LocalDateTime.of(2999, 12, 31, 0, 0) : to.plusDays(1).atStartOfDay();
        Sort defaultSort = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("auditId"));

        return PageResponse.from(
                auditLogRepository.search(
                        Texts.isBlank(action) ? "" : action.trim(),
                        Texts.isBlank(entityName) ? "" : entityName.trim(),
                        PageRequests.likePattern(username),
                        start, end,
                        PageRequests.of(page, size, sort, SORTS, defaultSort)),
                AuditLogResponse::from);
    }

    @Transactional(readOnly = true)
    public AuditFiltersResponse filters() {
        return new AuditFiltersResponse(auditLogRepository.findDistinctActions(),
                auditLogRepository.findDistinctEntityNames());
    }
}
