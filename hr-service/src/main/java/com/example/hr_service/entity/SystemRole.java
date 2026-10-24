package com.example.hr_service.entity;

import java.util.Locale;

/**
 * The three roles the application understands, ordered by privilege.
 *
 * Role names are stored in the roles table, but authorisation decisions are
 * always made against this enum. Any unknown role name in the database is
 * treated as {@link #EMPLOYEE} (least privilege) so a stray row can never
 * grant elevated access.
 */
public enum SystemRole {
    EMPLOYEE(1, "Employee", "Self-service: own profile, attendance, leave and projects."),
    HR(2, "HR", "Manages employees, attendance, leave approvals, projects and employee accounts."),
    ADMIN(3, "Administrator", "Full access, including HR/admin accounts and the audit trail.");

    private final int rank;
    private final String label;
    private final String description;

    SystemRole(int rank, String label, String description) {
        this.rank = rank;
        this.label = label;
        this.description = description;
    }

    public static SystemRole from(String roleName) {
        if (roleName == null) {
            return EMPLOYEE;
        }
        try {
            return SystemRole.valueOf(roleName.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return EMPLOYEE;
        }
    }

    public boolean isManager() {
        return this == ADMIN || this == HR;
    }

    public boolean outranks(SystemRole other) {
        return this.rank > other.rank;
    }

    public String authority() {
        return "ROLE_" + name();
    }

    public String label() {
        return label;
    }

    public String description() {
        return description;
    }
}
