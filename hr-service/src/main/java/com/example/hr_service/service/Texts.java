package com.example.hr_service.service;

import java.util.Locale;

/** Small string helpers for normalising user input. */
public final class Texts {

    private Texts() {
    }

    public static String trim(String value) {
        return value == null ? null : value.trim();
    }

    /** Trimmed value, or null when blank. */
    public static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static String lower(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    public static String upper(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    public static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
