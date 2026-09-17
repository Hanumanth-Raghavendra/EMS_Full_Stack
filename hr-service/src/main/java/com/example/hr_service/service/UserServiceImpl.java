package com.example.hr_service.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.example.hr_service.dto.UserRequestDTO;
import com.example.hr_service.dto.UserResponseDTO;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.Role;
import com.example.hr_service.entity.User;
import com.example.hr_service.mapper.UserMapper;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.RoleRepository;
import com.example.hr_service.repository.UserRepository;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(
            UserRepository userRepository,
            EmployeeRepository employeeRepository,
            RoleRepository roleRepository,
            UserMapper userMapper,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.roleRepository = roleRepository;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public List<UserResponseDTO> getAllUsers() {

        return userRepository.findAll()
                .stream()
                .map(userMapper::toResponseDTO)
                .toList();
    }

    @Override
    public UserResponseDTO getUserById(Long userId) {

        User user = userRepository.findById(userId)
                .orElse(null);

        if (user == null) {
            return null;
        }

        return userMapper.toResponseDTO(user);
    }

    @Override
    public UserResponseDTO createUser(UserRequestDTO dto) {

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        Role role = roleRepository.findById(dto.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));

        User user = userMapper.toEntity(dto);
        user.setPasswordHash(passwordEncoder.encode(dto.getPasswordHash()));

        user.setEmployee(employee);
        user.setRole(role);

        User savedUser = userRepository.save(user);

        return userMapper.toResponseDTO(savedUser);
    }

    @Override
    public UserResponseDTO updateUser(
            Long userId,
            UserRequestDTO dto) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        Role role = roleRepository.findById(dto.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));

        user.setEmployee(employee);
        user.setUsername(dto.getUsername());
        if (dto.getPasswordHash() != null && !dto.getPasswordHash().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(dto.getPasswordHash()));
        }
        user.setRole(role);
        user.setEnabled(dto.getEnabled());

        User updatedUser = userRepository.save(user);

        return userMapper.toResponseDTO(updatedUser);
    }

    @Override
    public void deleteUser(Long userId) {

        userRepository.deleteById(userId);
    }
}