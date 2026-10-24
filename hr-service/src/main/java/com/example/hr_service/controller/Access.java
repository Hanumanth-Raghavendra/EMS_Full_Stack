package com.example.hr_service.controller;

/** Authorisation expressions reused by {@code @PreAuthorize} annotations. */
public final class Access {

    public static final String MANAGER = "hasAnyRole('ADMIN','HR')";
    public static final String ADMIN = "hasRole('ADMIN')";
    public static final String AUTHENTICATED = "isAuthenticated()";

    private Access() {
    }
}
