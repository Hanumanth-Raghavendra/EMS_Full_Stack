package com.example.hr_service.support;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.StringJoiner;

/**
 * Tiny JSON builder for request bodies in tests, independent of the Jackson
 * version on the classpath.
 *
 * <pre>Json.of("name", "Engineering", "count", 3)</pre>
 */
public final class Json {

    private Json() {
    }

    public static String of(Object... keyValues) {
        if (keyValues.length % 2 != 0) {
            throw new IllegalArgumentException("Expected key/value pairs");
        }
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return render(map);
    }

    @SuppressWarnings("unchecked")
    private static String render(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof Map<?, ?> map) {
            StringJoiner joiner = new StringJoiner(",", "{", "}");
            ((Map<String, Object>) map).forEach((key, item) -> joiner.add(quote(key) + ":" + render(item)));
            return joiner.toString();
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        return quote(value.toString());
    }

    private static String quote(String text) {
        return "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
