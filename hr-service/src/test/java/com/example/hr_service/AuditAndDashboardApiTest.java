package com.example.hr_service;

import com.example.hr_service.support.IntegrationTest;
import com.example.hr_service.support.Json;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuditAndDashboardApiTest extends IntegrationTest {

    @Test
    void changesAreAuditedWithTheActorsUsername() throws Exception {
        Org org = org();
        putAs(org.hrToken(), Json.of("email", "ravi@example.com", "phone", "9123456780"), "/api/employees/me/contact")
                .andExpect(status().isOk());

        getAs(org.adminToken(), "/api/audit-logs?entityName=Employee&action=UPDATE")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].username").value("hr"))
                .andExpect(jsonPath("$.content[0].oldValue").value("email=harini.rao@example.com"))
                .andExpect(jsonPath("$.content[0].newValue").value("email=ravi@example.com"));

        getAs(org.adminToken(), "/api/audit-logs?action=LOGIN")
                .andExpect(jsonPath("$.totalElements").value(greaterThan(2)));

        getAs(org.adminToken(), "/api/audit-logs/filters")
                .andExpect(jsonPath("$.actions", hasItem("SETUP")))
                .andExpect(jsonPath("$.entityNames", hasItem("Employee")));
    }

    @Test
    void failedSignInsAreAudited() throws Exception {
        String admin = bootstrapAdmin();
        postAs(null, Json.of("username", "ghost", "password", "whatever1"), "/api/auth/login")
                .andExpect(status().isUnauthorized());
        getAs(admin, "/api/audit-logs?action=LOGIN_FAILED")
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].username").value("ghost"));
    }

    @Test
    void auditTrailIsReadOnlyAndAdminOnly() throws Exception {
        Org org = org();
        postAs(org.adminToken(), Json.of("action", "FAKE"), "/api/audit-logs")
                .andExpect(status().isMethodNotAllowed());
        deleteAs(org.adminToken(), "/api/audit-logs/1").andExpect(status().isNotFound());
        getAs(org.hrToken(), "/api/audit-logs").andExpect(status().isForbidden());
        getAs(org.employeeToken(), "/api/audit-logs").andExpect(status().isForbidden());
    }

    @Test
    void managerDashboardIncludesOrganisationStats() throws Exception {
        Org org = org();
        postAs(org.employeeToken(), null, "/api/attendance/check-in");
        postAs(org.employeeToken(), Json.of("leaveType", "CASUAL", "startDate", "2026-06-15", "endDate", "2026-06-15",
                "reason", "Errand"), "/api/leave-requests");

        getAs(org.hrToken(), "/api/dashboard")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.today").value("2026-06-10"))
                .andExpect(jsonPath("$.organization.totalEmployees").value(3))
                .andExpect(jsonPath("$.organization.activeEmployees").value(3))
                .andExpect(jsonPath("$.organization.pendingLeaveRequests").value(1))
                .andExpect(jsonPath("$.organization.attendanceToday.PRESENT").value(1))
                .andExpect(jsonPath("$.organization.attendanceToday.NOT_MARKED").value(2))
                .andExpect(jsonPath("$.organization.attendanceTrend", hasSize(7)))
                .andExpect(jsonPath("$.organization.pendingApprovals", hasSize(1)))
                .andExpect(jsonPath("$.organization.headcountByDepartment[0].name").value("Engineering"))
                .andExpect(jsonPath("$.me.leaveBalance", hasSize(4)));
    }

    @Test
    void employeeDashboardIsPersonalOnly() throws Exception {
        Org org = org();
        getAs(org.employeeToken(), "/api/dashboard")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organization").value(nullValue()))
                .andExpect(jsonPath("$.me.attendanceToday.canCheckIn").value(true))
                .andExpect(jsonPath("$.me.attendanceThisMonth.PRESENT").value(0));
    }
}
