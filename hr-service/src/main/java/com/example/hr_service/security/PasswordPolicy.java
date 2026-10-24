package com.example.hr_service.security;

import com.example.hr_service.exception.BadRequestException;

/**
 * One place for password rules so the API, setup flow and seeder agree.
 *
 * 8-64 characters with at least one letter and one digit. The upper bound
 * keeps us safely under BCrypt's 72-byte input limit.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_LENGTH = 64;
    public static final String REGEX = "^(?=.*[A-Za-z])(?=.*\\d).{8,64}$";
    public static final String MESSAGE =
            "Password must be 8-64 characters and contain at least one letter and one number.";

    private PasswordPolicy() {
    }

    public static boolean isValid(String password) {
        return password != null && password.matches(REGEX);
    }

    public static void validate(String field, String password) {
        if (!isValid(password)) {
            throw BadRequestException.field(field, MESSAGE);
        }
    }
}
