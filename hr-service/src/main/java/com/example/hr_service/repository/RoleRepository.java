package com.example.hr_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

import com.example.hr_service.entity.Role;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByRoleNameIgnoreCase(String roleName);
}