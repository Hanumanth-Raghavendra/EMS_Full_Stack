package com.example.hr_service.security;

import com.example.hr_service.config.AppProperties;
import com.example.hr_service.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;

/**
 * Issues and verifies the HMAC-SHA signed access tokens.
 *
 * Every token carries the user's {@code tokenVersion}; bumping the version
 * on the account (password change, role change, disable) immediately
 * invalidates every token issued before.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final int MIN_SECRET_BYTES = 32;
    static final String CLAIM_VERSION = "ver";
    static final String CLAIM_ROLE = "role";
    static final String CLAIM_USER_ID = "uid";

    private final SecretKey signingKey;
    private final long expirationMs;
    private final Clock clock;

    public JwtService(AppProperties properties, Clock clock) {
        this.signingKey = buildKey(properties.jwt().secret());
        this.expirationMs = properties.jwt().expirationMs();
        this.clock = clock;

        if (expirationMs < 60_000) {
            throw new IllegalStateException("app.jwt.expiration-ms must be at least 60000 (1 minute).");
        }
    }

    private static SecretKey buildKey(String secret) {
        if (secret == null || secret.isBlank()) {
            log.warn("JWT_SECRET is not set - generated a random signing key. "
                    + "Users will be signed out whenever the server restarts. "
                    + "Set JWT_SECRET (32+ characters) in any shared or production environment.");
            byte[] random = new byte[64];
            new SecureRandom().nextBytes(random);
            return Keys.hmacShaKeyFor(random);
        }

        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET must be at least " + MIN_SECRET_BYTES
                    + " characters long (currently " + bytes.length + ").");
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    public IssuedToken generateToken(User user) {
        Instant issuedAt = clock.instant();
        Instant expiresAt = issuedAt.plusMillis(expirationMs);

        String token = Jwts.builder()
                .subject(user.getUsername())
                .claim(CLAIM_USER_ID, user.getUserId())
                .claim(CLAIM_ROLE, user.getSystemRole().name())
                .claim(CLAIM_VERSION, user.getTokenVersion())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey)
                .compact();

        return new IssuedToken(token, expiresAt);
    }

    /**
     * Parses and verifies a token.
     *
     * @throws JwtException when the signature is invalid or the token expired
     */
    public TokenClaims parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .clock(() -> Date.from(clock.instant()))
                .build()
                .parseSignedClaims(token)
                .getPayload();

        Number version = claims.get(CLAIM_VERSION, Number.class);
        return new TokenClaims(claims.getSubject(), version == null ? -1 : version.intValue());
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public record IssuedToken(String token, Instant expiresAt) {
    }

    public record TokenClaims(String username, int tokenVersion) {
    }
}
