package com.example.hr_service.controller;

import com.example.hr_service.dto.EmployeeContactRequest;
import com.example.hr_service.dto.EmployeeOption;
import com.example.hr_service.dto.EmployeeRequest;
import com.example.hr_service.dto.EmployeeResponse;
import com.example.hr_service.dto.PageResponse;
import com.example.hr_service.entity.EmployeeStatus;
import com.example.hr_service.service.EmployeeService;
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
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    /** Managers search everyone; employees receive only their own record. */
    @GetMapping
    @PreAuthorize(Access.AUTHENTICATED)
    public PageResponse<EmployeeResponse> search(@RequestParam(required = false) String search,
                                                 @RequestParam(required = false) Long departmentId,
                                                 @RequestParam(required = false) EmployeeStatus status,
                                                 @RequestParam(required = false) Integer page,
                                                 @RequestParam(required = false) Integer size,
                                                 @RequestParam(required = false) String sort) {
        return employeeService.search(search, departmentId, status, page, size, sort);
    }

    @GetMapping("/options")
    @PreAuthorize(Access.MANAGER)
    public List<EmployeeOption> options(@RequestParam(defaultValue = "true") boolean activeOnly,
                                        @RequestParam(defaultValue = "false") boolean withoutAccount) {
        return employeeService.options(activeOnly, withoutAccount);
    }

    @GetMapping("/me")
    @PreAuthorize(Access.AUTHENTICATED)
    public EmployeeResponse me() {
        return employeeService.me();
    }

    @PutMapping("/me/contact")
    @PreAuthorize(Access.AUTHENTICATED)
    public EmployeeResponse updateMyContact(@Valid @RequestBody EmployeeContactRequest request) {
        return employeeService.updateMyContact(request);
    }

    @GetMapping("/{employeeId}")
    @PreAuthorize(Access.AUTHENTICATED)
    public EmployeeResponse get(@PathVariable Long employeeId) {
        return employeeService.get(employeeId);
    }

    @PostMapping
    @PreAuthorize(Access.MANAGER)
    @ResponseStatus(HttpStatus.CREATED)
    public EmployeeResponse create(@Valid @RequestBody EmployeeRequest request) {
        return employeeService.create(request);
    }

    @PutMapping("/{employeeId}")
    @PreAuthorize(Access.MANAGER)
    public EmployeeResponse update(@PathVariable Long employeeId, @Valid @RequestBody EmployeeRequest request) {
        return employeeService.update(employeeId, request);
    }

    @DeleteMapping("/{employeeId}")
    @PreAuthorize(Access.MANAGER)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long employeeId) {
        employeeService.delete(employeeId);
    }
}
