package com.example.hr_service;

import com.example.hr_service.support.IntegrationTest;
import com.example.hr_service.support.Json;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserAndRoleApiTest extends IntegrationTest {

    @Test
    void hrCannotCreateOrPromoteToPrivilegedRoles() throws Exception {
        Org org = org();
        Long newHire = createEmployee(org.adminToken(), "EMP-002", "Neha", "Shah", org.departmentId(),
                org.designationId());

        // The privilege-escalation hole from the original code: HR creating an ADMIN.
        postAs(org.hrToken(), Json.of("employeeId", newHire, "username", "neha", "password", PASSWORD,
                "role", "ADMIN"), "/api/users")
                .andExpect(status().isForbidden());
        postAs(org.hrToken(), Json.of("employeeId", newHire, "username", "neha", "password", PASSWORD,
                "role", "HR"), "/api/users")
                .andExpect(status().isForbidden());

        // HR may create EMPLOYEE accounts
        postAs(org.hrToken(), Json.of("employeeId", newHire, "username", "neha", "password", PASSWORD,
                "role", "EMPLOYEE"), "/api/users")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("EMPLOYEE"));

        // ...but cannot promote them, nor touch the admin account
        putAs(org.hrToken(), Json.of("username", "ravi", "role", "ADMIN", "enabled", true),
                "/api/users/{id}", org.employeeUserId())
                .andExpect(status().isForbidden());
        putAs(org.hrToken(), Json.of("username", "admin", "role", "ADMIN", "enabled", false),
                "/api/users/{id}", org.adminUserId())
                .andExpect(status().isForbidden());
        postAs(org.hrToken(), Json.of("newPassword", "Hijack3d!"), "/api/users/{id}/reset-password", org.adminUserId())
                .andExpect(status().isForbidden());
        deleteAs(org.hrToken(), "/api/users/{id}", org.adminUserId()).andExpect(status().isForbidden());
    }

    @Test
    void hrChangingOwnRoleIsBlocked() throws Exception {
        Org org = org();
        putAs(org.hrToken(), Json.of("username", "hr", "role", "ADMIN", "enabled", true),
                "/api/users/{id}", org.hrUserId())
                .andExpect(status().isForbidden());
    }

    @Test
    void accountUniquenessRules() throws Exception {
        Org org = org();
        Long newHire = createEmployee(org.adminToken(), "EMP-002", "Neha", "Shah", org.departmentId(),
                org.designationId());

        postAs(org.adminToken(), Json.of("employeeId", newHire, "username", "RAVI", "password", PASSWORD,
                "role", "EMPLOYEE"), "/api/users")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors.username").exists());

        postAs(org.adminToken(), Json.of("employeeId", org.employeeId(), "username", "ravi2", "password", PASSWORD,
                "role", "EMPLOYEE"), "/api/users")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors.employeeId").exists());

        postAs(org.adminToken(), Json.of("employeeId", newHire, "username", "x", "password", "nodigits",
                "role", "EMPLOYEE"), "/api/users")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.username").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void lastAdministratorIsProtected() throws Exception {
        Org org = org();
        putAs(org.adminToken(), Json.of("username", "admin", "role", "HR", "enabled", true),
                "/api/users/{id}", org.adminUserId())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(containsString("your own role")));
        deleteAs(org.adminToken(), "/api/users/{id}", org.adminUserId())
                .andExpect(status().isForbidden());

        // Promote HR to admin, then the original admin can be demoted by the new one.
        putAs(org.adminToken(), Json.of("username", "hr", "role", "ADMIN", "enabled", true),
                "/api/users/{id}", org.hrUserId())
                .andExpect(status().isOk());
        String newAdmin = login("hr", PASSWORD);
        putAs(newAdmin, Json.of("username", "admin", "role", "EMPLOYEE", "enabled", true),
                "/api/users/{id}", org.adminUserId())
                .andExpect(status().isOk());
        // Now "hr" is the last admin and cannot be demoted by anyone else... nor by themselves.
        putAs(newAdmin, Json.of("username", "hr", "role", "EMPLOYEE", "enabled", true),
                "/api/users/{id}", org.hrUserId())
                .andExpect(status().isForbidden());
    }

    @Test
    void roleChangeAndPasswordResetInvalidateExistingSessions() throws Exception {
        Org org = org();
        postAs(org.adminToken(), Json.of("newPassword", "Reset1234"), "/api/users/{id}/reset-password",
                org.employeeUserId())
                .andExpect(status().isNoContent());
        getAs(org.employeeToken(), "/api/auth/me").andExpect(status().isUnauthorized());
        login("ravi", "Reset1234");

        String hrToken = org.hrToken();
        putAs(org.adminToken(), Json.of("username", "hr", "role", "EMPLOYEE", "enabled", true),
                "/api/users/{id}", org.hrUserId())
                .andExpect(status().isOk());
        getAs(hrToken, "/api/users").andExpect(status().isUnauthorized());
    }

    @Test
    void disablingAnAccountBlocksLogin() throws Exception {
        Org org = org();
        putAs(org.adminToken(), Json.of("username", "ravi", "role", "EMPLOYEE", "enabled", false),
                "/api/users/{id}", org.employeeUserId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
        postAs(null, Json.of("username", "ravi", "password", PASSWORD), "/api/auth/login")
                .andExpect(status().isUnauthorized());
    }

    @Test
    void userListShowsWhatTheCallerMayManage() throws Exception {
        Org org = org();
        getAs(org.hrToken(), "/api/users")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[?(@.username == 'admin')].canManage").value(false))
                .andExpect(jsonPath("$[?(@.username == 'ravi')].canManage").value(true))
                .andExpect(jsonPath("$[?(@.username == 'hr')].self").value(true));
        getAs(org.employeeToken(), "/api/users").andExpect(status().isForbidden());
    }

    @Test
    void deletingAUserKeepsTheirLeaveHistoryReadable() throws Exception {
        Org org = org();
        Long leaveId = readId(postAs(org.employeeToken(), Json.of("leaveType", "CASUAL",
                "startDate", "2026-06-15", "endDate", "2026-06-15", "reason", "Personal work"),
                "/api/leave-requests").andExpect(status().isCreated()), "$.leaveId");
        postAs(org.hrToken(), Json.of("comment", "ok"), "/api/leave-requests/{id}/approve", leaveId)
                .andExpect(status().isOk());

        deleteAs(org.adminToken(), "/api/users/{id}", org.hrUserId()).andExpect(status().isNoContent());

        getAs(org.adminToken(), "/api/leave-requests/{id}", leaveId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.reviewedById").value(nullValue()));
    }

    @Test
    void rolesAreReadOnly() throws Exception {
        Org org = org();
        getAs(org.hrToken(), "/api/roles")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].roleName").value("ADMIN"))
                .andExpect(jsonPath("$[0].userCount").value(1))
                .andExpect(jsonPath("$[0].permissions").isArray());

        postAs(org.adminToken(), Json.of("roleName", "SUPERUSER"), "/api/roles")
                .andExpect(status().isMethodNotAllowed());
        getAs(org.employeeToken(), "/api/roles").andExpect(status().isForbidden());
    }
}
