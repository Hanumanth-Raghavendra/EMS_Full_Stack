package com.example.hr_service.config;

import com.example.hr_service.entity.LeaveType;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Strongly typed view of everything under the {@code app.*} namespace in
 * application.yml.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @DefaultValue("Asia/Kolkata") String timezone,
        @DefaultValue Jwt jwt,
        @DefaultValue Cors cors,
        @DefaultValue Setup setup,
        @DefaultValue Security security,
        @DefaultValue Demo demo,
        @DefaultValue Leave leave,
        @DefaultValue AttendanceSettings attendance) {

    public record Jwt(
            @DefaultValue("") String secret,
            @DefaultValue("28800000") long expirationMs) {
    }

    public record Cors(
            @DefaultValue("http://localhost:5173") String allowedOrigins) {

        public List<String> originPatterns() {
            return Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(origin -> !origin.isEmpty())
                    .map(origin -> origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin)
                    .toList();
        }
    }

    public record Setup(@DefaultValue("") String token) {

        public boolean tokenRequired() {
            return token != null && !token.isBlank();
        }
    }

    public record Security(
            @DefaultValue("5") int maxFailedLogins,
            @DefaultValue("15") int lockoutMinutes) {
    }

    public record Demo(
            @DefaultValue("false") boolean enabled,
            @DefaultValue("Demo@12345") String password) {
    }

    public record Leave(
            @DefaultValue("true") boolean excludeWeekends,
            @DefaultValue("30") int maxDaysPerRequest,
            Map<LeaveType, Integer> quotas) {

        /** Annual quota for a type, or null when the type is unlimited. */
        public Integer quotaFor(LeaveType type) {
            if (type == LeaveType.UNPAID) {
                return null;
            }
            Map<LeaveType, Integer> configured = quotas == null ? Map.of() : quotas;
            return configured.getOrDefault(type, defaultQuotas().get(type));
        }

        private static Map<LeaveType, Integer> defaultQuotas() {
            Map<LeaveType, Integer> defaults = new EnumMap<>(LeaveType.class);
            defaults.put(LeaveType.CASUAL, 12);
            defaults.put(LeaveType.SICK, 10);
            defaults.put(LeaveType.EARNED, 15);
            return defaults;
        }
    }

    public record AttendanceSettings(
            @DefaultValue("240") int halfDayThresholdMinutes) {
    }
}
