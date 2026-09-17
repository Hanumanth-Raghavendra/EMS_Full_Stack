package com.example.hr_service.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.hr_service.dto.ProjectRequestDTO;
import com.example.hr_service.dto.ProjectResponseDTO;
import com.example.hr_service.entity.Project;

@Mapper(componentModel = "spring")
public interface ProjectMapper {

    @Mapping(target = "projectId", ignore = true)
    Project toEntity(ProjectRequestDTO dto);

    ProjectResponseDTO toResponseDTO(Project project);
}