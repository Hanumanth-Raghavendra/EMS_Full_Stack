package com.example.hr_service.dto;

import com.example.hr_service.entity.SystemRole;

import java.util.List;

public record RoleResponse(
        Long roleId,
        SystemRole roleName,
        String label,
        String description,
        long userCount,
        List<String> permissions) {
}
