package com.example.hr_service.dto;

/** Regular expressions shared by request records (single source of truth). */
public final class ValidationPatterns {

    public static final String EMPLOYEE_CODE = "^[A-Za-z0-9_-]{1,30}$";
    public static final String EMPLOYEE_CODE_MESSAGE =
            "Employee code may contain only letters, numbers, hyphens and underscores.";

    public static final String PERSON_NAME = "^[A-Za-z]+(?:[ '.-][A-Za-z]+)*$";
    public static final String PERSON_NAME_MESSAGE =
            "Use letters only (spaces, apostrophes, dots and hyphens between words are fine).";

    /** 10-digit Indian mobile number. */
    public static final String PHONE = "^[6-9][0-9]{9}$";
    public static final String PHONE_MESSAGE = "Phone must be a valid 10-digit mobile number.";

    public static final String USERNAME = "^[A-Za-z0-9._-]{3,50}$";
    public static final String USERNAME_MESSAGE =
            "Username must be 3-50 characters: letters, numbers, dots, hyphens or underscores.";

    private ValidationPatterns() {
    }
}
