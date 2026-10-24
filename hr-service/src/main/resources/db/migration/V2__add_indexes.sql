-- ============================================================
-- HR SERVICE - DATABASE INDEXES
-- ============================================================

-- EMPLOYEES
CREATE INDEX IF NOT EXISTS idx_employees_department_id
    ON employees(department_id);

CREATE INDEX IF NOT EXISTS idx_employees_designation_id
    ON employees(designation_id);

CREATE INDEX IF NOT EXISTS idx_employees_status
    ON employees(status);


-- DESIGNATIONS
CREATE INDEX IF NOT EXISTS idx_designations_department_id
    ON designations(department_id);


-- USERS
CREATE INDEX IF NOT EXISTS idx_users_role_id
    ON users(role_id);


-- ATTENDANCE
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id
    ON attendance(employee_id);

CREATE INDEX IF NOT EXISTS idx_attendance_date
    ON attendance(attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date
    ON attendance(employee_id, attendance_date);


-- LEAVE REQUESTS
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id
    ON leave_requests(employee_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_by
    ON leave_requests(approved_by);

CREATE INDEX IF NOT EXISTS idx_leave_requests_status
    ON leave_requests(status);


-- EMPLOYEE PROJECTS
CREATE INDEX IF NOT EXISTS idx_employee_projects_project_id
    ON employee_projects(project_id);


-- PROJECTS
CREATE INDEX IF NOT EXISTS idx_projects_status
    ON projects(status);


-- AUDIT LOGS
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs(created_at);