# Employee Management System (EMS)

[![CI](https://github.com/Hanumanth-Raghavendra/EMS_Full_Stack/actions/workflows/ci.yml/badge.svg)](https://github.com/Hanumanth-Raghavendra/EMS_Full_Stack/actions/workflows/ci.yml)

A full-stack HR application for small and mid-sized teams: people records, daily attendance with self check-in, leave with balances and approvals, project teams, user accounts with a strict role hierarchy, and a tamper-proof audit trail.

**Stack:** React 19, Vite and MUI on the front; Spring Boot 4 (Java 17), PostgreSQL, Flyway and JWT on the back; Docker, GitHub Actions and Playwright around it.

![Administrator dashboard](docs/screenshots/dashboard-admin.png)

<p align="center">
  <img src="docs/screenshots/login.png" width="49%" alt="Sign-in page with demo accounts" />
  <img src="docs/screenshots/leave-approvals.png" width="49%" alt="Leave requests waiting for approval" />
</p>

> Screenshots are rendered from this codebase with sample data. More in [`docs/screenshots`](docs/screenshots).

---

## Contents

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Security model](#security-model)
- [API](#api)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Upgrading from the earlier version](#upgrading-from-the-earlier-version)

## What it does

**Everyone**
- Check in and out from the dashboard's time card; see the month at a glance
- Apply for casual, sick, earned or unpaid leave; see remaining balance before submitting; edit or cancel pending requests
- See your own attendance, projects and profile; update your email and phone; change your password

**HR**
- Manage employees (search, filter, paginate), departments and designations
- Record and correct attendance; approve or reject leave (with a required reason for rejections)
- Manage projects and who works on them
- Create and manage **employee** accounts

**Administrators**
- Everything HR can do, plus manage HR and administrator accounts
- Approve leave for HR staff
- Read the audit trail: every change, sign-in (including failed ones) and approval, with before/after values

**Built-in rules** (enforced by the API, not just hidden in the UI): leave cannot overlap, exceed the annual quota, span two years or contain only weekends; approving leave marks those days as *On leave* in attendance; one attendance record per person per day; a designation must belong to the chosen department; nobody can deactivate or delete themselves; the last administrator can never be removed.

## Quick start

### Option A: Docker (recommended)

```bash
docker compose up --build
```

| What | Where |
| --- | --- |
| Web app | http://localhost:3000 |
| API | http://localhost:8080 |
| API docs (Swagger UI) | http://localhost:8080/swagger-ui.html |

The compose file seeds **demo data** on first start. Sign in as `admin`, `hr` or `employee` with password `Demo@12345`. To start with an empty system instead: `DEMO_DATA=false docker compose up --build`, then follow the *Create the administrator* screen.

### Option B: Run locally for development

Prerequisites: Java 17+, Node 22+, PostgreSQL 14+.

```bash
# 1. Database
createdb hr_db            # or use pgAdmin

# 2. API (http://localhost:8080) - Flyway creates/updates the schema on start
cd hr-service
./mvnw spring-boot:run    # Windows: mvnw.cmd spring-boot:run
#   optional: DEMO_DATA=true ./mvnw spring-boot:run

# 3. Web app (http://localhost:5173)
cd ../hr-frontend
cp .env.example .env      # VITE_API_URL=http://localhost:8080
npm install
npm run dev
```

The API defaults to `jdbc:postgresql://localhost:5432/hr_db` with user/password `postgres`. Override with environment variables (below), or put local values in `hr-service/src/main/resources/application.properties`, which is git-ignored.

## Configuration

All settings are environment variables; see [`.env.example`](.env.example) for the full list.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | local `hr_db`, `postgres` | Database connection |
| `DATABASE_URL` | – | Alternative single URL (`postgres://user:pass@host/db`), as given by Render, Neon, Railway |
| `JWT_SECRET` | random per start | **Set in any shared environment** (32+ chars), otherwise users are signed out on every restart |
| `JWT_EXPIRATION_MS` | `28800000` (8 h) | Session length |
| `ALLOWED_ORIGINS` | localhost ports | Web origins allowed by CORS, comma separated, wildcards allowed (`https://*.vercel.app`) |
| `SETUP_TOKEN` | – | If set, creating the first administrator requires it |
| `DEMO_DATA` | `false` | Seed sample data into an **empty** database |
| `APP_TIMEZONE` | `Asia/Kolkata` | Business time zone for "today", check-ins and leave |
| `MAX_FAILED_LOGINS` / `LOCKOUT_MINUTES` | `5` / `15` | Brute-force protection |
| `VITE_API_URL` (frontend, build time) | `http://localhost:8080` | Where the web app sends API calls |

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        UI["React SPA<br/>Redux Toolkit, React Router, MUI"]
    end
    subgraph API["Spring Boot API"]
        F["JWT filter<br/>(token version check)"] --> C["Controllers<br/>@PreAuthorize"]
        C --> S["Services<br/>business rules, ownership, audit"]
        S --> R["Spring Data JPA"]
    end
    UI -- "HTTPS + Bearer token" --> F
    R --> DB[("PostgreSQL<br/>Flyway migrations")]
```

- **Controllers** declare *who* may call an endpoint (`@PreAuthorize`).
- **Services** enforce *what* they may do to *which* record (employees only see their own data, HR cannot touch administrators) and write the audit trail inside the same transaction.
- **Request DTOs are never mapped onto entities automatically**: every field is assigned explicitly, which rules out mass-assignment bugs.
- **Errors** always come back in one JSON shape: `{ status, error, message, path, fieldErrors }`.
- **Schema** is owned by Flyway; Hibernate only validates (in tests) and never alters tables.

## Security model

| Capability | Employee | HR | Admin |
| --- | :---: | :---: | :---: |
| Own profile, attendance, leave, projects | ✓ | ✓ | ✓ |
| Employees, departments, designations, attendance corrections | | ✓ | ✓ |
| Approve/reject employee leave | | ✓ | ✓ |
| Approve/reject HR leave | | | ✓ |
| Create/manage employee accounts | | ✓ | ✓ |
| Create/manage HR and admin accounts | | | ✓ |
| Audit log | | | ✓ |

Other protections: BCrypt password hashing; password policy (8–64 chars, letters and digits); per-user/IP login lockout; sessions invalidated instantly on password change, password reset, role change, deactivation or account disable; CORS allow-list; JSON 401/403 responses; one-time, optionally token-protected first-admin setup; no endpoint exposes employee data anonymously.

## API

Interactive docs: **`/swagger-ui.html`** (click *Authorize* and paste a token from `POST /api/auth/login`).

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password` |
| Setup | `GET /api/setup/status`, `POST /api/setup/first-admin` |
| Dashboard | `GET /api/dashboard` |
| Employees | `GET/POST /api/employees`, `GET/PUT/DELETE /api/employees/{id}`, `GET /api/employees/me`, `PUT /api/employees/me/contact`, `GET /api/employees/options` |
| Departments / designations | `/api/departments`, `/api/designations` (CRUD) |
| Attendance | `GET/POST /api/attendance`, `PUT/DELETE /api/attendance/{id}`, `GET /api/attendance/today`, `POST /api/attendance/check-in`, `POST /api/attendance/check-out` |
| Leave | `GET/POST /api/leave-requests`, `PUT/DELETE /api/leave-requests/{id}`, `POST .../{id}/approve`, `.../reject`, `.../cancel`, `GET /api/leave-requests/balance` |
| Projects / teams | `/api/projects` (CRUD), `/api/employee-projects` (assign, change role, remove) |
| Accounts | `/api/users` (CRUD), `POST /api/users/{id}/reset-password`, `GET /api/roles` |
| Audit | `GET /api/audit-logs`, `GET /api/audit-logs/filters` (read-only) |
| Health | `GET /actuator/health` |

List endpoints accept `page`, `size` (max 100) and `sort=field,asc|desc`, and return `{ content, page, size, totalElements, totalPages }`.

## Testing

| Suite | Command | What it covers |
| --- | --- | --- |
| API integration + unit | `cd hr-service && ./mvnw verify` | Every endpoint through HTTP against a **real PostgreSQL** (embedded, no Docker needed): security rules, validation, business rules, migrations |
| Frontend | `cd hr-frontend && npm run test:run && npm run lint` | Pages, forms, role-based navigation, auth state, utilities |
| End-to-end | see [`e2e/README.md`](e2e/README.md) | A browser drives the real app: first-time setup → organisation → employee → account → leave request → approval → audit trail |

GitHub Actions runs all three on every push and pull request, then builds both Docker images.

## Deployment

Free-tier friendly setup: **Vercel** (web app) + **Render** (API) + **Neon** or Render PostgreSQL (database). Step-by-step guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Project structure

```text
EMS_Full_Stack/
├── hr-service/                 Spring Boot API
│   ├── src/main/java/com/example/hr_service/
│   │   ├── config/             Security, CORS, typed app properties, clock, OpenAPI
│   │   ├── controller/         REST endpoints (+ role rules)
│   │   ├── dto/                Request/response records
│   │   ├── entity/             JPA entities and enums
│   │   ├── exception/          Error model and global handler
│   │   ├── repository/         Spring Data repositories and queries
│   │   ├── security/           JWT, login lockout, current user, password policy
│   │   └── service/            Business rules, audit trail, demo seeder
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/       Flyway migrations (V1..V4)
│   └── Dockerfile
├── hr-frontend/                React app
│   ├── src/api/                Axios client + endpoint functions
│   ├── src/components/         Layout, routing guards, shared UI
│   ├── src/pages/              One file per screen
│   ├── src/store/              Redux auth state + session persistence
│   ├── src/hooks/ src/utils/   Data fetching, validation, formatting
│   ├── Dockerfile, nginx.conf, vercel.json
├── e2e/                        Playwright end-to-end tests
├── docs/                       Deployment guide, change log, screenshots
├── docker-compose.yml
├── render.yaml                 Render blueprint
└── .github/workflows/ci.yml
```

## Upgrading from the earlier version

Your existing database keeps working: on first start Flyway adopts it, adds the new columns and constraints, and seeds the three system roles. Existing users can sign in with their current passwords. See [`docs/CHANGES.md`](docs/CHANGES.md) for everything that changed, including API changes if you built anything else against the old endpoints.
