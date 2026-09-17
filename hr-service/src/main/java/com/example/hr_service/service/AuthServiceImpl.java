package com.example.hr_service.service;

import com.example.hr_service.dto.LoginRequestDTO;
import com.example.hr_service.dto.LoginResponseDTO;
import com.example.hr_service.entity.User;
import com.example.hr_service.repository.UserRepository;
import com.example.hr_service.security.JwtService;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public AuthServiceImpl(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            JwtService jwtService) {

        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @Override
    public LoginResponseDTO login(LoginRequestDTO request) {

            authenticationManager.authenticate(
                            new UsernamePasswordAuthenticationToken(
                                            request.getUsername(),
                                            request.getPassword()));

            User user = userRepository
                            .findByUsername(request.getUsername())
                            .orElseThrow(() -> new RuntimeException("User not found"));

            String token = jwtService.generateToken(user);

            return new LoginResponseDTO(
                            token,
                            user.getUsername(),
                            user.getRole().getRoleName(),
                            user.getEmployee().getEmployeeId());
    }
}