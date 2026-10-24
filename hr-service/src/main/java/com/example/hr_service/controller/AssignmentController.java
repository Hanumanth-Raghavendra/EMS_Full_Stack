package com.example.hr_service.controller;

import com.example.hr_service.dto.AssignmentRequest;
import com.example.hr_service.dto.AssignmentResponse;
import com.example.hr_service.dto.AssignmentUpdateRequest;
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

/** Employee-to-project assignments. */
@RestController
@RequestMapping("/api/employee-projects")
public class AssignmentController {

    private final ProjectService projectService;

    public AssignmentController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    @PreAuthorize(Access.AUTHENTICATED)
    public List<AssignmentResponse> list(@RequestParam(required = false) Long employeeId,
                                         @RequestParam(required = false) Long projectId) {
        return projectService.listAssignments(employeeId, projectId);
    }

    @PostMapping
    @PreAuthorize(Access.MANAGER)
    @ResponseStatus(HttpStatus.CREATED)
    public AssignmentResponse assign(@Valid @RequestBody AssignmentRequest request) {
        return projectService.assign(request);
    }

    @PutMapping("/{employeeId}/{projectId}")
    @PreAuthorize(Access.MANAGER)
    public AssignmentResponse update(@PathVariable Long employeeId, @PathVariable Long projectId,
                                     @Valid @RequestBody AssignmentUpdateRequest request) {
        return projectService.updateAssignment(employeeId, projectId, request);
    }

    @DeleteMapping("/{employeeId}/{projectId}")
    @PreAuthorize(Access.MANAGER)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unassign(@PathVariable Long employeeId, @PathVariable Long projectId) {
        projectService.unassign(employeeId, projectId);
    }
}
