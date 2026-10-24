package com.example.hr_service.repository;

import com.example.hr_service.entity.Designation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DesignationRepository extends JpaRepository<Designation, Long> {

    List<Designation> findByDepartment_DepartmentIdOrderByDesignationNameAsc(Long departmentId);

    @Query("SELECT d FROM Designation d JOIN d.department dep ORDER BY dep.departmentName, d.designationName")
    List<Designation> findAllSorted();

    boolean existsByDesignationNameIgnoreCaseAndDepartment_DepartmentId(String designationName, Long departmentId);

    boolean existsByDesignationNameIgnoreCaseAndDepartment_DepartmentIdAndDesignationIdNot(
            String designationName, Long departmentId, Long designationId);

    long countByDepartment_DepartmentId(Long departmentId);
}
