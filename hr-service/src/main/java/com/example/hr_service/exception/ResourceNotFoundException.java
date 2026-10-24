package com.example.hr_service.exception;

/** 404 - the requested record does not exist (or is not visible to the caller). */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public static ResourceNotFoundException of(String entity, Object id) {
        return new ResourceNotFoundException(entity + " not found (id " + id + ").");
    }
}
