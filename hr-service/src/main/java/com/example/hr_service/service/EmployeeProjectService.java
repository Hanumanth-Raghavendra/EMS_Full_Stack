package com.example.hr_service.service;

import com.example.hr_service.dto.EmployeeProjectRequestDTO;
import com.example.hr_service.dto.EmployeeProjectResponseDTO;

import java.util.List;

public interface EmployeeProjectService {

    List<EmployeeProjectResponseDTO> getAllEmployeeProjects();

    EmployeeProjectResponseDTO getEmployeeProjectById(
            Long employeeId,
            Long projectId);

    EmployeeProjectResponseDTO createEmployeeProject(
            EmployeeProjectRequestDTO employeeProjectRequestDTO);

    EmployeeProjectResponseDTO updateEmployeeProject(
            Long employeeId,
            Long projectId,
            EmployeeProjectRequestDTO employeeProjectRequestDTO);

    void deleteEmployeeProject(
            Long employeeId,
            Long projectId);
}