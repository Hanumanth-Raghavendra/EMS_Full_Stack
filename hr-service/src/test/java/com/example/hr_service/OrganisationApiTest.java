package com.example.hr_service;

import com.example.hr_service.support.IntegrationTest;
import com.example.hr_service.support.Json;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Departments, designations, projects and assignments. */
class OrganisationApiTest extends IntegrationTest {

    // ------------------------------------------------------------------ departments

    @Test
    void departmentNamesAreUniqueIgnoringCase() throws Exception {
        String admin = bootstrapAdmin();
        createDepartment(admin, "Engineering");
        postAs(admin, Json.of("departmentName", "  engineering "), "/api/departments")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors.departmentName").exists());
        postAs(admin, Json.of("departmentName", ""), "/api/departments")
                .andExpect(status().isBadRequest());
    }

    @Test
    void departmentInUseCannotBeDeleted() throws Exception {
        Org org = org();
        deleteAs(org.adminToken(), "/api/departments/{id}", org.departmentId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("still has")));

        Long empty = createDepartment(org.adminToken(), "Legal");
        deleteAs(org.adminToken(), "/api/departments/{id}", empty).andExpect(status().isNoContent());
        deleteAs(org.adminToken(), "/api/departments/{id}", empty).andExpect(status().isNotFound());
    }

    @Test
    void departmentListIncludesCounts() throws Exception {
        Org org = org();
        getAs(org.hrToken(), "/api/departments")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].departmentName").value("Engineering"))
                .andExpect(jsonPath("$[0].employeeCount").value(2))
                .andExpect(jsonPath("$[0].designationCount").value(1));
    }

    @Test
    void employeesCannotManageMasterData() throws Exception {
        Org org = org();
        getAs(org.employeeToken(), "/api/departments").andExpect(status().isForbidden());
        postAs(org.employeeToken(), Json.of("departmentName", "Shadow IT"), "/api/departments")
                .andExpect(status().isForbidden());
        getAs(org.employeeToken(), "/api/designations").andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------------ designations

    @Test
    void designationRules() throws Exception {
        Org org = org();
        postAs(org.adminToken(), Json.of("designationName", "software engineer", "departmentId", org.departmentId()),
                "/api/designations")
                .andExpect(status().isConflict());

        Long sales = createDepartment(org.adminToken(), "Sales");
        // Same name in another department is fine
        createDesignation(org.adminToken(), sales, "Software Engineer");

        postAs(org.adminToken(), Json.of("designationName", "Ghost", "departmentId", 9999), "/api/designations")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.departmentId").exists());

        // Held by employees: cannot delete or move
        deleteAs(org.adminToken(), "/api/designations/{id}", org.designationId()).andExpect(status().isConflict());
        putAs(org.adminToken(), Json.of("designationName", "Software Engineer", "departmentId", sales),
                "/api/designations/{id}", org.designationId())
                .andExpect(status().isConflict());

        getAs(org.adminToken(), "/api/designations?departmentId={id}", sales)
                .andExpect(jsonPath("$", hasSize(1)));
        getAs(org.adminToken(), "/api/designations/department/{id}", org.departmentId())
                .andExpect(jsonPath("$[0].employeeCount").value(2));
    }

    // ------------------------------------------------------------------ projects

    @Test
    void projectValidation() throws Exception {
        String admin = bootstrapAdmin();
        postAs(admin, Json.of("projectName", "Apollo", "status", "ACTIVE",
                "startDate", "2026-06-01", "endDate", "2026-05-01"), "/api/projects")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.endDate").exists());

        postAs(admin, Json.of("projectName", "Apollo", "status", "COMPLETED"), "/api/projects")
                .andExpect(status().isBadRequest());

        postAs(admin, Json.of("projectName", "Apollo", "status", "ACTIVE"), "/api/projects")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.memberCount").value(0));

        postAs(admin, Json.of("projectName", "APOLLO", "status", "PLANNED"), "/api/projects")
                .andExpect(status().isConflict());
    }

    @Test
    void assignmentRules() throws Exception {
        Org org = org();
        Long active = readId(postAs(org.adminToken(), Json.of("projectName", "Apollo", "status", "ACTIVE"),
                "/api/projects").andExpect(status().isCreated()), "$.projectId");
        Long done = readId(postAs(org.adminToken(), Json.of("projectName", "Legacy", "status", "COMPLETED",
                "startDate", "2025-01-01", "endDate", "2025-12-31"), "/api/projects"), "$.projectId");

        postAs(org.hrToken(), Json.of("employeeId", org.employeeId(), "projectId", active, "roleInProject", "Developer"),
                "/api/employee-projects")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.employeeName").value("Ravi Kumar"))
                .andExpect(jsonPath("$.assignedAt").exists());

        postAs(org.hrToken(), Json.of("employeeId", org.employeeId(), "projectId", active, "roleInProject", "Lead"),
                "/api/employee-projects")
                .andExpect(status().isConflict());

        postAs(org.hrToken(), Json.of("employeeId", org.employeeId(), "projectId", done, "roleInProject", "Dev"),
                "/api/employee-projects")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.projectId").exists());

        putAs(org.hrToken(), Json.of("roleInProject", "Tech Lead"), "/api/employee-projects/{e}/{p}",
                org.employeeId(), active)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleInProject").value("Tech Lead"));

        // Employees see only their own assignments and cannot change them
        getAs(org.employeeToken(), "/api/employee-projects")
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].projectName").value("Apollo"));
        getAs(org.employeeToken(), "/api/employee-projects?employeeId={id}", org.hrEmployeeId())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].employeeId").value(org.employeeId()));
        deleteAs(org.employeeToken(), "/api/employee-projects/{e}/{p}", org.employeeId(), active)
                .andExpect(status().isForbidden());

        getAs(org.adminToken(), "/api/projects").andExpect(jsonPath("$[0].memberCount").value(1));

        // Deleting the project removes its assignments
        deleteAs(org.adminToken(), "/api/projects/{id}", active).andExpect(status().isNoContent());
        getAs(org.adminToken(), "/api/employee-projects").andExpect(jsonPath("$", hasSize(0)));
    }
}
