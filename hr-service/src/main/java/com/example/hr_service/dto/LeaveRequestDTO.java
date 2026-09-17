package com.example.hr_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public class LeaveRequestDTO {
    @NotNull private Long employeeId;
    @NotNull private LocalDate startDate;
    @NotNull private LocalDate endDate;
    @Size(max=500) private String reason;
    @NotBlank @Pattern(regexp="PENDING|APPROVED|REJECTED", message="Status must be PENDING, APPROVED or REJECTED") private String status;
    private Long approvedBy;
    public LeaveRequestDTO() {}
    public Long getEmployeeId(){return employeeId;} public void setEmployeeId(Long v){employeeId=v;}
    public LocalDate getStartDate(){return startDate;} public void setStartDate(LocalDate v){startDate=v;}
    public LocalDate getEndDate(){return endDate;} public void setEndDate(LocalDate v){endDate=v;}
    public String getReason(){return reason;} public void setReason(String v){reason=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public Long getApprovedBy(){return approvedBy;} public void setApprovedBy(Long v){approvedBy=v;}
}
