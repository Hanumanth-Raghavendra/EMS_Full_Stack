# What changed (v1.0.0, October 2026)

This release turns the project from a working prototype into something you can put online. It is organised by the problems found in the code review, then new features, then what you need to know when upgrading.

## Problems found in the review, and how each was fixed

### Security

| Problem | Fix |
| --- | --- |
| HR could create an ADMIN user, promote anyone (including themselves) or reset an administrator's password: a full privilege escalation. | Role hierarchy enforced in `UserService`/`EmployeeService`: HR manages only employee-level accounts and records and can only grant the EMPLOYEE role. Nobody can change their own role, disable or delete themselves. The last usable administrator can never be demoted, disabled, deactivated or deleted. |
| Roles could be created, renamed or deleted through the API, which silently broke authorisation (a custom role was treated like a manager). | Roles are fixed system roles (`ADMIN`, `HR`, `EMPLOYEE`) seeded by a migration; the API is read-only. Unknown role names fall back to least privilege. |
| `GET /api/setup/employees` listed every employee's name and code to anyone, forever. | Endpoint removed. Setup now either creates the administrator's own employee record or links to one by employee code. It is single-use, synchronized, and can require a `SETUP_TOKEN`. |
| Administrators could create, edit and delete audit log entries. | Audit log is read-only (no write endpoints). Entries are written only by the services, in the same transaction as the change, and keep the actor's username even if the user is later deleted. Sign-ins and failed sign-ins are recorded too. |
| Leave approval trusted an `approvedBy` user id from the request body, so HR could forge an administrator's approval. | Separate `approve` / `reject` actions; the reviewer is always the signed-in user. Nobody reviews their own request, HR cannot review HR/admin requests, and rejections need a reason. |
| A disabled user's token kept working until it expired; tokens survived password changes. | Every request re-checks the account. Tokens carry a version that is bumped on password change/reset, role change and disable, so old sessions end immediately. Inactive employees cannot sign in. |
| No protection against password guessing. | Lockout per username and client address after `MAX_FAILED_LOGINS` failures for `LOCKOUT_MINUTES` (HTTP 429 with `Retry-After`). |
| Request bodies were mapped straight onto entities (mass-assignment risk; employees could send fields they shouldn't). | Request DTOs are Java records validated with Bean Validation; services copy each allowed field explicitly. Employees have a dedicated "update my contact details" endpoint. |
| Hardcoded CORS origin and API URL. | `ALLOWED_ORIGINS` (supports wildcards such as `https://*.vercel.app`) and `VITE_API_URL`. |
| Security errors came back as empty bodies or HTML. | JSON 401/403 from the filter chain with a specific reason (expired session, account disabled, invalid token). |

### Reliability and data integrity

| Problem | Fix |
| --- | --- |
| `application.properties` was git-ignored with no example: nobody could run the project from the repository. | `application.yml` with environment-variable defaults, `.env.example`, Docker Compose, and fallbacks to the old `jwt.secret`/`jwt.expiration` keys so your existing local file keeps working. |
| Flyway was claimed but not configured: the dependency was missing and migration files were misnamed (`V1_` instead of `V1__`), so they never ran. | `spring-boot-starter-flyway` + PostgreSQL module; migrations renamed and a baseline schema added. All migrations are idempotent and `baseline-on-migrate` adopts databases created by hand. Tested on a fresh database, a re-run, and a simulated legacy database. |
| No uniqueness rules: duplicate employee codes/emails, usernames, department names, several attendance rows for the same day. | Case-insensitive checks in the services (HTTP 409 with field messages) **and** unique indexes. Indexes are only created when existing data is clean; otherwise a warning is logged and the service checks still apply. |
| No value checks in the database. | `NOT VALID` check constraints for statuses, leave types and date ordering: new rows are checked, old rows can't break the migration. |
| Only two exception types were handled; everything else became a 500 with no message. | One `GlobalExceptionHandler` covering validation, malformed JSON, wrong parameter types, unknown sort fields, 401/403/404/405/409/415/429 and a safe 500. Every error uses the same JSON shape with `fieldErrors`. |
| Deleting a department, designation or user still in use failed with a database error. | Clear 409 messages ("still has 3 employees...") and approvals are detached before a user is deleted. |
| Every list loaded the whole table; attendance was filtered in memory. | Server-side pagination, search and filters with a sort-field allow-list and a maximum page size. |
| Dates relied on the server's time zone (cloud hosts run in UTC). | One business clock (`APP_TIMEZONE`, default `Asia/Kolkata`) used everywhere; tests use a controllable clock. |
| `RepositoryTest.java` (empty) lived in `src/main`; `mvnw` was not executable in git. | Removed; executable bit fixed. |

### Frontend

| Problem | Fix |
| --- | --- |
| Pages trusted any signed-in user (an employee could open `/users`). | Role-aware route guards and navigation. |
| 401 handling copy-pasted across pages; tokens never expired client-side. | One Axios interceptor, a session manager that signs out on expiry or when the server rejects the token, and a message on the sign-in page explaining why. |
| One 625 kB JavaScript bundle. | Route-level code splitting; the main bundle is 346 kB. Fonts are self-hosted (no Google Fonts request). |
| 6 lint errors, a leftover `console.log`, unused assets and the Vite template README. | Zero lint errors; dead files removed. |
| Deep links 404 on static hosts. | `vercel.json`, Netlify `_redirects` and an nginx config with SPA fallback. |

## New features

- **Dashboard**: a time card with check-in/check-out and a month attendance register for everyone; for HR/admins, today's attendance breakdown, a 7-day trend, leave waiting for approval (approve/reject in place), who is on leave this week, headcount by department and recent joiners.
- **Self-service attendance**: check in/out; check-outs shorter than 4 hours become *Half day*; approved leave blocks check-in.
- **Leave**: four leave types with annual quotas (casual 12, sick 10, earned 15, unpaid unlimited; configurable), working-day counting (weekends excluded), balance shown while applying, overlap and quota checks, edit/cancel, HR recording leave on someone's behalf, automatic *On leave* attendance on approval (removed again on cancellation).
- **My profile**: details, contact update, password change (signs out other devices).
- **User accounts**: create accounts for employees without one (username suggested), enable/disable, reset password, last sign-in time.
- **Audit log**: filters by action, record type, user and date; before/after values.
- **Demo mode** (`DEMO_DATA=true`): realistic sample organisation for an empty database; demo accounts listed on the sign-in page.
- **API documentation**: Swagger UI at `/swagger-ui.html`; health endpoint for hosting platforms.
- **Delivery**: Dockerfiles, Docker Compose, Render blueprint, Vercel config, GitHub Actions (backend tests, frontend tests, Playwright end-to-end journey, Docker builds).

## Upgrading an existing installation

1. Pull the new code. Keep your `hr-service/src/main/resources/application.properties` if you have one: `spring.datasource.*`, `jwt.secret` and `jwt.expiration` are still honoured.
2. Start the API. Flyway logs `Successfully baselined schema with version: 0` and then applies V1–V4. Your data stays; new columns get defaults (existing leave becomes type *Casual*).
3. Watch the log for `Skipped unique index` warnings: they point to duplicates in your data that you may want to clean up.
4. Make sure an `ADMIN` user exists. Users keep their passwords. Any role other than ADMIN/HR/EMPLOYEE is treated as EMPLOYEE.
5. If `spring.jpa.hibernate.ddl-auto=update` is in your local properties, you can remove it: Flyway now manages the schema.

## API changes for other clients

If you built anything else against the old API, these changed:

| Old | New |
| --- | --- |
| List endpoints returned arrays | `/api/employees`, `/api/attendance`, `/api/leave-requests`, `/api/audit-logs` return pages: `{ content, page, size, totalElements, totalPages, first, last }` |
| `GET /api/setup/status` returned `true/false` | Returns `{ setupRequired, setupTokenRequired, demoMode, demoAccounts }` |
| `GET /api/setup/employees` | Removed |
| `POST /api/setup/first-admin` `{ employeeId, username, password }` | `{ employeeCode, firstName, lastName, email, phone?, username, password, setupToken? }` or `{ existingEmployeeCode, username, password, setupToken? }` |
| Login response `{ token, username, role, employeeId }` | `{ token, expiresAt, user: { userId, username, role, employeeId, fullName, ... } }` |
| `PUT /api/employees/{id}` by employees | `PUT /api/employees/me/contact` with `{ email, phone }` |
| User requests used `roleId` and `passwordHash` | `role` (`"ADMIN"`, `"HR"`, `"EMPLOYEE"`) and `password`; password resets via `POST /api/users/{id}/reset-password` |
| Leave requests with `status`/`approvedBy` in the body | `POST /api/leave-requests` `{ leaveType, startDate, endDate, reason, employeeId? }`; then `/approve`, `/reject`, `/cancel` |
| Role and audit-log write endpoints | Removed (read-only) |
| Departments returned the raw entity | Adds `employeeCount` and `designationCount` |
| Create endpoints returned `200` | Return `201 Created` |
