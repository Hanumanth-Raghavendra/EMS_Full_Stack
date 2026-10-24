package com.example.hr_service.controller;

import com.example.hr_service.dto.DepartmentRequest;
import com.example.hr_service.dto.DepartmentResponse;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@PreAuthorize(Access.MANAGER)
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public List<DepartmentResponse> list() {
        return departmentService.listDepartments();
    }

    @GetMapping("/{departmentId}")
    public DepartmentResponse get(@PathVariable Long departmentId) {
        return departmentService.getDepartment(departmentId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DepartmentResponse create(@Valid @RequestBody DepartmentRequest request) {
        return departmentService.createDepartment(request);
    }

    @PutMapping("/{departmentId}")
    public DepartmentResponse update(@PathVariable Long departmentId, @Valid @RequestBody DepartmentRequest request) {
        return departmentService.updateDepartment(departmentId, request);
    }

    @DeleteMapping("/{departmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long departmentId) {
        departmentService.deleteDepartment(departmentId);
    }
}
