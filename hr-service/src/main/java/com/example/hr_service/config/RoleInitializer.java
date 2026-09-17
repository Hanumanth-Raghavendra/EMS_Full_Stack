package com.example.hr_service.config;

import com.example.hr_service.entity.Role;
import com.example.hr_service.repository.RoleRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RoleInitializer {

    @Bean
    ApplicationRunner ensureEmployeeRole(RoleRepository roleRepository) {
        return args -> roleRepository.findByRoleNameIgnoreCase("EMPLOYEE")
                .orElseGet(() -> {
                    Role employeeRole = new Role();
                    employeeRole.setRoleName("EMPLOYEE");
                    return roleRepository.save(employeeRole);
                });
    }
}
