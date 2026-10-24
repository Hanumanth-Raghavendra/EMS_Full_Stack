-- =====================================================================
-- V3 - Project status values
-- =====================================================================

-- Normalise legacy values before the constraint is (re)created.
UPDATE projects
SET status = UPPER(TRIM(status))
WHERE status IS NOT NULL
  AND status <> UPPER(TRIM(status));

ALTER TABLE projects
    DROP CONSTRAINT IF EXISTS chk_project_status;

-- NOT VALID: enforced for every new/updated row without failing the
-- migration if an old row holds an unexpected value.
ALTER TABLE projects
    ADD CONSTRAINT chk_project_status
        CHECK (status IN ('PLANNED', 'ACTIVE', 'INACTIVE', 'COMPLETED')) NOT VALID;
