package com.example.hr_service.exception;

import java.time.Instant;
import java.util.Map;

/**
 * The single error shape returned by every endpoint, including security
 * failures raised before a controller is reached.
 *
 * <pre>
 * { "timestamp": "...", "status": 409, "error": "Conflict",
 *   "message": "An employee with this email already exists.",
 *   "path": "/api/employees", "fieldErrors": { "email": "..." } }
 * </pre>
 */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors) {

    public static ApiError of(int status, String error, String message, String path) {
        return new ApiError(Instant.now(), status, error, message, path, Map.of());
    }

    public static ApiError of(int status, String error, String message, String path,
                              Map<String, String> fieldErrors) {
        return new ApiError(Instant.now(), status, error, message, path,
                fieldErrors == null ? Map.of() : fieldErrors);
    }

    /**
     * Minimal JSON rendering for filters that run before Spring MVC's
     * message converters are available (401/403 from the security chain).
     */
    public String toJson() {
        StringBuilder json = new StringBuilder(160);
        json.append("{\"timestamp\":\"").append(timestamp).append('"')
                .append(",\"status\":").append(status)
                .append(",\"error\":").append(quote(error))
                .append(",\"message\":").append(quote(message))
                .append(",\"path\":").append(quote(path))
                .append(",\"fieldErrors\":{");
        boolean first = true;
        for (Map.Entry<String, String> entry : fieldErrors.entrySet()) {
            if (!first) {
                json.append(',');
            }
            json.append(quote(entry.getKey())).append(':').append(quote(entry.getValue()));
            first = false;
        }
        return json.append("}}").toString();
    }

    private static String quote(String value) {
        if (value == null) {
            return "null";
        }
        StringBuilder out = new StringBuilder(value.length() + 2).append('"');
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.append('"').toString();
    }
}
