package com.example.hr_service.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import com.example.hr_service.dto.RoleRequestDTO;
import com.example.hr_service.dto.RoleResponseDTO;
import com.example.hr_service.service.RoleService;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public ResponseEntity<List<RoleResponseDTO>> getAllRoles() {

        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @GetMapping("/{roleId}")
    public ResponseEntity<RoleResponseDTO> getRoleById(
            @PathVariable Long roleId) {

        RoleResponseDTO role = roleService.getRoleById(roleId);

        if (role == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(role);
    }

    @PostMapping
    public ResponseEntity<RoleResponseDTO> createRole(
            @Valid @RequestBody RoleRequestDTO dto) {

        return ResponseEntity.ok(
                roleService.createRole(dto));
    }

    @PutMapping("/{roleId}")
    public ResponseEntity<RoleResponseDTO> updateRole(
            @PathVariable Long roleId,
            @Valid @RequestBody RoleRequestDTO dto) {

        return ResponseEntity.ok(
                roleService.updateRole(roleId, dto));
    }

    @DeleteMapping("/{roleId}")
    public ResponseEntity<Void> deleteRole(
            @PathVariable Long roleId) {

        roleService.deleteRole(roleId);

        return ResponseEntity.noContent().build();
    }
}