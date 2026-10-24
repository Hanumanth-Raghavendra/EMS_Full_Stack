package com.example.hr_service;

import com.example.hr_service.config.AppProperties;
import com.example.hr_service.config.DatabaseUrlResolver;
import com.example.hr_service.entity.LeaveType;
import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.exception.ApiError;
import com.example.hr_service.exception.BadRequestException;
import com.example.hr_service.exception.TooManyRequestsException;
import com.example.hr_service.security.LoginAttemptService;
import com.example.hr_service.security.PasswordPolicy;
import com.example.hr_service.service.AuditLogRecorder;
import com.example.hr_service.service.LeaveCalendar;
import com.example.hr_service.service.PageRequests;
import com.example.hr_service.support.MutableClock;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Fast tests for pure logic (no Spring context). */
class UnitTests {

    @Nested
    class DatabaseUrls {

        @Test
        void convertsRenderStyleUrl() {
            Map<String, String> props = DatabaseUrlResolver.resolve(
                    "postgres://ems_user:s%40cret@dpg-abc123-a.oregon-postgres.render.com/ems_db");
            assertThat(props)
                    .containsEntry("spring.datasource.url",
                            "jdbc:postgresql://dpg-abc123-a.oregon-postgres.render.com/ems_db")
                    .containsEntry("spring.datasource.username", "ems_user")
                    .containsEntry("spring.datasource.password", "s@cret");
        }

        @Test
        void keepsPortAndSslModeButDropsChannelBinding() {
            Map<String, String> props = DatabaseUrlResolver.resolve(
                    "postgresql://neon:pw@ep-cool.aws.neon.tech:5432/neondb?sslmode=require&channel_binding=require");
            assertThat(props.get("spring.datasource.url"))
                    .isEqualTo("jdbc:postgresql://ep-cool.aws.neon.tech:5432/neondb?sslmode=require");
        }

        @Test
        void passesJdbcUrlsThrough() {
            assertThat(DatabaseUrlResolver.resolve("jdbc:postgresql://localhost/hr"))
                    .containsOnly(Map.entry("spring.datasource.url", "jdbc:postgresql://localhost/hr"));
        }

        @Test
        void rejectsOtherDatabases() {
            assertThatThrownBy(() -> DatabaseUrlResolver.resolve("mysql://x/y"))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    class Calendar {

        private final LeaveCalendar calendar = new LeaveCalendar(true);

        @Test
        void countsWorkingDaysOnly() {
            // Mon 15 June - Sun 21 June 2026
            assertThat(calendar.countDays(LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 21))).isEqualTo(5);
            assertThat(calendar.countDays(LocalDate.of(2026, 6, 13), LocalDate.of(2026, 6, 14))).isZero();
            assertThat(calendar.countDays(LocalDate.of(2026, 6, 19), LocalDate.of(2026, 6, 15))).isZero();
        }

        @Test
        void countsWithinWindow() {
            assertThat(calendar.countDaysWithin(LocalDate.of(2026, 6, 15), LocalDate.of(2026, 6, 19),
                    LocalDate.of(2026, 6, 17), LocalDate.of(2026, 12, 31))).isEqualTo(3);
        }

        @Test
        void canIncludeWeekends() {
            assertThat(new LeaveCalendar(false).countDays(LocalDate.of(2026, 6, 13), LocalDate.of(2026, 6, 14)))
                    .isEqualTo(2);
        }
    }

    @Nested
    class Paging {

        private final Map<String, String> sorts = Map.of("name", "firstName");

        @Test
        void clampsSizeAndPage() {
            Pageable pageable = PageRequests.of(-3, 5000, null, sorts, Sort.by("id"));
            assertThat(pageable.getPageNumber()).isZero();
            assertThat(pageable.getPageSize()).isEqualTo(PageRequests.MAX_SIZE);
        }

        @Test
        void mapsAllowedSortFields() {
            Pageable pageable = PageRequests.of(0, 10, "name,desc", sorts, Sort.by("id"));
            assertThat(pageable.getSort().getOrderFor("firstName").getDirection()).isEqualTo(Sort.Direction.DESC);
        }

        @Test
        void rejectsUnknownSortFields() {
            assertThatThrownBy(() -> PageRequests.of(0, 10, "password", sorts, Sort.by("id")))
                    .isInstanceOf(BadRequestException.class);
            assertThatThrownBy(() -> PageRequests.of(0, 10, "name,sideways", sorts, Sort.by("id")))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        void escapesLikeWildcards() {
            assertThat(PageRequests.likePattern("  50%_off ")).isEqualTo("%50\\%\\_off%");
            assertThat(PageRequests.likePattern(" ")).isEmpty();
        }
    }

    @Nested
    class LoginAttempts {

        @Test
        void locksAfterMaxFailuresAndUnlocksAfterWindow() {
            MutableClock clock = new MutableClock(LocalDateTime.of(2026, 6, 10, 10, 0), ZoneId.of("UTC"));
            AppProperties properties = new AppProperties("UTC", null, null, null,
                    new AppProperties.Security(2, 10), null, null, null);
            LoginAttemptService service = new LoginAttemptService(properties, clock);

            service.recordFailure("Admin", "1.2.3.4");
            service.checkAllowed("admin", "1.2.3.4");
            service.recordFailure("admin", "1.2.3.4");

            assertThatThrownBy(() -> service.checkAllowed("ADMIN", "1.2.3.4"))
                    .isInstanceOf(TooManyRequestsException.class);
            // Another address is unaffected
            service.checkAllowed("admin", "5.6.7.8");

            clock.advance(Duration.ofMinutes(11));
            service.checkAllowed("admin", "1.2.3.4");
            assertThat(service.remainingAttempts("admin", "1.2.3.4")).isEqualTo(2);
        }
    }

    @Nested
    class Misc {

        @Test
        void passwordPolicy() {
            assertThat(PasswordPolicy.isValid("Passw0rd")).isTrue();
            assertThat(PasswordPolicy.isValid("password")).isFalse();
            assertThat(PasswordPolicy.isValid("12345678")).isFalse();
            assertThat(PasswordPolicy.isValid("Ab1")).isFalse();
            assertThat(PasswordPolicy.isValid("A1" + "x".repeat(70))).isFalse();
        }

        @Test
        void unknownRoleNamesFallBackToLeastPrivilege() {
            assertThat(SystemRole.from("admin")).isEqualTo(SystemRole.ADMIN);
            assertThat(SystemRole.from(" Hr ")).isEqualTo(SystemRole.HR);
            assertThat(SystemRole.from("SUPERUSER")).isEqualTo(SystemRole.EMPLOYEE);
            assertThat(SystemRole.from(null)).isEqualTo(SystemRole.EMPLOYEE);
        }

        @Test
        void apiErrorJsonIsEscaped() {
            String json = ApiError.of(400, "Bad Request", "Line1\n\"quoted\"", "/x",
                    Map.of("field", "back\\slash")).toJson();
            assertThat(json).contains("\"message\":\"Line1\\n\\\"quoted\\\"\"")
                    .contains("\"field\":\"back\\\\slash\"");
        }

        @Test
        void auditDiffReportsOnlyChangedFields() {
            Map<String, Object> before = new LinkedHashMap<>();
            before.put("name", "A");
            before.put("email", "a@x.com");
            Map<String, Object> after = new LinkedHashMap<>();
            after.put("name", "A");
            after.put("email", "b@x.com");
            assertThat(AuditLogRecorder.diff(before, after)).containsExactly("email=a@x.com", "email=b@x.com");
            assertThat(AuditLogRecorder.diff(before, before)).isNull();
        }

        @Test
        void leaveQuotasHaveSensibleDefaults() {
            AppProperties.Leave leave = new AppProperties.Leave(true, 30, null);
            assertThat(leave.quotaFor(LeaveType.CASUAL)).isEqualTo(12);
            assertThat(leave.quotaFor(LeaveType.UNPAID)).isNull();
        }
    }
}
