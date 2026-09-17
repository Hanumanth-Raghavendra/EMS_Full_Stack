package com.example.hr_service.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.hr_service.dto.LeaveRequestDTO;
import com.example.hr_service.dto.LeaveRequestResponseDTO;
import com.example.hr_service.entity.LeaveRequest;

@Mapper(componentModel = "spring")
public interface LeaveRequestMapper {

    @Mapping(target = "leaveId", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "approvedBy", ignore = true)
    LeaveRequest toEntity(LeaveRequestDTO dto);

    @Mapping(source = "employee.employeeId", target = "employeeId")
    @Mapping(source = "employee.firstName", target = "employeeName")
    @Mapping(source = "approvedBy.userId", target = "approvedBy")
    @Mapping(source = "approvedBy.username", target = "approvedByUsername")
    LeaveRequestResponseDTO toResponseDTO(LeaveRequest leaveRequest);
}