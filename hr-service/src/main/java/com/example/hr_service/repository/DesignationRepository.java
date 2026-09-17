package com.example.hr_service.repository;

import com.example.hr_service.entity.Designation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DesignationRepository
                extends JpaRepository<Designation, Long> {

        List<Designation> findByDepartmentDepartmentId(
                        Long departmentId);
}