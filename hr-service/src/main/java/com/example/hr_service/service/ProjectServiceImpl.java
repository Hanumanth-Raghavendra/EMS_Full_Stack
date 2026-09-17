package com.example.hr_service.service;

import com.example.hr_service.dto.ProjectRequestDTO;
import com.example.hr_service.dto.ProjectResponseDTO;
import com.example.hr_service.entity.Project;
import com.example.hr_service.exception.ResourceNotFoundException;
import com.example.hr_service.mapper.ProjectMapper;
import com.example.hr_service.repository.ProjectRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMapper projectMapper;

    public ProjectServiceImpl(
            ProjectRepository projectRepository,
            ProjectMapper projectMapper) {

        this.projectRepository = projectRepository;
        this.projectMapper = projectMapper;
    }

    @Override
    public List<ProjectResponseDTO> getAllProjects() {

        return projectRepository.findAll()
                .stream()
                .map(projectMapper::toResponseDTO)
                .toList();
    }

    @Override
    public ProjectResponseDTO getProjectById(Long projectId) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (project == null) {
            return null;
        }

        return projectMapper.toResponseDTO(project);
    }

    @Override
    public ProjectResponseDTO createProject(ProjectRequestDTO projectRequestDTO) {

        Project project = projectMapper.toEntity(projectRequestDTO);

        Project savedProject = projectRepository.save(project);

        return projectMapper.toResponseDTO(savedProject);
    }

    @Override
    public ProjectResponseDTO updateProject(
            Long projectId,
            ProjectRequestDTO projectRequestDTO) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        project.setProjectName(projectRequestDTO.getProjectName());
        project.setDescription(projectRequestDTO.getDescription());
        project.setStartDate(projectRequestDTO.getStartDate());
        project.setEndDate(projectRequestDTO.getEndDate());
        project.setStatus(projectRequestDTO.getStatus());

        Project updatedProject = projectRepository.save(project);

        return projectMapper.toResponseDTO(updatedProject);
    }

    @Override
    @Transactional
    public void deleteProject(Long projectId) {

        projectRepository.deleteEmployeeProjectAssignments(projectId);
        projectRepository.deleteById(projectId);
    }
}