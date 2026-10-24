package com.example.hr_service.dto;

import java.util.List;

public record AuditFiltersResponse(List<String> actions, List<String> entityNames) {
}
