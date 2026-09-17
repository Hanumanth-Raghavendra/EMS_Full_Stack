package com.example.hr_service.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.hr_service.dto.EmployeeProjectRequestDTO;
import com.example.hr_service.dto.EmployeeProjectResponseDTO;
import com.example.hr_service.entity.EmployeeProject;

@Mapper(componentModel = "spring")
public interface EmployeeProjectMapper {

    @Mapping(target = "id.employeeId", source = "employeeId")
    @Mapping(target = "id.projectId", source = "projectId")
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "project", ignore = true)
    EmployeeProject toEntity(EmployeeProjectRequestDTO dto);

    @Mapping(source = "id.employeeId", target = "employeeId")
    @Mapping(source = "employee.firstName", target = "employeeName")
    @Mapping(source = "id.projectId", target = "projectId")
    @Mapping(source = "project.projectName", target = "projectName")
    EmployeeProjectResponseDTO toResponseDTO(EmployeeProject employeeProject);
}