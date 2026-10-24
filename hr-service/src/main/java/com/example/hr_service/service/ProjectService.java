package com.example.hr_service.service;

import com.example.hr_service.dto.AssignmentRequest;
import com.example.hr_service.dto.AssignmentResponse;
import com.example.hr_service.dto.AssignmentUpdateRequest;
import com.example.hr_service.dto.ProjectRequest;
import com.example.hr_service.dto.ProjectResponse;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.EmployeeProject;
import com.example.hr_service.entity.EmployeeProjectId;
import com.example.hr_service.entity.EmployeeStatus;
import com.example.hr_service.entity.Project;
import com.example.hr_service.entity.ProjectStatus;
import com.example.hr_service.exception.BadRequestException;
import com.example.hr_service.exception.ConflictException;
import com.example.hr_service.exception.ResourceNotFoundException;
import com.example.hr_service.repository.EmployeeProjectRepository;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.ProjectRepository;
import com.example.hr_service.security.CurrentUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Projects and the employees assigned to them. */
@Service
public class ProjectService {

    private static final String PROJECT = "Project";
    private static final String ASSIGNMENT = "EmployeeProject";

    private final ProjectRepository projectRepository;
    private final EmployeeProjectRepository assignmentRepository;
    private final EmployeeRepository employeeRepository;
    private final CurrentUserService currentUser;
    private final AuditLogRecorder audit;
    private final Clock clock;

    public ProjectService(ProjectRepository projectRepository,
                          EmployeeProjectRepository assignmentRepository,
                          EmployeeRepository employeeRepository,
                          CurrentUserService currentUser,
                          AuditLogRecorder audit,
                          Clock clock) {
        this.projectRepository = projectRepository;
        this.assignmentRepository = assignmentRepository;
        this.employeeRepository = employeeRepository;
        this.currentUser = currentUser;
        this.audit = audit;
        this.clock = clock;
    }

    // ================================================================== projects

    @Transactional(readOnly = true)
    public List<ProjectResponse> listProjects(String search, ProjectStatus status) {
        Map<Long, Long> members = memberCounts();
        return projectRepository.search(PageRequests.likePattern(search), status).stream()
                .map(project -> ProjectResponse.from(project, members.getOrDefault(project.getProjectId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProject(Long id) {
        Project project = loadProject(id);
        return ProjectResponse.from(project, memberCounts().getOrDefault(id, 0L));
    }

    @Transactional
    public ProjectResponse createProject(ProjectRequest request) {
        String name = request.projectName().trim();
        if (projectRepository.existsByProjectNameIgnoreCase(name)) {
            throw ConflictException.field("projectName", "A project with this name already exists.");
        }
        Project project = new Project();
        apply(project, request);
        Project saved = projectRepository.save(project);

        audit.record(AuditAction.CREATE, PROJECT, saved.getProjectId(), null, describe(saved));
        return ProjectResponse.from(saved, 0);
    }

    @Transactional
    public ProjectResponse updateProject(Long id, ProjectRequest request) {
        Project project = loadProject(id);
        if (projectRepository.existsByProjectNameIgnoreCaseAndProjectIdNot(request.projectName().trim(), id)) {
            throw ConflictException.field("projectName", "A project with this name already exists.");
        }
        String before = describe(project);
        apply(project, request);

        audit.record(AuditAction.UPDATE, PROJECT, id, before, describe(project));
        return ProjectResponse.from(project, memberCounts().getOrDefault(id, 0L));
    }

    /** Deletes the project and its assignments (people are unaffected). */
    @Transactional
    public void deleteProject(Long id) {
        Project project = loadProject(id);
        String before = describe(project);
        int removed = projectRepository.deleteEmployeeProjectAssignments(id);
        projectRepository.delete(project);
        audit.record(AuditAction.DELETE, PROJECT, id, before, "assignmentsRemoved=" + removed);
    }

    private void apply(Project project, ProjectRequest request) {
        if (request.startDate() != null && request.endDate() != null
                && request.endDate().isBefore(request.startDate())) {
            throw BadRequestException.field("endDate", "End date must be on or after the start date.");
        }
        if (request.status() == ProjectStatus.COMPLETED && request.endDate() == null) {
            throw BadRequestException.field("endDate", "A completed project needs an end date.");
        }
        project.setProjectName(request.projectName().trim());
        project.setDescription(Texts.trimToNull(request.description()));
        project.setStartDate(request.startDate());
        project.setEndDate(request.endDate());
        project.setStatus(request.status());
    }

    // ================================================================== assignments

    @Transactional(readOnly = true)
    public List<AssignmentResponse> listAssignments(Long employeeId, Long projectId) {
        Long scoped = currentUser.isEmployeeOnly() ? currentUser.getCurrentEmployeeId() : employeeId;
        return assignmentRepository.search(scoped, projectId).stream()
                .map(AssignmentResponse::from)
                .toList();
    }

    @Transactional
    public AssignmentResponse assign(AssignmentRequest request) {
        Employee employee = employeeRepository.findById(request.employeeId())
                .orElseThrow(() -> BadRequestException.field("employeeId", "Selected employee does not exist."));
        Project project = projectRepository.findById(request.projectId())
                .orElseThrow(() -> BadRequestException.field("projectId", "Selected project does not exist."));

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw BadRequestException.field("employeeId", "Inactive employees cannot be assigned to projects.");
        }
        if (project.getStatus() == null || !project.getStatus().acceptsAssignments()) {
            throw BadRequestException.field("projectId",
                    "People can only be assigned to PLANNED or ACTIVE projects (this one is " + project.getStatus() + ").");
        }
        EmployeeProjectId id = new EmployeeProjectId(employee.getEmployeeId(), project.getProjectId());
        if (assignmentRepository.existsById(id)) {
            throw new ConflictException(employee.getFullName() + " is already assigned to " + project.getProjectName() + ".");
        }

        EmployeeProject assignment = new EmployeeProject();
        assignment.setId(id);
        assignment.setEmployee(employee);
        assignment.setProject(project);
        assignment.setRoleInProject(request.roleInProject().trim());
        assignment.setAssignedAt(request.assignedAt() != null
                ? request.assignedAt().truncatedTo(ChronoUnit.SECONDS)
                : LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS));
        EmployeeProject saved = assignmentRepository.save(assignment);

        audit.record(AuditAction.CREATE, ASSIGNMENT, project.getProjectId(), null, describe(saved));
        return AssignmentResponse.from(saved);
    }

    @Transactional
    public AssignmentResponse updateAssignment(Long employeeId, Long projectId, AssignmentUpdateRequest request) {
        EmployeeProject assignment = loadAssignment(employeeId, projectId);
        String before = describe(assignment);
        assignment.setRoleInProject(request.roleInProject().trim());
        if (request.assignedAt() != null) {
            assignment.setAssignedAt(request.assignedAt().truncatedTo(ChronoUnit.SECONDS));
        }
        audit.record(AuditAction.UPDATE, ASSIGNMENT, projectId, before, describe(assignment));
        return AssignmentResponse.from(assignment);
    }

    @Transactional
    public void unassign(Long employeeId, Long projectId) {
        EmployeeProject assignment = loadAssignment(employeeId, projectId);
        String before = describe(assignment);
        assignmentRepository.delete(assignment);
        audit.record(AuditAction.DELETE, ASSIGNMENT, projectId, before, null);
    }

    @Transactional(readOnly = true)
    public long activeProjectCountFor(Long employeeId) {
        return assignmentRepository.findByEmployee_EmployeeId(employeeId).stream()
                .filter(assignment -> assignment.getProject().getStatus() == ProjectStatus.ACTIVE
                        || assignment.getProject().getStatus() == ProjectStatus.PLANNED)
                .count();
    }

    // ================================================================== helpers

    private Project loadProject(Long id) {
        return projectRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of(PROJECT, id));
    }

    private EmployeeProject loadAssignment(Long employeeId, Long projectId) {
        return assignmentRepository.findById(new EmployeeProjectId(employeeId, projectId))
                .orElseThrow(() -> new ResourceNotFoundException("This employee is not assigned to this project."));
    }

    private Map<Long, Long> memberCounts() {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : assignmentRepository.countPerProject()) {
            counts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return counts;
    }

    private static String describe(Project project) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("name", project.getProjectName());
        values.put("status", project.getStatus());
        values.put("start", project.getStartDate());
        values.put("end", project.getEndDate());
        return AuditLogRecorder.describe(values);
    }

    private static String describe(EmployeeProject assignment) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("employee", assignment.getEmployee().getEmployeeCode());
        values.put("project", assignment.getProject().getProjectName());
        values.put("role", assignment.getRoleInProject());
        return AuditLogRecorder.describe(values);
    }
}
