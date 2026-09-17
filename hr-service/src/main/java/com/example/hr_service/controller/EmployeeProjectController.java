package com.example.hr_service.controller;

import com.example.hr_service.dto.EmployeeProjectRequestDTO;
import com.example.hr_service.dto.EmployeeProjectResponseDTO;
import com.example.hr_service.service.EmployeeProjectService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/employee-projects")
public class EmployeeProjectController {

    private final EmployeeProjectService employeeProjectService;

    public EmployeeProjectController(
            EmployeeProjectService employeeProjectService) {

        this.employeeProjectService = employeeProjectService;
    }

    @GetMapping
    public ResponseEntity<List<EmployeeProjectResponseDTO>> getAllEmployeeProjects() {

        return ResponseEntity.ok(
                employeeProjectService.getAllEmployeeProjects());
    }

    @GetMapping("/{employeeId}/{projectId}")
    public ResponseEntity<EmployeeProjectResponseDTO> getEmployeeProjectById(
            @PathVariable Long employeeId,
            @PathVariable Long projectId) {

        EmployeeProjectResponseDTO employeeProject = employeeProjectService.getEmployeeProjectById(
                employeeId, projectId);

        if (employeeProject == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(employeeProject);
    }

    @PostMapping
    public ResponseEntity<EmployeeProjectResponseDTO> createEmployeeProject(
                    @Valid @RequestBody EmployeeProjectRequestDTO dto) {

        return ResponseEntity.ok(
                employeeProjectService.createEmployeeProject(
                        dto));
    }

    @PutMapping("/{employeeId}/{projectId}")
    public ResponseEntity<EmployeeProjectResponseDTO> updateEmployeeProject(
            @PathVariable Long employeeId,
            @PathVariable Long projectId,
                    @Valid @RequestBody EmployeeProjectRequestDTO dto) {

        return ResponseEntity.ok(
                employeeProjectService.updateEmployeeProject(
                        employeeId,
                        projectId,
                        dto));
    }

    @DeleteMapping("/{employeeId}/{projectId}")
    public ResponseEntity<Void> deleteEmployeeProject(
            @PathVariable Long employeeId,
            @PathVariable Long projectId) {

        employeeProjectService.deleteEmployeeProject(
                employeeId, projectId);

        return ResponseEntity.noContent().build();
    }
}