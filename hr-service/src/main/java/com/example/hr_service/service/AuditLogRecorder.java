package com.example.hr_service.service;

import com.example.hr_service.entity.AuditLog;
import com.example.hr_service.entity.User;
import com.example.hr_service.repository.AuditLogRepository;
import com.example.hr_service.security.CurrentUserService;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.StringJoiner;

/**
 * Writes audit entries. Called inside the same transaction as the change it
 * describes, so a rolled-back change never leaves a misleading audit row.
 */
@Component
public class AuditLogRecorder {

    private static final int MAX_VALUE_LENGTH = 4000;

    private final AuditLogRepository auditLogRepository;
    private final CurrentUserService currentUserService;
    private final Clock clock;

    public AuditLogRecorder(AuditLogRepository auditLogRepository,
                            CurrentUserService currentUserService,
                            Clock clock) {
        this.auditLogRepository = auditLogRepository;
        this.currentUserService = currentUserService;
        this.clock = clock;
    }

    /** Records an action performed by the signed-in user (or "system"). */
    public void record(String action, String entityName, Long entityId, String oldValue, String newValue) {
        User actor = currentUserService.findCurrentUser().orElse(null);
        recordAs(actor == null ? null : actor.getUserId(),
                actor == null ? "system" : actor.getUsername(),
                action, entityName, entityId, oldValue, newValue);
    }

    /** Records an action for an explicit actor (sign-in, first-time setup). */
    public void recordAs(Long userId, String username, String action, String entityName, Long entityId,
                         String oldValue, String newValue) {
        AuditLog log = new AuditLog();
        log.setUserId(userId);
        log.setUsername(truncate(username, 50));
        log.setAction(action);
        log.setEntityName(entityName);
        log.setEntityId(entityId);
        log.setOldValue(truncate(oldValue, MAX_VALUE_LENGTH));
        log.setNewValue(truncate(newValue, MAX_VALUE_LENGTH));
        log.setCreatedAt(LocalDateTime.now(clock));
        auditLogRepository.save(log);
    }

    /**
     * Builds "field=value, field=value" text. Use {@link #diff} for updates so
     * the trail shows only what actually changed.
     */
    public static String describe(Map<String, ?> values) {
        if (values == null) {
            return null;
        }
        StringJoiner joiner = new StringJoiner(", ");
        values.forEach((key, value) -> joiner.add(key + "=" + (value == null ? "" : value)));
        return joiner.toString();
    }

    /** Returns {old, new} descriptions limited to the fields that changed, or null if nothing changed. */
    public static String[] diff(Map<String, ?> before, Map<String, ?> after) {
        Map<String, Object> changedBefore = new LinkedHashMap<>();
        Map<String, Object> changedAfter = new LinkedHashMap<>();
        after.forEach((key, value) -> {
            Object previous = before.get(key);
            if (!Objects.equals(String.valueOf(previous), String.valueOf(value))) {
                changedBefore.put(key, previous);
                changedAfter.put(key, value);
            }
        });
        if (changedAfter.isEmpty()) {
            return null;
        }
        return new String[]{describe(changedBefore), describe(changedAfter)};
    }

    private static String truncate(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max - 3) + "...";
    }
}
