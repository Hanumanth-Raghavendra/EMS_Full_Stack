package com.example.hr_service.entity;

public enum LeaveStatus {
    PENDING,
    APPROVED,
    REJECTED,
    CANCELLED;

    /** Statuses that reserve days in an employee's calendar and balance. */
    public boolean isActive() {
        return this == PENDING || this == APPROVED;
    }
}
