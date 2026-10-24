package com.example.hr_service.service;

import com.example.hr_service.dto.DepartmentRequest;
import com.example.hr_service.dto.DepartmentResponse;
import com.example.hr_service.dto.DesignationRequest;
import com.example.hr_service.dto.DesignationResponse;
import com.example.hr_service.entity.Department;
import com.example.hr_service.entity.Designation;
import com.example.hr_service.exception.BadRequestException;
import com.example.hr_service.exception.ConflictException;
import com.example.hr_service.exception.ResourceNotFoundException;
import com.example.hr_service.repository.DepartmentRepository;
import com.example.hr_service.repository.DesignationRepository;
import com.example.hr_service.repository.EmployeeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Departments and the designations that belong to them. */
@Service
public class DepartmentService {

    private static final String DEPARTMENT = "Department";
    private static final String DESIGNATION = "Designation";

    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditLogRecorder audit;

    public DepartmentService(DepartmentRepository departmentRepository,
                             DesignationRepository designationRepository,
                             EmployeeRepository employeeRepository,
                             AuditLogRecorder audit) {
        this.departmentRepository = departmentRepository;
        this.designationRepository = designationRepository;
        this.employeeRepository = employeeRepository;
        this.audit = audit;
    }

    // ================================================================== departments

    @Transactional(readOnly = true)
    public List<DepartmentResponse> listDepartments() {
        Map<Long, Long> employees = toCountMap(employeeRepository.countPerDepartment());
        Map<Long, Long> designations = new HashMap<>();
        designationRepository.findAll().forEach(designation -> designations.merge(
                designation.getDepartment().getDepartmentId(), 1L, Long::sum));

        return departmentRepository.findAllByOrderByDepartmentNameAsc().stream()
                .map(department -> DepartmentResponse.from(department,
                        employees.getOrDefault(department.getDepartmentId(), 0L),
                        designations.getOrDefault(department.getDepartmentId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public DepartmentResponse getDepartment(Long id) {
        Department department = loadDepartment(id);
        return DepartmentResponse.from(department,
                employeeRepository.countByDepartment_DepartmentId(id),
                designationRepository.countByDepartment_DepartmentId(id));
    }

    @Transactional
    public DepartmentResponse createDepartment(DepartmentRequest request) {
        String name = request.departmentName().trim();
        if (departmentRepository.existsByDepartmentNameIgnoreCase(name)) {
            throw ConflictException.field("departmentName", "A department with this name already exists.");
        }
        Department department = new Department();
        department.setDepartmentName(name);
        department.setDescription(Texts.trimToNull(request.description()));
        Department saved = departmentRepository.save(department);

        audit.record(AuditAction.CREATE, DEPARTMENT, saved.getDepartmentId(), null, describe(saved));
        return DepartmentResponse.from(saved, 0, 0);
    }

    @Transactional
    public DepartmentResponse updateDepartment(Long id, DepartmentRequest request) {
        Department department = loadDepartment(id);
        String name = request.departmentName().trim();
        if (departmentRepository.existsByDepartmentNameIgnoreCaseAndDepartmentIdNot(name, id)) {
            throw ConflictException.field("departmentName", "A department with this name already exists.");
        }
        String before = describe(department);
        department.setDepartmentName(name);
        department.setDescription(Texts.trimToNull(request.description()));

        audit.record(AuditAction.UPDATE, DEPARTMENT, id, before, describe(department));
        return getDepartment(id);
    }

    @Transactional
    public void deleteDepartment(Long id) {
        Department department = loadDepartment(id);
        long employees = employeeRepository.countByDepartment_DepartmentId(id);
        long designations = designationRepository.countByDepartment_DepartmentId(id);
        if (employees > 0 || designations > 0) {
            throw new ConflictException("Cannot delete '" + department.getDepartmentName() + "': it still has "
                    + employees + " employee(s) and " + designations + " designation(s). Move or delete them first.");
        }
        String before = describe(department);
        departmentRepository.delete(department);
        audit.record(AuditAction.DELETE, DEPARTMENT, id, before, null);
    }

    // ================================================================== designations

    @Transactional(readOnly = true)
    public List<DesignationResponse> listDesignations(Long departmentId) {
        Map<Long, Long> employees = toCountMap(employeeRepository.countPerDesignation());
        List<Designation> designations = departmentId == null
                ? designationRepository.findAllSorted()
                : designationRepository.findByDepartment_DepartmentIdOrderByDesignationNameAsc(departmentId);
        return designations.stream()
                .map(designation -> DesignationResponse.from(designation,
                        employees.getOrDefault(designation.getDesignationId(), 0L)))
                .toList();
    }

    @Transactional
    public DesignationResponse createDesignation(DesignationRequest request) {
        Department department = departmentFor(request.departmentId());
        String name = request.designationName().trim();
        if (designationRepository.existsByDesignationNameIgnoreCaseAndDepartment_DepartmentId(name,
                department.getDepartmentId())) {
            throw ConflictException.field("designationName",
                    "'" + name + "' already exists in " + department.getDepartmentName() + ".");
        }
        Designation designation = new Designation();
        designation.setDesignationName(name);
        designation.setDepartment(department);
        Designation saved = designationRepository.save(designation);

        audit.record(AuditAction.CREATE, DESIGNATION, saved.getDesignationId(), null, describe(saved));
        return DesignationResponse.from(saved, 0);
    }

    @Transactional
    public DesignationResponse updateDesignation(Long id, DesignationRequest request) {
        Designation designation = loadDesignation(id);
        Department department = departmentFor(request.departmentId());
        String name = request.designationName().trim();

        if (designationRepository.existsByDesignationNameIgnoreCaseAndDepartment_DepartmentIdAndDesignationIdNot(
                name, department.getDepartmentId(), id)) {
            throw ConflictException.field("designationName",
                    "'" + name + "' already exists in " + department.getDepartmentName() + ".");
        }

        long employees = employeeRepository.countByDesignation_DesignationId(id);
        boolean departmentChanged = !designation.getDepartment().getDepartmentId().equals(department.getDepartmentId());
        if (departmentChanged && employees > 0) {
            throw new ConflictException("Cannot move this designation to another department while "
                    + employees + " employee(s) hold it.");
        }

        String before = describe(designation);
        designation.setDesignationName(name);
        designation.setDepartment(department);

        audit.record(AuditAction.UPDATE, DESIGNATION, id, before, describe(designation));
        return DesignationResponse.from(designation, employees);
    }

    @Transactional
    public void deleteDesignation(Long id) {
        Designation designation = loadDesignation(id);
        long employees = employeeRepository.countByDesignation_DesignationId(id);
        if (employees > 0) {
            throw new ConflictException("Cannot delete '" + designation.getDesignationName() + "': "
                    + employees + " employee(s) still hold it.");
        }
        String before = describe(designation);
        designationRepository.delete(designation);
        audit.record(AuditAction.DELETE, DESIGNATION, id, before, null);
    }

    // ================================================================== helpers

    private Department loadDepartment(Long id) {
        return departmentRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of(DEPARTMENT, id));
    }

    private Designation loadDesignation(Long id) {
        return designationRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of(DESIGNATION, id));
    }

    private Department departmentFor(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> BadRequestException.field("departmentId", "Selected department does not exist."));
    }

    private static Map<Long, Long> toCountMap(List<Object[]> rows) {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : rows) {
            counts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return counts;
    }

    private static String describe(Department department) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("name", department.getDepartmentName());
        values.put("description", department.getDescription());
        return AuditLogRecorder.describe(values);
    }

    private static String describe(Designation designation) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("name", designation.getDesignationName());
        values.put("department", designation.getDepartment().getDepartmentName());
        return AuditLogRecorder.describe(values);
    }
}
