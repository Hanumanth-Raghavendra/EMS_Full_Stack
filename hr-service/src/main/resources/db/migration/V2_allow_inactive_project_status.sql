ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_project_status;

ALTER TABLE projects
ADD CONSTRAINT chk_project_status
CHECK (status IN ('PLANNED', 'ACTIVE', 'INACTIVE', 'COMPLETED'));