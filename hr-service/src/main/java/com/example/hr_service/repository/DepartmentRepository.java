package com.example.hr_service.repository;

import com.example.hr_service.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    boolean existsByDepartmentNameIgnoreCase(String departmentName);

    boolean existsByDepartmentNameIgnoreCaseAndDepartmentIdNot(String departmentName, Long departmentId);

    List<Department> findAllByOrderByDepartmentNameAsc();
}
