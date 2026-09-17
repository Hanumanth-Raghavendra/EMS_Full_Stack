package com.example.hr_service.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.hr_service.dto.EmployeeRequestDTO;
import com.example.hr_service.dto.EmployeeResponseDTO;
import com.example.hr_service.entity.Employee;

@Mapper(componentModel = "spring")
public interface EmployeeMapper {

    @Mapping(target = "employeeId", ignore = true)
    @Mapping(source = "departmentId", target = "department.departmentId")
    @Mapping(source = "designationId", target = "designation.designationId")
    Employee toEntity(EmployeeRequestDTO dto);

    @Mapping(source = "department.departmentId", target = "departmentId")
    @Mapping(source = "department.departmentName", target = "departmentName")
    @Mapping(source = "designation.designationId", target = "designationId")
    @Mapping(source = "designation.designationName", target = "designationName")
    EmployeeResponseDTO toResponseDTO(Employee employee);
}