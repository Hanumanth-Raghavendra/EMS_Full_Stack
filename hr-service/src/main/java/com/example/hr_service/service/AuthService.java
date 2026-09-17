package com.example.hr_service.service;

import com.example.hr_service.dto.LoginRequestDTO;
import com.example.hr_service.dto.LoginResponseDTO;

public interface AuthService {

    LoginResponseDTO login(LoginRequestDTO request);
}