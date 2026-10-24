package com.example.hr_service.repository;

import com.example.hr_service.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findFirstByRoleNameIgnoreCaseOrderByRoleIdAsc(String roleName);
}
