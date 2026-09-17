package com.example.hr_service.controller;

import com.example.hr_service.dto.EmployeeRequestDTO;
import com.example.hr_service.dto.EmployeeResponseDTO;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.mapper.EmployeeMapper;
import com.example.hr_service.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeMapper employeeMapper;

    public EmployeeController(
            EmployeeService employeeService,
            EmployeeMapper employeeMapper) {
        this.employeeService = employeeService;
        this.employeeMapper = employeeMapper;
    }

    @GetMapping
    public List<EmployeeResponseDTO> getEmployees(
            @RequestParam(required = false) String search) {

        return employeeService.searchEmployees(search)
                .stream()
                .map(employeeMapper::toResponseDTO)
                .toList();
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<EmployeeResponseDTO> getEmployeeById(
            @PathVariable Long employeeId) {

        Employee employee = employeeService.getEmployeeById(employeeId);

        return ResponseEntity.ok(
                employeeMapper.toResponseDTO(employee));
    }

    @PostMapping
    public ResponseEntity<EmployeeResponseDTO> createEmployee(
            @Valid @RequestBody EmployeeRequestDTO dto) {

        Employee employee = employeeMapper.toEntity(dto);

        Employee created = employeeService.createEmployee(employee);

        return ResponseEntity.ok(
                employeeMapper.toResponseDTO(created));
    }

    @PutMapping("/{employeeId}")
    public ResponseEntity<EmployeeResponseDTO> updateEmployee(
            @PathVariable Long employeeId,
            @Valid @RequestBody EmployeeRequestDTO dto) {

        Employee employee = employeeMapper.toEntity(dto);

        Employee updated = employeeService.updateEmployee(
                employeeId,
                employee);

        return ResponseEntity.ok(
                employeeMapper.toResponseDTO(updated));
    }

    @DeleteMapping("/{employeeId}")
    public ResponseEntity<Void> deleteEmployee(
            @PathVariable Long employeeId) {

        employeeService.deleteEmployee(employeeId);

        return ResponseEntity.noContent().build();
    }
}