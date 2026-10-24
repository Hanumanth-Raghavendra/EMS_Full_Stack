package com.example.hr_service.entity;

public enum ProjectStatus {
    PLANNED,
    ACTIVE,
    INACTIVE,
    COMPLETED;

    /** Whether new people can still be assigned to a project in this status. */
    public boolean acceptsAssignments() {
        return this == PLANNED || this == ACTIVE;
    }
}
