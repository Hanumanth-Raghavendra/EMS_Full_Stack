package com.example.hr_service.support;

import com.example.hr_service.security.LoginAttemptService;
import com.jayway.jsonpath.JsonPath;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Base class for API tests: full Spring context, real PostgreSQL (embedded
 * binaries, no Docker needed), Flyway migrations, and a controllable clock
 * fixed at Wednesday 10 June 2026, 10:00 IST.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(IntegrationTest.TestClockConfig.class)
public abstract class IntegrationTest {

    public static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
    public static final LocalDate TODAY = LocalDate.of(2026, 6, 10);
    public static final LocalDateTime NOW = TODAY.atTime(10, 0);

    public static final String ADMIN_USER = "admin";
    public static final String PASSWORD = "Passw0rd!";

    private static final EmbeddedPostgres POSTGRES = startPostgres();

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected MutableClock clock;

    @Autowired
    private LoginAttemptService loginAttempts;

    private static EmbeddedPostgres startPostgres() {
        try {
            return EmbeddedPostgres.builder().start();
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not start embedded PostgreSQL", ex);
        }
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
    }

    @TestConfiguration
    static class TestClockConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(NOW, ZONE);
        }
    }

    @BeforeEach
    void resetState() {
        jdbc.execute("""
                TRUNCATE TABLE audit_logs, employee_projects, attendance, leave_requests,
                               users, employees, designations, departments, projects
                RESTART IDENTITY CASCADE
                """);
        clock.set(NOW);
        loginAttempts.reset();
    }

    // ================================================================== HTTP helpers

    protected ResultActions perform(MockHttpServletRequestBuilder request, String token) throws Exception {
        if (token != null) {
            request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        return mvc.perform(request.contentType(MediaType.APPLICATION_JSON));
    }

    protected ResultActions getAs(String token, String url, Object... vars) throws Exception {
        return perform(get(url, vars), token);
    }

    protected ResultActions postAs(String token, String body, String url, Object... vars) throws Exception {
        MockHttpServletRequestBuilder request = post(url, vars);
        if (body != null) {
            request.content(body);
        }
        return perform(request, token);
    }

    protected ResultActions putAs(String token, String body, String url, Object... vars) throws Exception {
        return perform(put(url, vars).content(body), token);
    }

    protected ResultActions deleteAs(String token, String url, Object... vars) throws Exception {
        return perform(delete(url, vars), token);
    }

    protected static <T> T read(ResultActions result, String path) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), path);
    }

    protected static Long readId(ResultActions result, String path) throws Exception {
        Object value = read(result, path);
        return ((Number) value).longValue();
    }

    // ================================================================== fixtures

    /** Runs first-time setup and returns an admin token. */
    protected String bootstrapAdmin() throws Exception {
        postAs(null, Json.of(
                "employeeCode", "EMP-ADMIN",
                "firstName", "Asha",
                "lastName", "Admin",
                "email", "asha.admin@example.com",
                "phone", "9876543210",
                "username", ADMIN_USER,
                "password", PASSWORD), "/api/setup/first-admin")
                .andExpect(status().isCreated());
        return login(ADMIN_USER, PASSWORD);
    }

    protected String login(String username, String password) throws Exception {
        ResultActions result = postAs(null, Json.of("username", username, "password", password), "/api/auth/login")
                .andExpect(status().isOk());
        return read(result, "$.token");
    }

    protected Long createDepartment(String token, String name) throws Exception {
        return readId(postAs(token, Json.of("departmentName", name, "description", name + " team"), "/api/departments")
                .andExpect(status().isCreated()), "$.departmentId");
    }

    protected Long createDesignation(String token, Long departmentId, String name) throws Exception {
        return readId(postAs(token, Json.of("designationName", name, "departmentId", departmentId), "/api/designations")
                .andExpect(status().isCreated()), "$.designationId");
    }

    protected String employeeJson(String code, String first, String last, String email,
                                  Long departmentId, Long designationId, String status) {
        return Json.of(
                "employeeCode", code,
                "firstName", first,
                "lastName", last,
                "email", email,
                "phone", "9123456780",
                "dateOfJoining", TODAY.minusYears(1).toString(),
                "departmentId", departmentId,
                "designationId", designationId,
                "status", status);
    }

    protected Long createEmployee(String token, String code, String first, String last,
                                  Long departmentId, Long designationId) throws Exception {
        String email = (first + "." + last + "@example.com").toLowerCase();
        return readId(postAs(token, employeeJson(code, first, last, email, departmentId, designationId, "ACTIVE"),
                "/api/employees").andExpect(status().isCreated()), "$.employeeId");
    }

    protected Long createUser(String token, Long employeeId, String username, String role) throws Exception {
        return readId(postAs(token, Json.of(
                "employeeId", employeeId,
                "username", username,
                "password", PASSWORD,
                "role", role), "/api/users").andExpect(status().isCreated()), "$.userId");
    }

    /**
     * A small organisation: admin (via setup), one HR person and one employee,
     * all in Engineering.
     */
    protected Org org() throws Exception {
        String admin = bootstrapAdmin();
        Long department = createDepartment(admin, "Engineering");
        Long designation = createDesignation(admin, department, "Software Engineer");
        Long hrEmployee = createEmployee(admin, "EMP-HR", "Harini", "Rao", department, designation);
        Long employee = createEmployee(admin, "EMP-001", "Ravi", "Kumar", department, designation);
        Long hrUser = createUser(admin, hrEmployee, "hr", "HR");
        Long employeeUser = createUser(admin, employee, "ravi", "EMPLOYEE");
        Long adminEmployee = jdbc.queryForObject(
                "SELECT employee_id FROM employees WHERE employee_code = 'EMP-ADMIN'", Long.class);
        Long adminUser = jdbc.queryForObject("SELECT user_id FROM users WHERE username = 'admin'", Long.class);
        return new Org(admin, login("hr", PASSWORD), login("ravi", PASSWORD),
                department, designation, adminEmployee, hrEmployee, employee, adminUser, hrUser, employeeUser);
    }

    public record Org(String adminToken, String hrToken, String employeeToken,
                      Long departmentId, Long designationId,
                      Long adminEmployeeId, Long hrEmployeeId, Long employeeId,
                      Long adminUserId, Long hrUserId, Long employeeUserId) {
    }
}
