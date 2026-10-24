-- =====================================================================
-- V1 - Baseline schema
--
-- Creates every table the application needs on a brand-new database.
-- Uses IF NOT EXISTS throughout so it is a no-op on databases that were
-- created by hand before Flyway was introduced.
-- =====================================================================

CREATE TABLE IF NOT EXISTS departments (
    department_id   BIGSERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    description     VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS designations (
    designation_id   BIGSERIAL PRIMARY KEY,
    designation_name VARCHAR(100) NOT NULL,
    department_id    BIGINT       NOT NULL REFERENCES departments (department_id)
);

CREATE TABLE IF NOT EXISTS employees (
    employee_id     BIGSERIAL PRIMARY KEY,
    employee_code   VARCHAR(30)  NOT NULL,
    first_name      VARCHAR(50)  NOT NULL,
    last_name       VARCHAR(50)  NOT NULL,
    email           VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    date_of_joining DATE,
    department_id   BIGINT REFERENCES departments (department_id),
    designation_id  BIGINT REFERENCES designations (designation_id),
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS roles (
    role_id   BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id       BIGSERIAL PRIMARY KEY,
    employee_id   BIGINT       NOT NULL REFERENCES employees (employee_id),
    username      VARCHAR(50)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id       BIGINT       NOT NULL REFERENCES roles (role_id),
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS attendance (
    attendance_id   BIGSERIAL PRIMARY KEY,
    employee_id     BIGINT      NOT NULL REFERENCES employees (employee_id),
    attendance_date DATE        NOT NULL,
    status          VARCHAR(20) NOT NULL,
    check_in        TIMESTAMP,
    check_out       TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_requests (
    leave_id    BIGSERIAL PRIMARY KEY,
    employee_id BIGINT      NOT NULL REFERENCES employees (employee_id),
    start_date  DATE        NOT NULL,
    end_date    DATE        NOT NULL,
    reason      VARCHAR(500),
    status      VARCHAR(20) NOT NULL,
    approved_by BIGINT REFERENCES users (user_id)
);

CREATE TABLE IF NOT EXISTS projects (
    project_id   BIGSERIAL PRIMARY KEY,
    project_name VARCHAR(150) NOT NULL,
    description  VARCHAR(1000),
    start_date   DATE,
    end_date     DATE,
    status       VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS employee_projects (
    employee_id     BIGINT NOT NULL REFERENCES employees (employee_id),
    project_id      BIGINT NOT NULL REFERENCES projects (project_id),
    assigned_at     TIMESTAMP,
    role_in_project VARCHAR(100),
    PRIMARY KEY (employee_id, project_id)
);

-- No foreign key on user_id on purpose: audit history must survive
-- the deletion of the user who performed the action.
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id    BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,
    action      VARCHAR(50),
    entity_name VARCHAR(100),
    entity_id   BIGINT,
    old_value   TEXT,
    new_value   TEXT,
    created_at  TIMESTAMP
);
