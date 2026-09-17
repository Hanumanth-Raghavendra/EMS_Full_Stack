package com.example.hr_service.repository;

import com.example.hr_service.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByRole_RoleName(String roleName);

    Optional<User> findByEmployee_EmployeeId(Long employeeId);
}