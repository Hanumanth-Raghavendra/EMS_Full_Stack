package com.example.hr_service.controller;

import com.example.hr_service.dto.InitialAdminRequestDTO;
import com.example.hr_service.dto.InitialAdminResponseDTO;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.service.SetupService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/setup")
public class SetupController {

    private final SetupService setupService;
    private final EmployeeRepository employeeRepository;

    public SetupController(
            SetupService setupService,
            EmployeeRepository employeeRepository) {

        this.setupService = setupService;
        this.employeeRepository = employeeRepository;
    }

    @GetMapping("/status")
    public ResponseEntity<Boolean> getSetupStatus() {

        return ResponseEntity.ok(
                setupService.isInitialSetupRequired());
    }

    @GetMapping("/employees")
    public ResponseEntity<List<Map<String, Object>>> getEmployeesForSetup() {

        List<Map<String, Object>> employees = new ArrayList<>();

        employeeRepository.findAll().forEach(employee -> {

            Map<String, Object> employeeData = new HashMap<>();

            employeeData.put("employeeId", employee.getEmployeeId());
            employeeData.put("employeeCode", employee.getEmployeeCode());
            employeeData.put("firstName", employee.getFirstName());
            employeeData.put("lastName", employee.getLastName());

            employees.add(employeeData);
        });

        return ResponseEntity.ok(employees);
    }

    @PostMapping("/first-admin")
    public ResponseEntity<InitialAdminResponseDTO> createFirstAdmin(
            @Valid @RequestBody InitialAdminRequestDTO dto) {

        return ResponseEntity.ok(
                setupService.createFirstAdmin(dto));
    }
}