package com.example.hr_service;

import com.example.hr_service.support.IntegrationTest;
import com.example.hr_service.support.Json;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EmployeeApiTest extends IntegrationTest {

    @Test
    void managersCanCreateAndSearchEmployeesWithPaging() throws Exception {
        Org org = org();
        for (int i = 2; i <= 6; i++) {
            createEmployee(org.hrToken(), "EMP-00" + i, "Person", "Number" + (char) ('A' + i),
                    org.departmentId(), org.designationId());
        }

        getAs(org.hrToken(), "/api/employees?page=0&size=3&sort=employeeCode,asc")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(3)))
                .andExpect(jsonPath("$.totalElements").value(8))
                .andExpect(jsonPath("$.totalPages").value(3));

        getAs(org.hrToken(), "/api/employees?search=ravi")
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].fullName").value("Ravi Kumar"))
                .andExpect(jsonPath("$.content[0].username").value("ravi"))
                .andExpect(jsonPath("$.content[0].accountRole").value("EMPLOYEE"));

        getAs(org.hrToken(), "/api/employees?search=Ravi Kumar")
                .andExpect(jsonPath("$.content", hasSize(1)));

        getAs(org.hrToken(), "/api/employees?sort=salary").andExpect(status().isBadRequest());
    }

    @Test
    void employeesOnlyEverSeeThemselves() throws Exception {
        Org org = org();
        getAs(org.employeeToken(), "/api/employees")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].employeeCode").value("EMP-001"));

        getAs(org.employeeToken(), "/api/employees/{id}", org.hrEmployeeId()).andExpect(status().isForbidden());
        getAs(org.employeeToken(), "/api/employees/{id}", org.employeeId()).andExpect(status().isOk());
        getAs(org.employeeToken(), "/api/employees/me").andExpect(jsonPath("$.employeeCode").value("EMP-001"));
    }

    @Test
    void employeesCannotCreateUpdateOrDelete() throws Exception {
        Org org = org();
        postAs(org.employeeToken(), employeeJson("EMP-9", "Eve", "Hacker", "eve@example.com",
                org.departmentId(), org.designationId(), "ACTIVE"), "/api/employees")
                .andExpect(status().isForbidden());
        putAs(org.employeeToken(), employeeJson("EMP-001", "Ravi", "Kumar", "ravi.kumar@example.com",
                org.departmentId(), org.designationId(), "ACTIVE"), "/api/employees/{id}", org.employeeId())
                .andExpect(status().isForbidden());
        deleteAs(org.employeeToken(), "/api/employees/{id}", org.hrEmployeeId()).andExpect(status().isForbidden());
    }

    @Test
    void employeesCanUpdateTheirOwnContactDetailsOnly() throws Exception {
        Org org = org();
        putAs(org.employeeToken(), Json.of("email", "ravi.new@example.com", "phone", "9988776655"),
                "/api/employees/me/contact")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ravi.new@example.com"))
                .andExpect(jsonPath("$.phone").value("9988776655"));

        // Email already used by someone else
        putAs(org.employeeToken(), Json.of("email", "harini.rao@example.com", "phone", "9988776655"),
                "/api/employees/me/contact")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors.email").exists());

        putAs(org.employeeToken(), Json.of("email", "bad", "phone", "123"), "/api/employees/me/contact")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.phone").exists());
    }

    @Test
    void validationAndUniquenessRulesAreEnforced() throws Exception {
        Org org = org();

        postAs(org.adminToken(), Json.of("firstName", "", "email", "invalid"), "/api/employees")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.firstName").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.departmentId").exists());

        // Duplicate code (case-insensitive) and duplicate email
        postAs(org.adminToken(), employeeJson("emp-001", "Other", "Person", "RAVI.KUMAR@example.com",
                org.departmentId(), org.designationId(), "ACTIVE"), "/api/employees")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors.employeeCode").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists());

        // Future joining date
        String future = Json.of("employeeCode", "EMP-777", "firstName", "Fut", "lastName", "Ure",
                "email", "future@example.com", "phone", "9123456780", "dateOfJoining", TODAY.plusDays(5).toString(),
                "departmentId", org.departmentId(), "designationId", org.designationId(), "status", "ACTIVE");
        postAs(org.adminToken(), future, "/api/employees")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.dateOfJoining").exists());

        // Designation from another department
        Long finance = createDepartment(org.adminToken(), "Finance");
        Long accountant = createDesignation(org.adminToken(), finance, "Accountant");
        postAs(org.adminToken(), employeeJson("EMP-778", "Mis", "Match", "mismatch@example.com",
                org.departmentId(), accountant, "ACTIVE"), "/api/employees")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.designationId").value(containsString("does not belong")));

        // Invalid enum value
        postAs(org.adminToken(), employeeJson("EMP-779", "Bad", "Status", "status@example.com",
                org.departmentId(), org.designationId(), "RETIRED"), "/api/employees")
                .andExpect(status().isBadRequest());
    }

    @Test
    void hrCannotModifyAdministratorsOrHrColleagues() throws Exception {
        Org org = org();
        putAs(org.hrToken(), employeeJson("EMP-ADMIN", "Asha", "Admin", "asha.admin@example.com",
                org.departmentId(), org.designationId(), "ACTIVE"), "/api/employees/{id}", org.adminEmployeeId())
                .andExpect(status().isForbidden());
        deleteAs(org.hrToken(), "/api/employees/{id}", org.adminEmployeeId()).andExpect(status().isForbidden());

        // HR can manage plain employees
        putAs(org.hrToken(), employeeJson("EMP-001", "Ravi", "Kumar", "ravi.kumar@example.com",
                org.departmentId(), org.designationId(), "ACTIVE"), "/api/employees/{id}", org.employeeId())
                .andExpect(status().isOk());
    }

    @Test
    void nobodyCanDeleteThemselvesOrTheLastAdministrator() throws Exception {
        Org org = org();
        deleteAs(org.adminToken(), "/api/employees/{id}", org.adminEmployeeId())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(containsString("your own")));

        putAs(org.adminToken(), employeeJson("EMP-ADMIN", "Asha", "Admin", "asha.admin@example.com",
                org.departmentId(), org.designationId(), "INACTIVE"), "/api/employees/{id}", org.adminEmployeeId())
                .andExpect(status().isBadRequest());
    }

    @Test
    void deletingAnEmployeeRemovesDependentRecords() throws Exception {
        Org org = org();
        postAs(org.employeeToken(), null, "/api/attendance/check-in").andExpect(status().isOk());

        deleteAs(org.adminToken(), "/api/employees/{id}", org.employeeId()).andExpect(status().isNoContent());

        getAs(org.adminToken(), "/api/employees/{id}", org.employeeId()).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username = 'ravi'", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM attendance", Integer.class)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE action = 'DELETE' AND entity_name = 'Employee'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void optionsListExcludesEmployeesWhoAlreadyHaveAccounts() throws Exception {
        Org org = org();
        createEmployee(org.adminToken(), "EMP-002", "Neha", "Shah", org.departmentId(), org.designationId());
        getAs(org.hrToken(), "/api/employees/options?withoutAccount=true")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].fullName").value("Neha Shah"));
        getAs(org.employeeToken(), "/api/employees/options").andExpect(status().isForbidden());
    }
}
