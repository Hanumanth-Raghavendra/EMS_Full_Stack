package com.example.hr_service.service;

import com.example.hr_service.dto.AuthResponse;
import com.example.hr_service.dto.ChangePasswordRequest;
import com.example.hr_service.dto.CurrentUserResponse;
import com.example.hr_service.dto.LoginRequest;
import com.example.hr_service.entity.User;
import com.example.hr_service.exception.BadRequestException;
import com.example.hr_service.repository.UserRepository;
import com.example.hr_service.security.CurrentUserService;
import com.example.hr_service.security.JwtService;
import com.example.hr_service.security.LoginAttemptService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
public class AuthService {

    private static final String ENTITY = "User";

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;
    private final CurrentUserService currentUserService;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogRecorder audit;
    private final Clock clock;

    public AuthService(AuthenticationManager authenticationManager,
                       UserRepository userRepository,
                       JwtService jwtService,
                       LoginAttemptService loginAttemptService,
                       CurrentUserService currentUserService,
                       PasswordEncoder passwordEncoder,
                       AuditLogRecorder audit,
                       Clock clock) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.loginAttemptService = loginAttemptService;
        this.currentUserService = currentUserService;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
        this.clock = clock;
    }

    @Transactional(noRollbackFor = {BadCredentialsException.class, DisabledException.class})
    public AuthResponse login(LoginRequest request, String clientAddress) {
        String username = request.username().trim();
        loginAttemptService.checkAllowed(username, clientAddress);

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, request.password()));
        } catch (BadCredentialsException ex) {
            loginAttemptService.recordFailure(username, clientAddress);
            audit.recordAs(null, username, AuditAction.LOGIN_FAILED, ENTITY, null, null,
                    "reason=bad credentials, ip=" + clientAddress);
            throw ex;
        } catch (DisabledException ex) {
            audit.recordAs(null, username, AuditAction.LOGIN_FAILED, ENTITY, null, null,
                    "reason=account disabled, ip=" + clientAddress);
            throw ex;
        }

        loginAttemptService.recordSuccess(username, clientAddress);

        User principal = (User) authentication.getPrincipal();
        User user = userRepository.findById(principal.getUserId()).orElseThrow();
        user.setLastLoginAt(LocalDateTime.now(clock));

        audit.recordAs(user.getUserId(), user.getUsername(), AuditAction.LOGIN, ENTITY, user.getUserId(),
                null, "ip=" + clientAddress);

        return issue(user);
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse me() {
        User user = userRepository.findById(currentUserService.getCurrentUserId()).orElseThrow();
        return CurrentUserResponse.from(user);
    }

    /**
     * Changes the caller's password and returns a fresh token: every other
     * session (other browsers/devices) is signed out by the version bump.
     */
    @Transactional
    public AuthResponse changePassword(ChangePasswordRequest request) {
        User user = userRepository.findById(currentUserService.getCurrentUserId()).orElseThrow();

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw BadRequestException.field("currentPassword", "Current password is incorrect.");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw BadRequestException.field("newPassword", "New password must be different from the current one.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.bumpTokenVersion();

        audit.record(AuditAction.PASSWORD_CHANGE, ENTITY, user.getUserId(), null, "self-service");
        return issue(user);
    }

    private AuthResponse issue(User user) {
        JwtService.IssuedToken token = jwtService.generateToken(user);
        return new AuthResponse(token.token(), token.expiresAt(), CurrentUserResponse.from(user));
    }
}
