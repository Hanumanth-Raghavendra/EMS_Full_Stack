EMS THREE CRITICAL FIXES — SAFE PACKAGE v4.2

Use ONLY:
  EMS_Guarded_Apply_Three_Critical_Fixes_v4_2.ps1

Do NOT use the v1/v2/v3 packages.

What v4.2 fixes:
1. Reject blank/whitespace department names on create/update.
2. Delete a project's employee-project assignments before deleting the project.
3. Delete an employee's dependent assignment/attendance/leave/user records in one transaction, clear that user's leave-approval references, then delete the employee.

What it does NOT change:
- Frontend source
- database schema
- security/RBAC rules
- the other regression-test edge cases

Safety:
- Exact SHA-256 baseline check before any write.
- Exact five-file restore point created before patching.
- Patched SHA-256 verification.
- Maven backend tests.
- Frontend Vitest tests.
- Frontend production build.
- Automatic restore if anything after patching fails.

Run from C:\EMS_Main:
  PowerShell -ExecutionPolicy Bypass -File .\EMS_Guarded_Apply_Three_Critical_Fixes_v4_2.ps1

After success:
1. Restart the Spring Boot backend.
2. Run the full CRUD regression test.
3. Confirm the three targeted checks pass.

Manual restore:
  PowerShell -ExecutionPolicy Bypass -File .\EMS_Restore_Three_Critical_Fixes_v4_2.ps1


Important v4.2 change:
The backend test uses the project's local Maven Wrapper (mvnw.cmd), not a system-wide mvn installation.
