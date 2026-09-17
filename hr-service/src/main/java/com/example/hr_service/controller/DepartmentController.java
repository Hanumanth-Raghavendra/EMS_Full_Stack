package com.example.hr_service.controller;

import com.example.hr_service.entity.Department;
import com.example.hr_service.repository.DepartmentRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;

    public DepartmentController(
            DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @GetMapping
    public ResponseEntity<List<Department>> getAllDepartments() {
        return ResponseEntity.ok(
                departmentRepository.findAll());
    }

    @GetMapping("/{departmentId}")
    public ResponseEntity<Department> getDepartmentById(
            @PathVariable Long departmentId) {

        return departmentRepository.findById(departmentId)
                .map(ResponseEntity::ok)
                .orElseGet(
                        () -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Department> createDepartment(
            @RequestBody Department department) {

        if (department.getDepartmentName() == null
                || department.getDepartmentName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        department.setDepartmentId(null);

        Department savedDepartment = departmentRepository.save(department);

        return ResponseEntity.ok(savedDepartment);
    }

    @PutMapping("/{departmentId}")
    public ResponseEntity<Department> updateDepartment(
            @PathVariable Long departmentId,
            @RequestBody Department department) {

        Department existingDepartment = departmentRepository.findById(departmentId)
                .orElse(null);

        if (existingDepartment == null) {
            return ResponseEntity.notFound().build();
        }

        if (department.getDepartmentName() == null
                || department.getDepartmentName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        existingDepartment.setDepartmentName(
                department.getDepartmentName());

        existingDepartment.setDescription(
                department.getDescription());

        Department updatedDepartment = departmentRepository.save(existingDepartment);

        return ResponseEntity.ok(updatedDepartment);
    }

    @DeleteMapping("/{departmentId}")
    public ResponseEntity<Void> deleteDepartment(
            @PathVariable Long departmentId) {

        if (!departmentRepository.existsById(departmentId)) {
            return ResponseEntity.notFound().build();
        }

        departmentRepository.deleteById(departmentId);

        return ResponseEntity.noContent().build();
    }
}