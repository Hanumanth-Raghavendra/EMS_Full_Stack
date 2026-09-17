package com.example.hr_service.dto;

public class DesignationResponseDTO {

    private Long designationId;
    private String designationName;
    private Long departmentId;
    private String departmentName;

    public DesignationResponseDTO() {
    }

    public DesignationResponseDTO(
            Long designationId,
            String designationName,
            Long departmentId,
            String departmentName) {

        this.designationId = designationId;
        this.designationName = designationName;
        this.departmentId = departmentId;
        this.departmentName = departmentName;
    }

    public Long getDesignationId() {
        return designationId;
    }

    public void setDesignationId(Long designationId) {
        this.designationId = designationId;
    }

    public String getDesignationName() {
        return designationName;
    }

    public void setDesignationName(String designationName) {
        this.designationName = designationName;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }
}