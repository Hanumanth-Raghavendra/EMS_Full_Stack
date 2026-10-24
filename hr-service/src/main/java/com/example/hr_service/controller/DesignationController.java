package com.example.hr_service.controller;

import com.example.hr_service.dto.DesignationRequest;
import com.example.hr_service.dto.DesignationResponse;
import com.example.hr_service.service.DepartmentService;
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
@RequestMapping("/api/designations")
@PreAuthorize(Access.MANAGER)
public class DesignationController {

    private final DepartmentService departmentService;

    public DesignationController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public List<DesignationResponse> list(@RequestParam(required = false) Long departmentId) {
        return departmentService.listDesignations(departmentId);
    }

    /** Kept for backwards compatibility with older clients. */
    @GetMapping("/department/{departmentId}")
    public List<DesignationResponse> byDepartment(@PathVariable Long departmentId) {
        return departmentService.listDesignations(departmentId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DesignationResponse create(@Valid @RequestBody DesignationRequest request) {
        return departmentService.createDesignation(request);
    }

    @PutMapping("/{designationId}")
    public DesignationResponse update(@PathVariable Long designationId,
                                      @Valid @RequestBody DesignationRequest request) {
        return departmentService.updateDesignation(designationId, request);
    }

    @DeleteMapping("/{designationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long designationId) {
        departmentService.deleteDesignation(designationId);
    }
}
