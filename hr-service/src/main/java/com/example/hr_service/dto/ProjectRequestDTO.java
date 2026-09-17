package com.example.hr_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public class ProjectRequestDTO {
    @NotBlank @Size(max = 100) private String projectName;
    @Size(max = 500) private String description;
    @NotNull private LocalDate startDate;
    private LocalDate endDate;
    @NotBlank 
    @Pattern(regexp = "PLANNED|ACTIVE|INACTIVE|COMPLETED")
    private String status;
    public ProjectRequestDTO() {}
    public String getProjectName(){return projectName;} public void setProjectName(String v){projectName=v;}
    public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public LocalDate getStartDate(){return startDate;} public void setStartDate(LocalDate v){startDate=v;}
    public LocalDate getEndDate(){return endDate;} public void setEndDate(LocalDate v){endDate=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
}
