package com.example.hr_service.exception;

import java.util.Map;

/** 400 - the request is well-formed but breaks a business rule. */
public class BadRequestException extends RuntimeException {

    private final Map<String, String> fieldErrors;

    public BadRequestException(String message) {
        this(message, Map.of());
    }

    public BadRequestException(String message, Map<String, String> fieldErrors) {
        super(message);
        this.fieldErrors = fieldErrors == null ? Map.of() : Map.copyOf(fieldErrors);
    }

    /** Convenience for a single invalid field. */
    public static BadRequestException field(String field, String message) {
        return new BadRequestException(message, Map.of(field, message));
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}
