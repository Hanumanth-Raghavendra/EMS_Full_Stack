package com.example.hr_service.service;

import com.example.hr_service.exception.BadRequestException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Locale;
import java.util.Map;

/**
 * Builds safe {@link Pageable}s from request parameters: page size is
 * clamped and sort fields are white-listed (unknown fields are rejected
 * instead of causing a 500).
 */
public final class PageRequests {

    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    private PageRequests() {
    }

    /**
     * @param sort         "field" or "field,asc|desc"; null/blank uses the default
     * @param allowedSorts API field name -> entity property path
     */
    public static Pageable of(Integer page, Integer size, String sort,
                              Map<String, String> allowedSorts, Sort defaultSort) {
        int safePage = page == null ? 0 : Math.max(0, page);
        int safeSize = size == null ? DEFAULT_SIZE : Math.min(MAX_SIZE, Math.max(1, size));
        return PageRequest.of(safePage, safeSize, parseSort(sort, allowedSorts, defaultSort));
    }

    private static Sort parseSort(String sort, Map<String, String> allowedSorts, Sort defaultSort) {
        if (sort == null || sort.isBlank()) {
            return defaultSort;
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        String property = allowedSorts.get(field);
        if (property == null) {
            throw BadRequestException.field("sort",
                    "Cannot sort by '" + field + "'. Allowed: " + String.join(", ", allowedSorts.keySet()) + ".");
        }
        Sort.Direction direction = Sort.Direction.ASC;
        if (parts.length > 1) {
            String requested = parts[1].trim().toUpperCase(Locale.ROOT);
            if (!requested.equals("ASC") && !requested.equals("DESC")) {
                throw BadRequestException.field("sort", "Sort direction must be asc or desc.");
            }
            direction = Sort.Direction.valueOf(requested);
        }
        return Sort.by(direction, property).and(defaultSort);
    }

    /** Lower-cased '%term%' LIKE pattern, or '' when there is no search term. */
    public static String likePattern(String search) {
        if (search == null || search.isBlank()) {
            return "";
        }
        String escaped = search.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
