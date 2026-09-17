package com.example.hr_service.controller;

import com.example.hr_service.dto.DesignationRequestDTO;
import com.example.hr_service.dto.DesignationResponseDTO;
import com.example.hr_service.entity.Department;
import com.example.hr_service.entity.Designation;
import com.example.hr_service.repository.DepartmentRepository;
import com.example.hr_service.repository.DesignationRepository;
import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/designations")
public class DesignationController {

    private final DesignationRepository designationRepository;
    private final DepartmentRepository departmentRepository;

    public DesignationController(
            DesignationRepository designationRepository,
            DepartmentRepository departmentRepository) {

        this.designationRepository = designationRepository;
        this.departmentRepository = departmentRepository;
    }

    @GetMapping
    public List<DesignationResponseDTO> getAllDesignations() {

        return designationRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/department/{departmentId}")
    public List<DesignationResponseDTO> getDesignationsByDepartment(
            @PathVariable Long departmentId) {

        return designationRepository
                .findByDepartmentDepartmentId(departmentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    public DesignationResponseDTO createDesignation(
                    @Valid @RequestBody DesignationRequestDTO request) {

        Department department = departmentRepository
                .findById(request.getDepartmentId())
                .orElseThrow(() -> new RuntimeException("Department not found"));

        Designation designation = new Designation();

        designation.setDesignationName(
                request.getDesignationName());

        designation.setDepartment(department);

        Designation saved = designationRepository.save(designation);

        return toResponse(saved);
    }

    @PutMapping("/{designationId}")
    public DesignationResponseDTO updateDesignation(
            @PathVariable Long designationId,
                    @Valid @RequestBody DesignationRequestDTO request) {

        Designation existing = designationRepository.findById(designationId)
                .orElseThrow(() -> new RuntimeException(
                        "Designation not found"));

        Department department = departmentRepository
                .findById(request.getDepartmentId())
                .orElseThrow(() -> new RuntimeException("Department not found"));

        existing.setDesignationName(
                request.getDesignationName());

        existing.setDepartment(department);

        Designation updated = designationRepository.save(existing);

        return toResponse(updated);
    }

    @DeleteMapping("/{designationId}")
    public void deleteDesignation(
            @PathVariable Long designationId) {

        if (!designationRepository.existsById(designationId)) {
            throw new RuntimeException("Designation not found");
        }

        designationRepository.deleteById(designationId);
    }

    private DesignationResponseDTO toResponse(
            Designation designation) {

        Department department = designation.getDepartment();

        return new DesignationResponseDTO(
                designation.getDesignationId(),
                designation.getDesignationName(),
                department != null
                        ? department.getDepartmentId()
                        : null,
                department != null
                        ? department.getDepartmentName()
                        : null);
    }
}