package com.example.hr_service.service;

import com.example.hr_service.dto.RoleResponse;
import com.example.hr_service.entity.Role;
import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.repository.RoleRepository;
import com.example.hr_service.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Roles are fixed system roles (ADMIN, HR, EMPLOYEE) seeded by migrations.
 * They are read-only through the API: renaming or deleting a role used to
 * be possible and could silently break authorisation.
 */
@Service
public class RoleService {

    private static final Map<SystemRole, List<String>> PERMISSIONS = Map.of(
            SystemRole.ADMIN, List.of(
                    "Everything HR can do",
                    "Create and manage HR and administrator accounts",
                    "Approve leave for HR staff",
                    "View the audit trail"),
            SystemRole.HR, List.of(
                    "Manage employees, departments and designations",
                    "Record and correct attendance",
                    "Approve or reject employee leave",
                    "Manage projects and assignments",
                    "Create and manage employee (non-HR) accounts"),
            SystemRole.EMPLOYEE, List.of(
                    "View own profile and update contact details",
                    "Check in / check out and view own attendance",
                    "Apply for, edit and cancel own leave",
                    "View own project assignments"));

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    public RoleService(RoleRepository roleRepository,
                       UserRepository userRepository) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public List<RoleResponse> list() {
        return Arrays.stream(SystemRole.values())
                .sorted(Comparator.comparing(SystemRole::ordinal).reversed())
                .map(role -> {
                    Role entity = getRoleEntity(role);
                    return new RoleResponse(entity.getRoleId(), role, role.label(), role.description(),
                            userRepository.countByRole_RoleId(entity.getRoleId()), PERMISSIONS.get(role));
                })
                .toList();
    }

    /**
     * Returns the row for a system role, creating it if a database somehow
     * lacks it (migrations normally seed all three).
     */
    @Transactional
    public Role getRoleEntity(SystemRole role) {
        return roleRepository.findFirstByRoleNameIgnoreCaseOrderByRoleIdAsc(role.name())
                .orElseGet(() -> {
                    Role created = new Role();
                    created.setRoleName(role.name());
                    return roleRepository.save(created);
                });
    }
}
