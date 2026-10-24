package com.example.hr_service.controller;

import com.example.hr_service.dto.ProjectRequest;
import com.example.hr_service.dto.ProjectResponse;
import com.example.hr_service.entity.ProjectStatus;
import com.example.hr_service.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    @PreAuthorize(Access.AUTHENTICATED)
    public List<ProjectResponse> list(@RequestParam(required = false) String search,
                                      @RequestParam(required = false) ProjectStatus status) {
        return projectService.listProjects(search, status);
    }

    @GetMapping("/{projectId}")
    @PreAuthorize(Access.AUTHENTICATED)
    public ProjectResponse get(@PathVariable Long projectId) {
        return projectService.getProject(projectId);
    }

    @PostMapping
    @PreAuthorize(Access.MANAGER)
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@Valid @RequestBody ProjectRequest request) {
        return projectService.createProject(request);
    }

    @PutMapping("/{projectId}")
    @PreAuthorize(Access.MANAGER)
    public ProjectResponse update(@PathVariable Long projectId, @Valid @RequestBody ProjectRequest request) {
        return projectService.updateProject(projectId, request);
    }

    @DeleteMapping("/{projectId}")
    @PreAuthorize(Access.MANAGER)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long projectId) {
        projectService.deleteProject(projectId);
    }
}
