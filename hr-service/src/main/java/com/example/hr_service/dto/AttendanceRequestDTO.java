package com.example.hr_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class AttendanceRequestDTO {
    @NotNull private Long employeeId;
    @NotNull private LocalDate attendanceDate;
    @NotBlank @Pattern(regexp="PRESENT|ABSENT|HALF_DAY|LEAVE", message="Invalid attendance status") private String status;
    private LocalDateTime checkIn;
    private LocalDateTime checkOut;
    public AttendanceRequestDTO() {}
    public Long getEmployeeId(){return employeeId;} public void setEmployeeId(Long v){employeeId=v;}
    public LocalDate getAttendanceDate(){return attendanceDate;} public void setAttendanceDate(LocalDate v){attendanceDate=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public LocalDateTime getCheckIn(){return checkIn;} public void setCheckIn(LocalDateTime v){checkIn=v;}
    public LocalDateTime getCheckOut(){return checkOut;} public void setCheckOut(LocalDateTime v){checkOut=v;}
}
