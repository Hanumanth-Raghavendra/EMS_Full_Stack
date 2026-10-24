package com.example.hr_service.exception;

import java.util.Map;

/** 409 - the request conflicts with existing data (duplicates, records in use, wrong state). */
public class ConflictException extends RuntimeException {

    private final Map<String, String> fieldErrors;

    public ConflictException(String message) {
        this(message, Map.of());
    }

    public ConflictException(String message, Map<String, String> fieldErrors) {
        super(message);
        this.fieldErrors = fieldErrors == null ? Map.of() : Map.copyOf(fieldErrors);
    }

    public static ConflictException field(String field, String message) {
        return new ConflictException(message, Map.of(field, message));
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}
