package com.example.hr_service;

import com.example.hr_service.support.IntegrationTest;
import com.example.hr_service.support.Json;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AttendanceApiTest extends IntegrationTest {

    @Test
    void checkInAndFullDayCheckOut() throws Exception {
        Org org = org();

        getAs(org.employeeToken(), "/api/attendance/today")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canCheckIn").value(true))
                .andExpect(jsonPath("$.record").value(nullValue()));

        postAs(org.employeeToken(), null, "/api/attendance/check-in")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.record.status").value("PRESENT"))
                .andExpect(jsonPath("$.record.checkIn").value(startsWith("2026-06-10T10:00")))
                .andExpect(jsonPath("$.canCheckIn").value(false))
                .andExpect(jsonPath("$.canCheckOut").value(true));

        postAs(org.employeeToken(), null, "/api/attendance/check-in").andExpect(status().isConflict());

        // A working day outlasts the test session, so sign in again like a real user would.
        clock.advance(Duration.ofHours(9));
        String token = login("ravi", PASSWORD);
        postAs(token, null, "/api/attendance/check-out")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.record.status").value("PRESENT"))
                .andExpect(jsonPath("$.record.workedMinutes").value(540))
                .andExpect(jsonPath("$.canCheckOut").value(false));

        postAs(token, null, "/api/attendance/check-out").andExpect(status().isConflict());
    }

    @Test
    void shortDayBecomesHalfDay() throws Exception {
        Org org = org();
        postAs(org.employeeToken(), null, "/api/attendance/check-in").andExpect(status().isOk());
        clock.advance(Duration.ofHours(2));
        postAs(login("ravi", PASSWORD), null, "/api/attendance/check-out")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.record.status").value("HALF_DAY"));
    }

    @Test
    void checkOutWithoutCheckInIsRejected() throws Exception {
        Org org = org();
        postAs(org.employeeToken(), null, "/api/attendance/check-out").andExpect(status().isConflict());
    }

    @Test
    void hrMaintainsAttendanceWithValidation() throws Exception {
        Org org = org();
        String yesterday = TODAY.minusDays(1).toString();

        Long id = readId(postAs(org.hrToken(), Json.of("employeeId", org.employeeId(), "attendanceDate", yesterday,
                "status", "PRESENT", "checkIn", yesterday + "T09:05:00", "checkOut", yesterday + "T18:10:00"),
                "/api/attendance")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.workedMinutes").value(545)), "$.attendanceId");

        postAs(org.hrToken(), Json.of("employeeId", org.employeeId(), "attendanceDate", yesterday, "status", "ABSENT"),
                "/api/attendance")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors.attendanceDate").exists());

        postAs(org.hrToken(), Json.of("employeeId", org.employeeId(), "attendanceDate", TODAY.plusDays(1).toString(),
                "status", "PRESENT"), "/api/attendance")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.attendanceDate").exists());

        String twoDaysAgo = TODAY.minusDays(2).toString();
        postAs(org.hrToken(), Json.of("employeeId", org.employeeId(), "attendanceDate", twoDaysAgo, "status", "PRESENT",
                "checkIn", twoDaysAgo + "T18:00:00", "checkOut", twoDaysAgo + "T09:00:00"), "/api/attendance")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.checkOut").exists());

        postAs(org.hrToken(), Json.of("employeeId", org.employeeId(), "attendanceDate", twoDaysAgo, "status", "ABSENT",
                "checkIn", twoDaysAgo + "T09:00:00"), "/api/attendance")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.status").exists());

        putAs(org.hrToken(), Json.of("employeeId", org.employeeId(), "attendanceDate", yesterday, "status", "ABSENT"),
                "/api/attendance/{id}", id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ABSENT"))
                .andExpect(jsonPath("$.checkIn").value(nullValue()));

        deleteAs(org.hrToken(), "/api/attendance/{id}", id).andExpect(status().isNoContent());
        getAs(org.hrToken(), "/api/attendance/{id}", id).andExpect(status().isNotFound());
    }

    @Test
    void employeesSeeOnlyTheirOwnAttendanceAndCannotEditIt() throws Exception {
        Org org = org();
        String yesterday = TODAY.minusDays(1).toString();
        postAs(org.hrToken(), Json.of("employeeId", org.hrEmployeeId(), "attendanceDate", yesterday, "status", "PRESENT"),
                "/api/attendance").andExpect(status().isCreated());
        Long own = readId(postAs(org.hrToken(), Json.of("employeeId", org.employeeId(), "attendanceDate", yesterday,
                "status", "PRESENT"), "/api/attendance"), "$.attendanceId");

        getAs(org.employeeToken(), "/api/attendance")
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].employeeId").value(org.employeeId()));
        getAs(org.employeeToken(), "/api/attendance?employeeId={id}", org.hrEmployeeId())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].employeeId").value(org.employeeId()));

        getAs(org.hrToken(), "/api/attendance").andExpect(jsonPath("$.content", hasSize(2)));

        postAs(org.employeeToken(), Json.of("employeeId", org.employeeId(), "attendanceDate",
                TODAY.minusDays(3).toString(), "status", "PRESENT"), "/api/attendance")
                .andExpect(status().isForbidden());
        deleteAs(org.employeeToken(), "/api/attendance/{id}", own).andExpect(status().isForbidden());
    }

    @Test
    void searchValidatesDateRange() throws Exception {
        Org org = org();
        getAs(org.hrToken(), "/api/attendance?from=2026-06-10&to=2026-06-01")
                .andExpect(status().isBadRequest());
        getAs(org.hrToken(), "/api/attendance?from=not-a-date")
                .andExpect(status().isBadRequest());
        getAs(org.hrToken(), "/api/attendance?status=PRESENT&from=2026-06-01&to=2026-06-10&page=0&size=5")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(5));
    }
}
