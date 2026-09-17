package com.example.hr_service.dto;

public class InitialAdminResponseDTO {

    private String message;
    private Long userId;
    private String username;
    private String role;

    public InitialAdminResponseDTO() {
    }

    public InitialAdminResponseDTO(
            String message,
            Long userId,
            String username,
            String role) {

        this.message = message;
        this.userId = userId;
        this.username = username;
        this.role = role;
    }

    public String getMessage() {
        return message;
    }

    public Long getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }
}