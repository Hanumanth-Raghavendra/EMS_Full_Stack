package com.example.hr_service;

import com.example.hr_service.support.IntegrationTest;
import com.example.hr_service.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import java.time.Duration;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthAndSetupApiTest extends IntegrationTest {

    // ------------------------------------------------------------------ setup

    @Test
    void setupStatusIsPublicAndReportsRequiredOnEmptyDatabase() throws Exception {
        getAs(null, "/api/setup/status")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.setupRequired").value(true))
                .andExpect(jsonPath("$.setupTokenRequired").value(false))
                .andExpect(jsonPath("$.demoMode").value(false));
    }

    @Test
    void firstAdminCanBeCreatedOnlyOnce() throws Exception {
        bootstrapAdmin();

        getAs(null, "/api/setup/status").andExpect(jsonPath("$.setupRequired").value(false));

        postAs(null, Json.of(
                "employeeCode", "EMP-X", "firstName", "Mallory", "lastName", "Intruder",
                "email", "mallory@example.com", "username", "mallory", "password", PASSWORD),
                "/api/setup/first-admin")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("already been completed")));
    }

    @Test
    void setupValidatesInput() throws Exception {
        postAs(null, Json.of("username", "a", "password", "short"), "/api/setup/first-admin")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.username").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists());

        postAs(null, Json.of("username", "admin", "password", PASSWORD), "/api/setup/first-admin")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.employeeCode").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists());
    }

    @Test
    void oldEmployeeListingEndpointNoLongerExists() throws Exception {
        getAs(null, "/api/setup/employees").andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ login

    @Test
    void loginReturnsTokenAndProfile() throws Exception {
        bootstrapAdmin();
        postAs(null, Json.of("username", "ADMIN", "password", PASSWORD), "/api/auth/login")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value(notNullValue()))
                .andExpect(jsonPath("$.expiresAt").value(notNullValue()))
                .andExpect(jsonPath("$.user.username").value("admin"))
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.user.fullName").value("Asha Admin"));
    }

    @Test
    void wrongPasswordGivesJsonUnauthorized() throws Exception {
        bootstrapAdmin();
        postAs(null, Json.of("username", "admin", "password", "nope12345"), "/api/auth/login")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid username or password."));
    }

    @Test
    void repeatedFailuresLockTheAccountTemporarily() throws Exception {
        bootstrapAdmin();
        for (int i = 0; i < 3; i++) {
            postAs(null, Json.of("username", "admin", "password", "wrong-pass1"), "/api/auth/login")
                    .andExpect(status().isUnauthorized());
        }
        // Even the right password is refused while locked.
        postAs(null, Json.of("username", "admin", "password", PASSWORD), "/api/auth/login")
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER));

        clock.advance(Duration.ofMinutes(16));
        postAs(null, Json.of("username", "admin", "password", PASSWORD), "/api/auth/login")
                .andExpect(status().isOk());
    }

    @Test
    void loginRequiresBody() throws Exception {
        postAs(null, "{}", "/api/auth/login")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.username").exists());
        postAs(null, "not-json", "/api/auth/login")
                .andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------------ tokens

    @Test
    void protectedEndpointsRequireToken() throws Exception {
        getAs(null, "/api/employees")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Please sign in to continue."));
        getAs("garbage.token.value", "/api/employees")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid authentication token."));
    }

    @Test
    void expiredTokenIsRejectedWithClearMessage() throws Exception {
        String token = bootstrapAdmin();
        clock.advance(Duration.ofHours(2));
        getAs(token, "/api/auth/me")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(containsString("expired")));
    }

    @Test
    void meReturnsCurrentUser() throws Exception {
        Org org = org();
        getAs(org.employeeToken(), "/api/auth/me")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("ravi"))
                .andExpect(jsonPath("$.role").value("EMPLOYEE"))
                .andExpect(jsonPath("$.departmentName").value("Engineering"));
    }

    @Test
    void changingPasswordSignsOutOtherSessions() throws Exception {
        Org org = org();
        String oldToken = org.employeeToken();

        postAs(oldToken, Json.of("currentPassword", "wrong-pass1", "newPassword", "NewPassw0rd"),
                "/api/auth/change-password")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.currentPassword").exists());

        postAs(oldToken, Json.of("currentPassword", PASSWORD, "newPassword", "weak"), "/api/auth/change-password")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.newPassword").exists());

        String newToken = read(postAs(oldToken, Json.of("currentPassword", PASSWORD, "newPassword", "NewPassw0rd"),
                "/api/auth/change-password").andExpect(status().isOk()), "$.token");

        getAs(oldToken, "/api/auth/me").andExpect(status().isUnauthorized());
        getAs(newToken, "/api/auth/me").andExpect(status().isOk());
        login("ravi", "NewPassw0rd");
    }

    @Test
    void disabledOrInactiveAccountsCannotSignInAndLoseAccessImmediately() throws Exception {
        Org org = org();

        // Deactivate the employee: the existing token stops working at once.
        putAs(org.adminToken(), employeeJson("EMP-001", "Ravi", "Kumar", "ravi.kumar@example.com",
                org.departmentId(), org.designationId(), "INACTIVE"), "/api/employees/{id}", org.employeeId())
                .andExpect(status().isOk());

        getAs(org.employeeToken(), "/api/auth/me").andExpect(status().isUnauthorized());
        postAs(null, Json.of("username", "ravi", "password", PASSWORD), "/api/auth/login")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(containsString("disabled")));
    }

    // ------------------------------------------------------------------ platform

    @Test
    void healthEndpointIsPublic() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void unknownEndpointReturnsJson404ForSignedInUsers() throws Exception {
        String token = bootstrapAdmin();
        getAs(token, "/api/does-not-exist")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void corsPreflightAllowsConfiguredOrigin() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/auth/login")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/auth/login")
                        .header(HttpHeaders.ORIGIN, "https://evil.example.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden());
    }
}
