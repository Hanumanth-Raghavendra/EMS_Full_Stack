package com.example.hr_service.controller;

import com.example.hr_service.dto.ProjectRequestDTO;
import com.example.hr_service.dto.ProjectResponseDTO;
import com.example.hr_service.service.ProjectService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponseDTO>> getAllProjects() {

        return ResponseEntity.ok(projectService.getAllProjects());
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectResponseDTO> getProjectById(
            @PathVariable Long projectId) {

        ProjectResponseDTO project = projectService.getProjectById(projectId);

        if (project == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(project);
    }

    @PostMapping
    public ResponseEntity<ProjectResponseDTO> createProject(
            @Valid @RequestBody ProjectRequestDTO projectRequestDTO) {

        return ResponseEntity.ok(
                projectService.createProject(projectRequestDTO));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectResponseDTO> updateProject(
            @PathVariable Long projectId,
            @Valid @RequestBody ProjectRequestDTO projectRequestDTO) {

        return ResponseEntity.ok(
                projectService.updateProject(projectId, projectRequestDTO));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable Long projectId) {

        projectService.deleteProject(projectId);

        return ResponseEntity.noContent().build();
    }
}