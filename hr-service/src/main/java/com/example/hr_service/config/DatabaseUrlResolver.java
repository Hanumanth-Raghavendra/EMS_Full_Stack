package com.example.hr_service.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Hosting platforms (Render, Neon, Railway, Heroku, Supabase) hand out a
 * single {@code DATABASE_URL} such as
 * {@code postgresql://user:secret@host:5432/db?sslmode=require}.
 * Spring needs a JDBC URL plus separate credentials, so this class converts
 * one into the other before Spring starts.
 *
 * It only acts when {@code DATABASE_URL} is present and {@code DB_URL} is not,
 * so explicit configuration always wins.
 */
public final class DatabaseUrlResolver {

    private DatabaseUrlResolver() {
    }

    public static void applyFromEnvironment(Map<String, String> env) {
        String databaseUrl = env.get("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return;
        }
        if (hasText(env.get("DB_URL")) || hasText(System.getProperty("spring.datasource.url"))) {
            return;
        }

        resolve(databaseUrl).forEach(System::setProperty);
    }

    /**
     * Converts a database URL into Spring datasource properties.
     * Visible for testing.
     */
    public static Map<String, String> resolve(String databaseUrl) {
        Map<String, String> properties = new LinkedHashMap<>();
        String value = databaseUrl.trim();

        if (value.startsWith("jdbc:")) {
            properties.put("spring.datasource.url", value);
            return properties;
        }

        if (!value.startsWith("postgres://") && !value.startsWith("postgresql://")) {
            throw new IllegalArgumentException(
                    "DATABASE_URL must start with postgres://, postgresql:// or jdbc:postgresql://");
        }

        URI uri = URI.create(value.replaceFirst("^postgres(ql)?://", "postgresql://"));

        StringBuilder jdbc = new StringBuilder("jdbc:postgresql://").append(uri.getHost());
        if (uri.getPort() > 0) {
            jdbc.append(':').append(uri.getPort());
        }
        jdbc.append(uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/postgres" : uri.getRawPath());

        String query = filterQuery(uri.getRawQuery());
        if (!query.isEmpty()) {
            jdbc.append('?').append(query);
        }
        properties.put("spring.datasource.url", jdbc.toString());

        String userInfo = uri.getRawUserInfo();
        if (userInfo != null && !userInfo.isEmpty()) {
            int separator = userInfo.indexOf(':');
            String user = separator >= 0 ? userInfo.substring(0, separator) : userInfo;
            properties.put("spring.datasource.username", decode(user));
            if (separator >= 0) {
                properties.put("spring.datasource.password", decode(userInfo.substring(separator + 1)));
            }
        }

        return properties;
    }

    /** Drops libpq-only parameters the JDBC driver does not understand. */
    private static String filterQuery(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) {
            return "";
        }
        return Arrays.stream(rawQuery.split("&"))
                .filter(part -> !part.isBlank())
                .filter(part -> !part.startsWith("channel_binding="))
                .collect(Collectors.joining("&"));
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
