package com.example.hr_service.security;

import com.example.hr_service.entity.User;
import com.example.hr_service.repository.UserRepository;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Authenticates requests that carry {@code Authorization: Bearer <jwt>}.
 *
 * The account is re-loaded on every request, so disabling a user, making an
 * employee inactive or changing a password takes effect immediately rather
 * than when the token expires.
 *
 * Deliberately not a Spring bean: it is added to the security chain only,
 * so it never runs twice as a plain servlet filter.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** Request attribute read by the entry point to explain a 401. */
    public static final String AUTH_ERROR_ATTRIBUTE = "ems.auth.error";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7).trim();
        try {
            JwtService.TokenClaims claims = jwtService.parse(token);
            Optional<User> user = userRepository.findForLogin(claims.username());

            if (user.isEmpty()) {
                request.setAttribute(AUTH_ERROR_ATTRIBUTE, "This account no longer exists.");
            } else if (!user.get().isEnabled()) {
                request.setAttribute(AUTH_ERROR_ATTRIBUTE,
                        "This account is disabled or the employee is inactive.");
            } else if (user.get().getTokenVersion() != claims.tokenVersion()) {
                request.setAttribute(AUTH_ERROR_ATTRIBUTE,
                        "Your session is no longer valid because your account changed. Please sign in again.");
            } else {
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(user.get(), null, user.get().getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (ExpiredJwtException ex) {
            request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Your session has expired. Please sign in again.");
        } catch (JwtException | IllegalArgumentException ex) {
            request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Invalid authentication token.");
        }

        filterChain.doFilter(request, response);
    }
}
