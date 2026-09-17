package com.example.hr_service.service;

import com.example.hr_service.dto.EmployeeProjectRequestDTO;
import com.example.hr_service.dto.EmployeeProjectResponseDTO;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.EmployeeProject;
import com.example.hr_service.entity.EmployeeProjectId;
import com.example.hr_service.entity.Project;
import com.example.hr_service.entity.User;
import com.example.hr_service.mapper.EmployeeProjectMapper;
import com.example.hr_service.repository.EmployeeProjectRepository;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.ProjectRepository;
import com.example.hr_service.security.CurrentUserService;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class EmployeeProjectServiceImpl implements EmployeeProjectService {

        private final EmployeeProjectRepository employeeProjectRepository;
        private final EmployeeRepository employeeRepository;
        private final ProjectRepository projectRepository;
        private final EmployeeProjectMapper employeeProjectMapper;
        private final CurrentUserService currentUserService;

        public EmployeeProjectServiceImpl(
                        EmployeeProjectRepository employeeProjectRepository,
                        EmployeeRepository employeeRepository,
                        ProjectRepository projectRepository,
                        EmployeeProjectMapper employeeProjectMapper,
                        CurrentUserService currentUserService) {

                this.employeeProjectRepository = employeeProjectRepository;
                this.employeeRepository = employeeRepository;
                this.projectRepository = projectRepository;
                this.employeeProjectMapper = employeeProjectMapper;
                this.currentUserService = currentUserService;
        }

        private void ensureOwnership(Long employeeId) {

                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

                if (authentication == null ||
                                !authentication.isAuthenticated()) {

                        throw new AccessDeniedException(
                                        "Authentication is required");
                }

                boolean isEmployee = authentication.getAuthorities()
                                .stream()
                                .anyMatch(authority -> "ROLE_EMPLOYEE".equals(
                                                authority.getAuthority()));

                /*
                 * ADMIN and HR are allowed to work with
                 * any employee project.
                 */
                if (!isEmployee) {
                        return;
                }

                Object principal = authentication.getPrincipal();

                if (!(principal instanceof User currentUser) ||
                                currentUser.getEmployee() == null) {

                        throw new AccessDeniedException(
                                        "Employee information is unavailable");
                }

                Long loggedInEmployeeId = currentUser.getEmployee().getEmployeeId();

                if (!Objects.equals(
                                loggedInEmployeeId,
                                employeeId)) {

                        throw new AccessDeniedException(
                                        "You can only modify your own employee data");
                }
        }

        @Override
        public List<EmployeeProjectResponseDTO> getAllEmployeeProjects() {

                List<EmployeeProject> assignments = currentUserService.isEmployee()
                                ? employeeProjectRepository.findByEmployee_EmployeeId(
                                                currentUserService.getCurrentEmployeeId())
                                : employeeProjectRepository.findAll();

                return assignments.stream()
                                .map(employeeProjectMapper::toResponseDTO)
                                .toList();
        }

        @Override
        public EmployeeProjectResponseDTO getEmployeeProjectById(
                        Long employeeId,
                        Long projectId) {

                EmployeeProjectId id = new EmployeeProjectId(employeeId, projectId);

                EmployeeProject employeeProject = employeeProjectRepository.findById(id)
                                .orElse(null);

                if (employeeProject == null) {
                        return null;
                }

                ensureOwnership(employeeId);

                return employeeProjectMapper.toResponseDTO(employeeProject);
        }

        @Override
        public EmployeeProjectResponseDTO createEmployeeProject(
                        EmployeeProjectRequestDTO employeeProjectRequestDTO) {

                ensureOwnership(employeeProjectRequestDTO.getEmployeeId());

                Employee employee = employeeRepository
                                .findById(employeeProjectRequestDTO.getEmployeeId())
                                .orElseThrow(() -> new RuntimeException("Employee not found"));

                Project project = projectRepository
                                .findById(employeeProjectRequestDTO.getProjectId())
                                .orElseThrow(() -> new RuntimeException("Project not found"));

                EmployeeProject employeeProject = employeeProjectMapper.toEntity(employeeProjectRequestDTO);

                employeeProject.setEmployee(employee);
                employeeProject.setProject(project);

                EmployeeProject savedEmployeeProject = employeeProjectRepository.save(employeeProject);

                return employeeProjectMapper.toResponseDTO(savedEmployeeProject);
        }

        @Override
        public EmployeeProjectResponseDTO updateEmployeeProject(
                        Long employeeId,
                        Long projectId,
                        EmployeeProjectRequestDTO employeeProjectRequestDTO) {

                ensureOwnership(employeeId);

                EmployeeProjectId id = new EmployeeProjectId(employeeId, projectId);

                EmployeeProject employeeProject = employeeProjectRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException(
                                                "Employee project assignment not found"));

                employeeProject.setAssignedAt(
                                employeeProjectRequestDTO.getAssignedAt());

                employeeProject.setRoleInProject(
                                employeeProjectRequestDTO.getRoleInProject());

                EmployeeProject updatedEmployeeProject = employeeProjectRepository.save(employeeProject);

                return employeeProjectMapper.toResponseDTO(updatedEmployeeProject);
        }

        @Override
        public void deleteEmployeeProject(
                        Long employeeId,
                        Long projectId) {

                ensureOwnership(employeeId);

                EmployeeProjectId id = new EmployeeProjectId(employeeId, projectId);

                employeeProjectRepository.deleteById(id);
        }
}