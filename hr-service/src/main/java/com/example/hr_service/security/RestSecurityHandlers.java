package com.example.hr_service.security;

import com.example.hr_service.exception.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * JSON responses for requests rejected by the security filter chain, so the
 * client always receives the same {@link ApiError} shape.
 */
public final class RestSecurityHandlers {

    private RestSecurityHandlers() {
    }

    public static AuthenticationEntryPoint authenticationEntryPoint() {
        return (HttpServletRequest request, HttpServletResponse response, AuthenticationException ex) -> {
            Object reason = request.getAttribute(JwtAuthenticationFilter.AUTH_ERROR_ATTRIBUTE);
            String message = reason != null ? reason.toString() : "Please sign in to continue.";
            write(response, HttpStatus.UNAUTHORIZED, message, request.getRequestURI());
        };
    }

    public static AccessDeniedHandler accessDeniedHandler() {
        return (HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex) ->
                write(response, HttpStatus.FORBIDDEN,
                        "You do not have permission to perform this action.", request.getRequestURI());
    }

    private static void write(HttpServletResponse response, HttpStatus status, String message, String path)
            throws IOException {
        if (response.isCommitted()) {
            return;
        }
        ApiError error = ApiError.of(status.value(), status.getReasonPhrase(), message, path);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(error.toJson());
    }
}
