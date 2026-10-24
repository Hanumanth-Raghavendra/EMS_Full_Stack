package com.example.hr_service.service;

/** Action names written to the audit trail. */
public final class AuditAction {

    public static final String CREATE = "CREATE";
    public static final String UPDATE = "UPDATE";
    public static final String DELETE = "DELETE";
    public static final String LOGIN = "LOGIN";
    public static final String LOGIN_FAILED = "LOGIN_FAILED";
    public static final String PASSWORD_CHANGE = "PASSWORD_CHANGE";
    public static final String PASSWORD_RESET = "PASSWORD_RESET";
    public static final String APPROVE = "APPROVE";
    public static final String REJECT = "REJECT";
    public static final String CANCEL = "CANCEL";
    public static final String CHECK_IN = "CHECK_IN";
    public static final String CHECK_OUT = "CHECK_OUT";
    public static final String SETUP = "SETUP";

    private AuditAction() {
    }
}
