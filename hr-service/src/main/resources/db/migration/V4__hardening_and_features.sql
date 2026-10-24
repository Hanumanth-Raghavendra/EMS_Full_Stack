-- =====================================================================
-- V4 - Data integrity hardening + new feature columns
--
-- Written to be safe on both a fresh database and an existing one:
--   * new columns use ADD COLUMN IF NOT EXISTS with defaults
--   * unique indexes are only created when existing data has no
--     duplicates (a WARNING is logged otherwise; the API still enforces
--     uniqueness in the service layer)
--   * check constraints are added NOT VALID so old rows can never make
--     the migration fail, while every new/updated row is checked
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers (dropped at the end of this script)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ems_try_unique_index(p_index TEXT, p_table TEXT, p_columns TEXT)
RETURNS VOID AS $$
DECLARE
    duplicate_groups INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = p_index) THEN
        RETURN;
    END IF;

    EXECUTE format(
        'SELECT COUNT(*) FROM (SELECT 1 FROM %I GROUP BY %s HAVING COUNT(*) > 1) d',
        p_table, p_columns)
    INTO duplicate_groups;

    IF duplicate_groups = 0 THEN
        EXECUTE format('CREATE UNIQUE INDEX %I ON %I (%s)', p_index, p_table, p_columns);
    ELSE
        RAISE WARNING 'Skipped unique index % on %: % duplicate group(s) exist',
            p_index, p_table, duplicate_groups;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ems_try_check(p_constraint TEXT, p_table TEXT, p_condition TEXT)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = p_constraint) THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s) NOT VALID',
            p_table, p_constraint, p_condition);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Roles: the application uses exactly three system roles
-- ---------------------------------------------------------------------
UPDATE roles
SET role_name = UPPER(TRIM(role_name))
WHERE role_name <> UPPER(TRIM(role_name));

INSERT INTO roles (role_name)
SELECT r.name
FROM (VALUES ('ADMIN'), ('HR'), ('EMPLOYEE')) AS r(name)
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE UPPER(role_name) = r.name);

-- ---------------------------------------------------------------------
-- Users: token versioning (instant logout on password/role change)
-- ---------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------
-- Leave requests: leave types and an explicit review trail
-- ---------------------------------------------------------------------
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_type       VARCHAR(20) NOT NULL DEFAULT 'CASUAL';
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS applied_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS reviewed_at      TIMESTAMP;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS review_comment   VARCHAR(500);

-- Older hand-written status checks may not allow CANCELLED.
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'leave_requests'::regclass
          AND contype = 'c'
          AND conname <> 'chk_leave_status'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE leave_requests DROP CONSTRAINT %I', c.conname);
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- Audit logs: keep the actor's username so history stays readable
-- after a user is deleted
-- ---------------------------------------------------------------------
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE audit_logs ALTER COLUMN old_value TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN new_value TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

UPDATE audit_logs a
SET username = u.username
FROM users u
WHERE a.user_id = u.user_id
  AND a.username IS NULL;

-- ---------------------------------------------------------------------
-- Normalise enum-like columns written by older versions
-- ---------------------------------------------------------------------
UPDATE employees SET status = 'ACTIVE' WHERE status IS NULL;
UPDATE employees SET status = UPPER(TRIM(status)) WHERE status <> UPPER(TRIM(status));
UPDATE attendance SET status = UPPER(TRIM(status)) WHERE status <> UPPER(TRIM(status));
UPDATE leave_requests SET status = UPPER(TRIM(status)) WHERE status <> UPPER(TRIM(status));

-- ---------------------------------------------------------------------
-- Uniqueness
-- ---------------------------------------------------------------------
SELECT ems_try_unique_index('ux_roles_name',              'roles',        'UPPER(role_name)');
SELECT ems_try_unique_index('ux_users_username',          'users',        'LOWER(username)');
SELECT ems_try_unique_index('ux_users_employee',          'users',        'employee_id');
SELECT ems_try_unique_index('ux_employees_email',         'employees',    'LOWER(email)');
SELECT ems_try_unique_index('ux_employees_code',          'employees',    'LOWER(employee_code)');
SELECT ems_try_unique_index('ux_departments_name',        'departments',  'LOWER(department_name)');
SELECT ems_try_unique_index('ux_designations_dept_name',  'designations', 'department_id, LOWER(designation_name)');
SELECT ems_try_unique_index('ux_projects_name',           'projects',     'LOWER(project_name)');
SELECT ems_try_unique_index('ux_attendance_employee_day', 'attendance',   'employee_id, attendance_date');

-- ---------------------------------------------------------------------
-- Value checks
-- ---------------------------------------------------------------------
SELECT ems_try_check('chk_employee_status',   'employees',      $c$status IN ('ACTIVE', 'INACTIVE')$c$);
SELECT ems_try_check('chk_attendance_status', 'attendance',     $c$status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE')$c$);
SELECT ems_try_check('chk_attendance_times',  'attendance',     $c$check_in IS NULL OR check_out IS NULL OR check_out >= check_in$c$);
SELECT ems_try_check('chk_leave_status',      'leave_requests', $c$status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')$c$);
SELECT ems_try_check('chk_leave_type',        'leave_requests', $c$leave_type IN ('CASUAL', 'SICK', 'EARNED', 'UNPAID')$c$);
SELECT ems_try_check('chk_leave_dates',       'leave_requests', $c$end_date >= start_date$c$);
SELECT ems_try_check('chk_project_dates',     'projects',       $c$start_date IS NULL OR end_date IS NULL OR end_date >= start_date$c$);

-- ---------------------------------------------------------------------
-- Query performance
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates ON leave_requests (employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity             ON audit_logs (entity_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action             ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_employee_projects_employee    ON employee_projects (employee_id);

DROP FUNCTION ems_try_unique_index(TEXT, TEXT, TEXT);
DROP FUNCTION ems_try_check(TEXT, TEXT, TEXT);
