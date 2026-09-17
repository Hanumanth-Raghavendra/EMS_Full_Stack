package com.example.hr_service.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.hr_service.dto.UserRequestDTO;
import com.example.hr_service.dto.UserResponseDTO;
import com.example.hr_service.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "userId", ignore = true)
    @Mapping(source = "employeeId", target = "employee.employeeId")
    @Mapping(source = "roleId", target = "role.roleId")
    @Mapping(target = "authorities", ignore = true)
    User toEntity(UserRequestDTO dto);

    @Mapping(source = "employee.employeeId", target = "employeeId")
    @Mapping(source = "employee.firstName", target = "employeeName")
    @Mapping(source = "role.roleId", target = "roleId")
    @Mapping(source = "role.roleName", target = "roleName")
    UserResponseDTO toResponseDTO(User user);
}