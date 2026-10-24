package com.example.hr_service.exception;

import org.springframework.security.access.AccessDeniedException;

/**
 * 403 - the caller is authenticated but not allowed to perform this specific
 * operation (e.g. HR editing an administrator, deleting your own account).
 */
public class ForbiddenOperationException extends AccessDeniedException {

    public ForbiddenOperationException(String message) {
        super(message);
    }
}
