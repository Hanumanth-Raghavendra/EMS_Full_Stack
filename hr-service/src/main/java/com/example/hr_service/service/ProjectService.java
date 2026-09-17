package com.example.hr_service.service;

import com.example.hr_service.dto.ProjectRequestDTO;
import com.example.hr_service.dto.ProjectResponseDTO;

import java.util.List;

public interface ProjectService {

    List<ProjectResponseDTO> getAllProjects();

    ProjectResponseDTO getProjectById(Long projectId);

    ProjectResponseDTO createProject(ProjectRequestDTO projectRequestDTO);

    ProjectResponseDTO updateProject(Long projectId, ProjectRequestDTO projectRequestDTO);

    void deleteProject(Long projectId);
}