package com.example.hr_service.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.hr_service.dto.AttendanceRequestDTO;
import com.example.hr_service.dto.AttendanceResponseDTO;
import com.example.hr_service.entity.Attendance;

@Mapper(componentModel = "spring")
public interface AttendanceMapper {

    @Mapping(target = "attendanceId", ignore = true)
    @Mapping(target = "employee", ignore = true)
    Attendance toEntity(AttendanceRequestDTO dto);

    @Mapping(source = "employee.employeeId", target = "employeeId")
    @Mapping(source = "employee.firstName", target = "employeeName")
    AttendanceResponseDTO toResponseDTO(Attendance attendance);
}