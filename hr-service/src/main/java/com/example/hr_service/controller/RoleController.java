package com.example.hr_service.controller;

import com.example.hr_service.dto.RoleResponse;
import com.example.hr_service.service.RoleService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Read-only: roles are fixed system roles. */
@RestController
@RequestMapping("/api/roles")
@PreAuthorize(Access.MANAGER)
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public List<RoleResponse> list() {
        return roleService.list();
    }
}
