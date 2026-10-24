package com.example.hr_service;

import com.example.hr_service.support.IntegrationTest;
import com.example.hr_service.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Leave workflow. The test clock is Wednesday 10 June 2026; the 15th is a
 * Monday and the 19th a Friday.
 */
class LeaveApiTest extends IntegrationTest {

    private ResultActions apply(String token, String type, String start, String end) throws Exception {
        return postAs(token, Json.of("leaveType", type, "startDate", start, "endDate", end,
                "reason", "Family function"), "/api/leave-requests");
    }

    @Test
    void employeeAppliesAndHrApproves() throws Exception {
        Org org = org();
        Long id = readId(apply(org.employeeToken(), "CASUAL", "2026-06-15", "2026-06-19")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.days").value(5))
                .andExpect(jsonPath("$.permissions.edit").value(true))
                .andExpect(jsonPath("$.permissions.review").value(false)), "$.leaveId");

        getAs(org.employeeToken(), "/api/leave-requests/balance")
                .andExpect(jsonPath("$.balances[?(@.leaveType == 'CASUAL')].pending").value(5))
                .andExpect(jsonPath("$.balances[?(@.leaveType == 'CASUAL')].remaining").value(7));

        getAs(org.hrToken(), "/api/leave-requests?status=PENDING")
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].permissions.review").value(true));

        postAs(org.hrToken(), Json.of("comment", "Enjoy!"), "/api/leave-requests/{id}/approve", id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.reviewedByUsername").value("hr"))
                .andExpect(jsonPath("$.reviewComment").value("Enjoy!"));

        // Approval fills the working days with LEAVE attendance.
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM attendance WHERE status = 'LEAVE'", Integer.class))
                .isEqualTo(5);

        getAs(org.employeeToken(), "/api/leave-requests/balance")
                .andExpect(jsonPath("$.balances[?(@.leaveType == 'CASUAL')].used").value(5));

        postAs(org.hrToken(), null, "/api/leave-requests/{id}/approve", id)
                .andExpect(status().isConflict());
    }

    @Test
    void dateRulesAreEnforced() throws Exception {
        Org org = org();
        apply(org.employeeToken(), "CASUAL", "2026-06-19", "2026-06-15")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.endDate").exists());

        apply(org.employeeToken(), "CASUAL", "2026-06-13", "2026-06-14")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.endDate").value(containsString("no working days")));

        apply(org.employeeToken(), "CASUAL", "2026-12-31", "2027-01-01")
                .andExpect(status().isBadRequest());

        apply(org.employeeToken(), "CASUAL", "2026-04-01", "2026-04-01")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.startDate").exists());

        apply(org.employeeToken(), "UNPAID", "2026-06-15", "2026-08-15")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.endDate").value(containsString("at most")));

        postAs(org.employeeToken(), Json.of("leaveType", "CASUAL", "startDate", "2026-06-15", "endDate", "2026-06-15"),
                "/api/leave-requests")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.reason").exists());
    }

    @Test
    void overlappingRequestsAreRejected() throws Exception {
        Org org = org();
        apply(org.employeeToken(), "CASUAL", "2026-06-15", "2026-06-17").andExpect(status().isCreated());
        apply(org.employeeToken(), "SICK", "2026-06-17", "2026-06-18")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors.startDate").value(containsString("overlap")));
    }

    @Test
    void quotaCannotBeExceeded() throws Exception {
        Org org = org();
        // SICK quota is 10 days: two working weeks = 10 days fits exactly.
        apply(org.employeeToken(), "SICK", "2026-06-15", "2026-06-26").andExpect(status().isCreated());
        apply(org.employeeToken(), "SICK", "2026-06-29", "2026-06-29")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.leaveType").value(containsString("0 day(s) remaining")));
        // UNPAID has no quota
        apply(org.employeeToken(), "UNPAID", "2026-06-29", "2026-06-30").andExpect(status().isCreated());
    }

    @Test
    void reviewerRules() throws Exception {
        Org org = org();
        Long ravis = readId(apply(org.employeeToken(), "CASUAL", "2026-06-15", "2026-06-15"), "$.leaveId");
        Long hrs = readId(apply(org.hrToken(), "CASUAL", "2026-06-16", "2026-06-16"), "$.leaveId");

        // Employees cannot review
        postAs(org.employeeToken(), null, "/api/leave-requests/{id}/approve", ravis).andExpect(status().isForbidden());
        // Nobody reviews their own request
        postAs(org.hrToken(), null, "/api/leave-requests/{id}/approve", hrs).andExpect(status().isForbidden());
        // Rejecting needs a reason
        postAs(org.hrToken(), Json.of("comment", " "), "/api/leave-requests/{id}/reject", ravis)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.comment").exists());
        postAs(org.hrToken(), Json.of("comment", "Release week"), "/api/leave-requests/{id}/reject", ravis)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
        // HR leave is reviewed by an administrator
        postAs(org.adminToken(), null, "/api/leave-requests/{id}/approve", hrs)
                .andExpect(status().isOk());
    }

    @Test
    void hrCannotReviewAnotherHrMembersLeave() throws Exception {
        Org org = org();
        Long otherHrEmployee = createEmployee(org.adminToken(), "EMP-HR2", "Kiran", "Das", org.departmentId(),
                org.designationId());
        createUser(org.adminToken(), otherHrEmployee, "kiran", "HR");
        Long leave = readId(apply(login("kiran", PASSWORD), "CASUAL", "2026-06-15", "2026-06-15"), "$.leaveId");

        postAs(org.hrToken(), null, "/api/leave-requests/{id}/approve", leave)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(containsString("administrators")));
    }

    @Test
    void cancellingApprovedLeaveRemovesLeaveAttendance() throws Exception {
        Org org = org();
        Long id = readId(apply(org.employeeToken(), "CASUAL", "2026-06-15", "2026-06-16"), "$.leaveId");
        postAs(org.hrToken(), null, "/api/leave-requests/{id}/approve", id).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM attendance", Integer.class)).isEqualTo(2);

        postAs(org.employeeToken(), null, "/api/leave-requests/{id}/cancel", id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM attendance", Integer.class)).isZero();

        postAs(org.employeeToken(), null, "/api/leave-requests/{id}/cancel", id).andExpect(status().isConflict());
    }

    @Test
    void employeesCannotCancelOrEditOthersRequests() throws Exception {
        Org org = org();
        Long hrs = readId(apply(org.hrToken(), "CASUAL", "2026-06-16", "2026-06-16"), "$.leaveId");

        postAs(org.employeeToken(), null, "/api/leave-requests/{id}/cancel", hrs).andExpect(status().isForbidden());
        putAs(org.employeeToken(), Json.of("leaveType", "SICK", "startDate", "2026-06-16", "endDate", "2026-06-16",
                "reason", "Changed"), "/api/leave-requests/{id}", hrs)
                .andExpect(status().isForbidden());
        getAs(org.employeeToken(), "/api/leave-requests/{id}", hrs).andExpect(status().isForbidden());
        deleteAs(org.employeeToken(), "/api/leave-requests/{id}", hrs).andExpect(status().isForbidden());
        postAs(org.employeeToken(), Json.of("employeeId", org.hrEmployeeId(), "leaveType", "CASUAL",
                "startDate", "2026-06-22", "endDate", "2026-06-22", "reason", "Sneaky"), "/api/leave-requests")
                .andExpect(status().isForbidden());

        getAs(org.employeeToken(), "/api/leave-requests").andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    void pendingRequestCanBeEditedButNotAfterReview() throws Exception {
        Org org = org();
        Long id = readId(apply(org.employeeToken(), "CASUAL", "2026-06-15", "2026-06-15"), "$.leaveId");

        putAs(org.employeeToken(), Json.of("leaveType", "SICK", "startDate", "2026-06-15", "endDate", "2026-06-16",
                "reason", "Flu"), "/api/leave-requests/{id}", id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leaveType").value("SICK"))
                .andExpect(jsonPath("$.days").value(2));

        postAs(org.hrToken(), Json.of("comment", "Busy week"), "/api/leave-requests/{id}/reject", id)
                .andExpect(status().isOk());

        putAs(org.employeeToken(), Json.of("leaveType", "SICK", "startDate", "2026-06-15", "endDate", "2026-06-16",
                "reason", "Flu"), "/api/leave-requests/{id}", id)
                .andExpect(status().isConflict());
    }

    @Test
    void approvedLeaveBlocksCheckIn() throws Exception {
        Org org = org();
        Long id = readId(apply(org.employeeToken(), "CASUAL", "2026-06-10", "2026-06-10"), "$.leaveId");
        postAs(org.hrToken(), null, "/api/leave-requests/{id}/approve", id).andExpect(status().isOk());

        getAs(org.employeeToken(), "/api/attendance/today")
                .andExpect(jsonPath("$.onApprovedLeave").value(true))
                .andExpect(jsonPath("$.canCheckIn").value(false));
        postAs(org.employeeToken(), null, "/api/attendance/check-in")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("approved leave")));
    }

    @Test
    void managersCanFilterAndApplyOnBehalf() throws Exception {
        Org org = org();
        postAs(org.hrToken(), Json.of("employeeId", org.employeeId(), "leaveType", "EARNED",
                "startDate", "2026-07-06", "endDate", "2026-07-07", "reason", "Requested by phone"),
                "/api/leave-requests")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.employeeName").value("Ravi Kumar"));
        apply(org.hrToken(), "CASUAL", "2026-06-16", "2026-06-16").andExpect(status().isCreated());

        getAs(org.hrToken(), "/api/leave-requests").andExpect(jsonPath("$.totalElements").value(2));
        getAs(org.hrToken(), "/api/leave-requests?mine=true").andExpect(jsonPath("$.totalElements").value(1));
        getAs(org.hrToken(), "/api/leave-requests?leaveType=EARNED").andExpect(jsonPath("$.totalElements").value(1));
        getAs(org.hrToken(), "/api/leave-requests?employeeId={id}", org.employeeId())
                .andExpect(jsonPath("$.totalElements").value(1));
        getAs(org.hrToken(), "/api/leave-requests/balance?employeeId={id}", org.employeeId())
                .andExpect(status().isOk());
        getAs(org.employeeToken(), "/api/leave-requests/balance?employeeId={id}", org.hrEmployeeId())
                .andExpect(status().isForbidden());
    }
}
