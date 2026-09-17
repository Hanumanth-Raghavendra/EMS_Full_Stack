package com.example.hr_service.service;

import com.example.hr_service.dto.InitialAdminRequestDTO;
import com.example.hr_service.dto.InitialAdminResponseDTO;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.Role;
import com.example.hr_service.entity.User;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.RoleRepository;
import com.example.hr_service.repository.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SetupService {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public SetupService(
            UserRepository userRepository,
            EmployeeRepository employeeRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public boolean isInitialSetupRequired() {
        return !userRepository.existsByRole_RoleName("ADMIN");
    }

    @Transactional
    public InitialAdminResponseDTO createFirstAdmin(
            InitialAdminRequestDTO dto) {

        /*
         * Critical safety check:
         * the initial-admin endpoint is allowed only when
         * there is currently no ADMIN user.
         *
         * Existing non-admin users are allowed because
         * an existing account may be promoted to ADMIN.
         */
        if (userRepository.existsByRole_RoleName("ADMIN")) {
            throw new IllegalStateException(
                    "Initial admin setup is not available while an ADMIN exists.");
        }

        Employee employee = employeeRepository.findById(
                dto.getEmployeeId()).orElseThrow(
                        () -> new IllegalArgumentException(
                                "Employee not found."));

        Role adminRole = roleRepository.findAll()
                .stream()
                .filter(role -> "ADMIN".equalsIgnoreCase(
                        role.getRoleName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "ADMIN role not found."));

        /*
         * Check whether this employee already has a user account.
         *
         * If they do, promote the existing account instead of
         * creating another User record.
         */
        User user = userRepository.findByEmployee_EmployeeId(
                employee.getEmployeeId()).orElse(null);

        if (user == null) {

            // No existing account -> create one
            user = new User();

            user.setEmployee(employee);
            user.setUsername(dto.getUsername().trim());
            user.setPasswordHash(
                    passwordEncoder.encode(dto.getPassword()));
            user.setEnabled(true);

        } else {

            // Existing account -> promote it to ADMIN
            user.setUsername(dto.getUsername().trim());
            user.setPasswordHash(
                    passwordEncoder.encode(dto.getPassword()));
        }

        user.setRole(adminRole);

        User savedUser = userRepository.save(user);

        return new InitialAdminResponseDTO(
                "Initial ADMIN account created successfully.",
                savedUser.getUserId(),
                savedUser.getUsername(),
                adminRole.getRoleName());
    }
}