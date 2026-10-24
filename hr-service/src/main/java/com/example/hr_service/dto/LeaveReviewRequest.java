package com.example.hr_service.dto;

import jakarta.validation.constraints.Size;

public record LeaveReviewRequest(
        @Size(max = 500, message = "Comment must be at most 500 characters.")
        String comment) {
}
