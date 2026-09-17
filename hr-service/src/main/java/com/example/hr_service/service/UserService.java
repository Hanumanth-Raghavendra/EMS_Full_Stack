package com.example.hr_service.service;

import java.util.List;

import com.example.hr_service.dto.UserRequestDTO;
import com.example.hr_service.dto.UserResponseDTO;

public interface UserService {

    List<UserResponseDTO> getAllUsers();

    UserResponseDTO getUserById(Long userId);

    UserResponseDTO createUser(UserRequestDTO dto);

    UserResponseDTO updateUser(Long userId, UserRequestDTO dto);

    void deleteUser(Long userId);
}