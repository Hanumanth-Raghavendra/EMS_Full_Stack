package com.example.hr_service.security;

import com.example.hr_service.config.AppProperties;
import com.example.hr_service.exception.TooManyRequestsException;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Brute-force protection for the sign-in endpoint.
 *
 * After {@code app.security.max-failed-logins} wrong passwords for the same
 * username from the same client address, that combination is locked for
 * {@code app.security.lockout-minutes}. Counting per username+address means
 * an attacker cannot lock a real user out from a different network.
 *
 * In-memory by design: the API runs as a single instance. A multi-instance
 * deployment would move this to Redis or the database.
 */
@Service
public class LoginAttemptService {

    private static final int MAX_TRACKED_KEYS = 10_000;

    private final int maxFailures;
    private final Duration lockout;
    private final Clock clock;
    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();

    public LoginAttemptService(AppProperties properties, Clock clock) {
        this.maxFailures = Math.max(1, properties.security().maxFailedLogins());
        this.lockout = Duration.ofMinutes(Math.max(1, properties.security().lockoutMinutes()));
        this.clock = clock;
    }

    /** Throws 429 when the key is currently locked. */
    public void checkAllowed(String username, String clientAddress) {
        Attempts current = attempts.get(key(username, clientAddress));
        if (current == null || current.lockedUntil == null) {
            return;
        }
        Instant now = clock.instant();
        if (now.isBefore(current.lockedUntil)) {
            long seconds = Math.max(1, Duration.between(now, current.lockedUntil).getSeconds());
            long minutes = Math.max(1, (seconds + 59) / 60);
            throw new TooManyRequestsException(
                    "Too many failed sign-in attempts. Try again in " + minutes + " minute(s).", seconds);
        }
        attempts.remove(key(username, clientAddress));
    }

    public void recordFailure(String username, String clientAddress) {
        if (attempts.size() > MAX_TRACKED_KEYS) {
            evictExpired();
        }
        Instant now = clock.instant();
        attempts.compute(key(username, clientAddress), (k, existing) -> {
            Attempts next = existing == null || existing.isStale(now, lockout) ? new Attempts(now) : existing;
            next.failures++;
            next.lastFailure = now;
            if (next.failures >= maxFailures) {
                next.lockedUntil = now.plus(lockout);
            }
            return next;
        });
    }

    public void recordSuccess(String username, String clientAddress) {
        attempts.remove(key(username, clientAddress));
    }

    public int remainingAttempts(String username, String clientAddress) {
        Attempts current = attempts.get(key(username, clientAddress));
        return current == null ? maxFailures : Math.max(0, maxFailures - current.failures);
    }

    /** Clears all counters (used by tests and safe to call at any time). */
    public void reset() {
        attempts.clear();
    }

    private void evictExpired() {
        Instant now = clock.instant();
        attempts.entrySet().removeIf(entry -> entry.getValue().isStale(now, lockout));
    }

    private static String key(String username, String clientAddress) {
        String user = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        return user + '|' + (clientAddress == null ? "unknown" : clientAddress);
    }

    private static final class Attempts {
        private int failures;
        private Instant lastFailure;
        private Instant lockedUntil;

        private Attempts(Instant now) {
            this.lastFailure = now;
        }

        /** Failures older than the lockout window no longer count. */
        private boolean isStale(Instant now, Duration window) {
            Instant reference = lockedUntil != null ? lockedUntil : lastFailure.plus(window);
            return now.isAfter(reference);
        }
    }
}
