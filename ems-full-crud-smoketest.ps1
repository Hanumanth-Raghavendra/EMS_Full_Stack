param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "CHANGE_ME",
    [string]$EmployeeUsername = "employee",
    [string]$EmployeePassword = "CHANGE_ME",
    [switch]$SkipEmployeeTests
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd('/')
$script:Passed = 0
$script:Failed = 0
$script:Skipped = 0
$script:CleanupFailures = 0
$script:TestGuid = [guid]::NewGuid().ToString('N').Substring(0,8)
$script:TestPrefix = "SMK_$((Get-Date).ToString('yyyyMMddHHmmss'))_$script:TestGuid"

$script:Created = @{
    DepartmentId = $null
    DesignationId = $null
    ProjectId = $null
    EmployeeId = $null
    UserId = $null
    RoleId = $null
    AttendanceId = $null
    LeaveId = $null
    AuditId = $null
}

function Write-Section {
    param([string]$Text)
    Write-Host "`n--- $Text ---" -ForegroundColor Yellow
}

function Assert-Condition {
    param(
        [string]$Name,
        [bool]$Condition,
        [string]$FailureMessage = "Condition was false"
    )

    if ($Condition) {
        Write-Host "[PASS] $Name" -ForegroundColor Green
        $script:Passed++
        return $true
    }

    Write-Host "[FAIL] $Name -> $FailureMessage" -ForegroundColor Red
    $script:Failed++
    return $false
}

function Convert-ErrorResponseBody {
    param($Response)

    if ($null -eq $Response) {
        return $null
    }

    try {
        $stream = $Response.GetResponseStream()
        if ($null -eq $stream) {
            return $null
        }

        $reader = New-Object System.IO.StreamReader($stream)
        try {
            return $reader.ReadToEnd()
        }
        finally {
            $reader.Dispose()
            $stream.Dispose()
        }
    }
    catch {
        return $null
    }
}

function Invoke-Api {
    param(
        [ValidateSet("GET", "POST", "PUT", "DELETE")]
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers = @{},
        $Body = $null
    )

    $params = @{
        Uri = "$BaseUrl$Path"
        Method = $Method
        Headers = $Headers
        UseBasicParsing = $true
        ErrorAction = "Stop"
    }

    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
    }

    try {
        $response = Invoke-WebRequest @params
        return [pscustomobject]@{
            StatusCode = [int]$response.StatusCode
            Content = $response.Content
            Response = $response
            TransportError = $null
        }
    }
    catch {
        $httpResponse = $_.Exception.Response

        if ($null -ne $httpResponse) {
            return [pscustomobject]@{
                StatusCode = [int]$httpResponse.StatusCode
                Content = Convert-ErrorResponseBody $httpResponse
                Response = $httpResponse
                TransportError = $null
            }
        }

        return [pscustomobject]@{
            StatusCode = $null
            Content = $null
            Response = $null
            TransportError = $_.Exception.Message
        }
    }
}

function Test-Api {
    param(
        [string]$Name,
        [ValidateSet("GET", "POST", "PUT", "DELETE")]
        [string]$Method,
        [string]$Path,
        [int]$ExpectedStatus,
        [hashtable]$Headers = @{},
        $Body = $null,
        [switch]$AllowAnySuccess
    )

    $result = Invoke-Api $Method $Path $Headers $Body

    if ($null -ne $result.TransportError) {
        Write-Host "[FAIL] $Name -> transport error: $($result.TransportError)" -ForegroundColor Red
        $script:Failed++
        return $result
    }

    $ok = if ($AllowAnySuccess) {
        $result.StatusCode -ge 200 -and $result.StatusCode -lt 300
    } else {
        $result.StatusCode -eq $ExpectedStatus
    }

    if ($ok) {
        Write-Host "[PASS] $Name -> $($result.StatusCode)" -ForegroundColor Green
        $script:Passed++
    }
    else {
        $expected = if ($AllowAnySuccess) { "2xx" } else { "$ExpectedStatus" }
        Write-Host "[FAIL] $Name -> $($result.StatusCode), expected $expected" -ForegroundColor Red
        if ($result.Content) {
            Write-Host "       $($result.Content)" -ForegroundColor DarkRed
        }
        $script:Failed++
    }

    return $result
}

function Test-ResponseJson {
    param(
        [string]$Name,
        $Response,
        [scriptblock]$Assertion
    )

    if ($null -eq $Response -or $null -eq $Response.Content) {
        return $null
    }

    try {
        $json = $Response.Content | ConvertFrom-Json
        $ok = & $Assertion $json
        Assert-Condition $Name $ok "JSON assertion failed"
        return $json
    }
    catch {
        Write-Host "[FAIL] $Name -> invalid/unexpected JSON: $($_.Exception.Message)" -ForegroundColor Red
        $script:Failed++
        return $null
    }
}

function Get-Token {
    param(
        [string]$Username,
        [string]$Password,
        [string]$Label,
        [string]$ExpectedRole
    )

    $response = Test-Api "$Label login" POST "/api/auth/login" 200 @{} @{
        username = $Username
        password = $Password
    }

    if ($response.StatusCode -ne 200) {
        return $null
    }

    $json = Test-ResponseJson "$Label login response" $response {
        param($body)
        return (-not [string]::IsNullOrWhiteSpace([string]$body.token)) -and
               (-not [string]::IsNullOrWhiteSpace([string]$body.username)) -and
               (-not [string]::IsNullOrWhiteSpace([string]$body.role)) -and
               ($null -ne $body.employeeId)
    }

    if ($null -eq $json) {
        return $null
    }

    Assert-Condition "$Label role" ($json.role -eq $ExpectedRole) "Expected $ExpectedRole but received $($json.role)"

    return [pscustomobject]@{
        Token = [string]$json.token
        Username = [string]$json.username
        Role = [string]$json.role
        EmployeeId = [long]$json.employeeId
    }
}

function Auth-Headers {
    param([string]$Token)
    return @{ Authorization = "Bearer $Token" }
}

function Get-ListJson {
    param(
        [string]$Name,
        [string]$Path,
        [hashtable]$Headers
    )

    $response = Test-Api $Name GET $Path 200 $Headers
    if ($response.StatusCode -ne 200) {
        return $null
    }

    return Test-ResponseJson "$Name response shape" $response {
        param($body)
        return $body -is [System.Array]
    }
}

function Find-ByNumericId {
    param(
        $Collection,
        [string]$PropertyName,
        [long]$Id
    )

    if ($null -eq $Collection) {
        return $null
    }

    foreach ($item in $Collection) {
        $value = $item.$PropertyName
        if ($null -ne $value -and [long]$value -eq $Id) {
            return $item
        }
    }

    return $null
}

function Cleanup-Api {
    param(
        [string]$Name,
        [ValidateSet("GET", "POST", "PUT", "DELETE")]
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers = @{}
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return
    }

    $result = Invoke-Api $Method $Path $Headers
    $ok = $result.StatusCode -ge 200 -and $result.StatusCode -lt 300

    if ($ok) {
        Write-Host "[CLEAN] $Name -> $($result.StatusCode)" -ForegroundColor DarkGreen
    }
    else {
        $script:CleanupFailures++
        Write-Host "[CLEANUP FAIL] $Name -> $($result.StatusCode)" -ForegroundColor DarkRed
        if ($result.Content) {
            Write-Host "              $($result.Content)" -ForegroundColor DarkRed
        }
    }
}

Write-Host "`n=== ACCURATE HR SERVICE SMOKE TEST ===" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "Test prefix: $script:TestPrefix" -ForegroundColor Cyan
Write-Host "" 

$admin = $null
$employee = $null
$adminHeaders = @{}
$employeeHeaders = @{}

try {
    # ------------------------------------------------------------
    # SETUP / PUBLIC ENDPOINTS
    # ------------------------------------------------------------
    Write-Section "INITIAL SETUP / PUBLIC ENDPOINTS"

    $setupStatus = Test-Api "Setup status" GET "/api/setup/status" 200
    Test-ResponseJson "Setup status response is boolean" $setupStatus {
        param($body)
        return ($body -is [bool]) -or ([string]$body -in @("true", "false"))
    } | Out-Null

    $setupEmployees = Test-Api "Setup employee list" GET "/api/setup/employees" 200
    Test-ResponseJson "Setup employee list response is an array" $setupEmployees {
        param($body)
        return $body -is [System.Array]
    } | Out-Null

    # These endpoints are deliberately public.
    Test-Api "Anonymous GET /api/setup/status" GET "/api/setup/status" 200 | Out-Null
    Test-Api "Anonymous GET /api/auth/login with GET is not allowed" GET "/api/auth/login" 405 | Out-Null

    # ------------------------------------------------------------
    # ANONYMOUS PROTECTED ACCESS
    # Spring Security in this application currently answers protected
    # anonymous requests with 403. Keep this exact: a 200 is a failure.
    # ------------------------------------------------------------
    Write-Section "ANONYMOUS PROTECTED ACCESS"

    $protectedGetEndpoints = @(
        "/api/employees",
        "/api/departments",
        "/api/designations",
        "/api/projects",
        "/api/employee-projects",
        "/api/attendance",
        "/api/leave-requests",
        "/api/users",
        "/api/roles",
        "/api/audit-logs"
    )

    foreach ($endpoint in $protectedGetEndpoints) {
        Test-Api "Anonymous GET $endpoint is blocked" GET $endpoint 403 | Out-Null
    }

    # ------------------------------------------------------------
    # LOGIN
    # ------------------------------------------------------------
    Write-Section "LOGIN"

    $admin = Get-Token $AdminUsername $AdminPassword "Admin" "ADMIN"
    if ($null -ne $admin) {
        $adminHeaders = Auth-Headers $admin.Token
    }

    if (-not $SkipEmployeeTests) {
        $employee = Get-Token $EmployeeUsername $EmployeePassword "Employee" "EMPLOYEE"
        if ($null -ne $employee) {
            $employeeHeaders = Auth-Headers $employee.Token
        }
    }
    else {
        Write-Host "[SKIP] Employee login/tests disabled with -SkipEmployeeTests" -ForegroundColor DarkYellow
        $script:Skipped++
    }

    if ($null -eq $admin) {
        throw "Admin login failed; authenticated CRUD/RBAC tests cannot continue safely."
    }

    # ------------------------------------------------------------
    # ADMIN READ CONTRACTS
    # ------------------------------------------------------------
    Write-Section "ADMIN READ CONTRACTS"

    $adminListEndpoints = @(
        @{ Path = "/api/employees"; Name = "Admin employees list" },
        @{ Path = "/api/departments"; Name = "Admin departments list" },
        @{ Path = "/api/designations"; Name = "Admin designations list" },
        @{ Path = "/api/projects"; Name = "Admin projects list" },
        @{ Path = "/api/employee-projects"; Name = "Admin employee-projects list" },
        @{ Path = "/api/attendance"; Name = "Admin attendance list" },
        @{ Path = "/api/leave-requests"; Name = "Admin leave requests list" },
        @{ Path = "/api/roles"; Name = "Admin roles list" },
        @{ Path = "/api/users"; Name = "Admin users list" },
        @{ Path = "/api/audit-logs"; Name = "Admin audit logs list" }
    )

    foreach ($item in $adminListEndpoints) {
        $list = Get-ListJson $item.Name $item.Path $adminHeaders
        if ($null -ne $list) {
            Assert-Condition "$($item.Name) returned without server error" $true | Out-Null
        }
    }

    $existingDepartments = Get-ListJson "Baseline departments" "/api/departments" $adminHeaders
    $existingDesignations = Get-ListJson "Baseline designations" "/api/designations" $adminHeaders
    $existingProjects = Get-ListJson "Baseline projects" "/api/projects" $adminHeaders
    $existingEmployees = Get-ListJson "Baseline employees" "/api/employees" $adminHeaders
    $existingRoles = Get-ListJson "Baseline roles" "/api/roles" $adminHeaders
    $existingUsers = Get-ListJson "Baseline users" "/api/users" $adminHeaders

    $fallbackDepartment = if ($existingDepartments.Count -gt 0) { $existingDepartments[0] } else { $null }
    $fallbackDesignation = if ($existingDesignations.Count -gt 0) { $existingDesignations[0] } else { $null }
    $fallbackProject = if ($existingProjects.Count -gt 0) { $existingProjects[0] } else { $null }

    if ($null -eq $fallbackDepartment -or $null -eq $fallbackDesignation -or $null -eq $fallbackProject) {
        throw "Existing master data is insufficient to run the full smoke test (requires at least one department, designation and project)."
    }

    $employeeRole = $existingRoles | Where-Object { $_.roleName -eq "EMPLOYEE" } | Select-Object -First 1
    if ($null -eq $employeeRole) {
        throw "EMPLOYEE role does not exist; cannot safely create the temporary test user."
    }

    $adminUserRecord = $existingUsers | Where-Object { $_.username -eq $AdminUsername } | Select-Object -First 1
    $adminUserId = if ($null -ne $adminUserRecord) { [long]$adminUserRecord.userId } else { $null }

    # ------------------------------------------------------------
    # ADMIN CRUD: DEPARTMENT
    # ------------------------------------------------------------
    Write-Section "ADMIN CRUD - DEPARTMENT"

    $deptName = "$($script:TestPrefix)_Department"
    $deptCreate = Test-Api "Create temporary department" POST "/api/departments" 200 $adminHeaders @{
        departmentName = $deptName
        description = "Smoke-test department"
    }

    if ($deptCreate.StatusCode -eq 200) {
        $deptJson = Test-ResponseJson "Department create response" $deptCreate {
            param($body)
            return ($null -ne $body.departmentId) -and ($body.departmentName -eq $deptName)
        }
        $script:Created.DepartmentId = [long]$deptJson.departmentId

        $deptGet = Test-Api "Get temporary department" GET "/api/departments/$($script:Created.DepartmentId)" 200 $adminHeaders
        Test-ResponseJson "Department GET matches created id" $deptGet {
            param($body)
            return ([long]$body.departmentId -eq $script:Created.DepartmentId) -and ($body.departmentName -eq $deptName)
        } | Out-Null

        $deptUpdatedName = "$($script:TestPrefix)_Department_Updated"
        $deptUpdate = Test-Api "Update temporary department" PUT "/api/departments/$($script:Created.DepartmentId)" 200 $adminHeaders @{
            departmentName = $deptUpdatedName
            description = "Smoke-test department updated"
        }
        Test-ResponseJson "Department update persisted" $deptUpdate {
            param($body)
            return $body.departmentName -eq $deptUpdatedName -and $body.description -eq "Smoke-test department updated"
        } | Out-Null
    }

    # ------------------------------------------------------------
    # ADMIN CRUD: DESIGNATION
    # ------------------------------------------------------------
    Write-Section "ADMIN CRUD - DESIGNATION"

    if ($null -ne $script:Created.DepartmentId) {
        $designationName = "$($script:TestPrefix)_Designation"
        $designationCreate = Test-Api "Create temporary designation" POST "/api/designations" 200 $adminHeaders @{
            designationName = $designationName
            departmentId = $script:Created.DepartmentId
        }

        if ($designationCreate.StatusCode -eq 200) {
            $designationJson = Test-ResponseJson "Designation create response" $designationCreate {
                param($body)
                return ($null -ne $body.designationId) -and ($body.designationName -eq $designationName)
            }
            $script:Created.DesignationId = [long]$designationJson.designationId

            # There is no GET /api/designations/{id} endpoint in the backend.
            # Verify the created designation through the supported department-scoped GET.
            $designationListByDept = Test-Api "Get designations by temporary department" GET "/api/designations/department/$($script:Created.DepartmentId)" 200 $adminHeaders
            Test-ResponseJson "Temporary designation appears under department" $designationListByDept {
                param($body)
                return (@($body | Where-Object { [long]$_.designationId -eq $script:Created.DesignationId }).Count -eq 1)
            } | Out-Null

            $designationUpdatedName = "$($script:TestPrefix)_Designation_Updated"
            $designationUpdate = Test-Api "Update temporary designation" PUT "/api/designations/$($script:Created.DesignationId)" 200 $adminHeaders @{
                designationName = $designationUpdatedName
                departmentId = $script:Created.DepartmentId
            }
            Test-ResponseJson "Designation update persisted" $designationUpdate {
                param($body)
                return $body.designationName -eq $designationUpdatedName -and [long]$body.departmentId -eq $script:Created.DepartmentId
            } | Out-Null
        }
    }

    # ------------------------------------------------------------
    # ADMIN CRUD: PROJECT
    # ------------------------------------------------------------
    Write-Section "ADMIN CRUD - PROJECT"

    $projectName = "$($script:TestPrefix)_Project"
    $projectCreate = Test-Api "Create temporary project as PLANNED" POST "/api/projects" 200 $adminHeaders @{
        projectName = $projectName
        description = "Smoke-test project"
        startDate = (Get-Date -Format "yyyy-MM-dd")
        endDate = $null
        status = "PLANNED"
    }

    if ($projectCreate.StatusCode -eq 200) {
        $projectJson = Test-ResponseJson "Project create response" $projectCreate {
            param($body)
            return ($null -ne $body.projectId) -and
                   ($body.projectName -eq $projectName) -and
                   ($body.status -eq "PLANNED")
        }
        $script:Created.ProjectId = [long]$projectJson.projectId

        $projectGet = Test-Api "Get temporary project" GET "/api/projects/$($script:Created.ProjectId)" 200 $adminHeaders
        Test-ResponseJson "Project GET matches created id" $projectGet {
            param($body)
            return [long]$body.projectId -eq $script:Created.ProjectId -and
                   $body.status -eq "PLANNED"
        } | Out-Null

        $today = Get-Date -Format "yyyy-MM-dd"
        $projectEndDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
        $projectUpdatedName = "$($script:TestPrefix)_Project_Updated"

        # Exercise all four supported project statuses through real updates.
        $statusTransitions = @(
            @{ Status = "ACTIVE"; Description = "Smoke-test project ACTIVE"; Name = $projectUpdatedName },
            @{ Status = "INACTIVE"; Description = "Smoke-test project INACTIVE"; Name = $projectUpdatedName },
            @{ Status = "COMPLETED"; Description = "Smoke-test project COMPLETED"; Name = $projectUpdatedName }
        )

        foreach ($transition in $statusTransitions) {
            $projectUpdate = Test-Api "Update temporary project to $($transition.Status)" PUT "/api/projects/$($script:Created.ProjectId)" 200 $adminHeaders @{
                projectName = $transition.Name
                description = $transition.Description
                startDate = $today
                endDate = $projectEndDate
                status = $transition.Status
            }

            Test-ResponseJson "Project $($transition.Status) update response" $projectUpdate {
                param($body)
                return [long]$body.projectId -eq $script:Created.ProjectId -and
                       $body.status -eq $transition.Status
            } | Out-Null

            $projectAfterUpdate = Test-Api "Get project after $($transition.Status) update" GET "/api/projects/$($script:Created.ProjectId)" 200 $adminHeaders
            Test-ResponseJson "Project $($transition.Status) update persisted" $projectAfterUpdate {
                param($body)
                return [long]$body.projectId -eq $script:Created.ProjectId -and
                       $body.projectName -eq $transition.Name -and
                       $body.description -eq $transition.Description -and
                       $body.status -eq $transition.Status
            } | Out-Null
        }

        # Validation must reject a project with an unsupported status.
        Test-Api "Invalid project status is rejected" POST "/api/projects" 400 $adminHeaders @{
            projectName = "$($script:TestPrefix)_Invalid_Project"
            description = "Invalid smoke-test project"
            startDate = $today
            endDate = $null
            status = "BAD_STATUS"
        } | Out-Null
    }

    # ------------------------------------------------------------
    # ADMIN CRUD: ROLE
    # ------------------------------------------------------------
    Write-Section "ADMIN CRUD - ROLE"

    $roleName = "$($script:TestPrefix)_Role"
    $roleCreate = Test-Api "Create temporary role" POST "/api/roles" 200 $adminHeaders @{
        roleName = $roleName
    }

    if ($roleCreate.StatusCode -eq 200) {
        $roleJson = Test-ResponseJson "Role create response" $roleCreate {
            param($body)
            return ($null -ne $body.roleId) -and ($body.roleName -eq $roleName)
        }
        $script:Created.RoleId = [long]$roleJson.roleId

        $roleGet = Test-Api "Get temporary role" GET "/api/roles/$($script:Created.RoleId)" 200 $adminHeaders
        Test-ResponseJson "Role GET matches created id" $roleGet {
            param($body)
            return [long]$body.roleId -eq $script:Created.RoleId
        } | Out-Null

        $roleUpdatedName = "$($script:TestPrefix)_Role_Updated"
        $roleUpdate = Test-Api "Update temporary role" PUT "/api/roles/$($script:Created.RoleId)" 200 $adminHeaders @{
            roleName = $roleUpdatedName
        }
        Test-ResponseJson "Role update persisted" $roleUpdate {
            param($body)
            return $body.roleName -eq $roleUpdatedName
        } | Out-Null

        $roleDelete = Test-Api "Delete temporary role" DELETE "/api/roles/$($script:Created.RoleId)" 204 $adminHeaders
        if ($roleDelete.StatusCode -ge 200 -and $roleDelete.StatusCode -lt 300) {
            $script:Created.RoleId = $null
        }
    }

    # ------------------------------------------------------------
    # ADMIN CRUD: EMPLOYEE
    # ------------------------------------------------------------
    Write-Section "ADMIN CRUD - EMPLOYEE"

    if ($null -eq $script:Created.DepartmentId -or $null -eq $script:Created.DesignationId) {
        throw "Temporary department/designation was not created; employee CRUD cannot run safely."
    }

    $employeeCode = "SMKEMP$($script:TestGuid)"
    $employeeEmail = "smk-$($script:TestGuid)@example.com"
    $employeeCreateBody = @{
        employeeCode = $employeeCode
        firstName = "Smoke"
        lastName = "Tester"
        email = $employeeEmail
        phone = "9876543210"
        dateOfJoining = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
        departmentId = $script:Created.DepartmentId
        designationId = $script:Created.DesignationId
        status = "ACTIVE"
    }

    $employeeCreate = Test-Api "Create temporary employee" POST "/api/employees" 200 $adminHeaders $employeeCreateBody

    if ($employeeCreate.StatusCode -eq 200) {
        $employeeJson = Test-ResponseJson "Employee create response" $employeeCreate {
            param($body)
            return ($null -ne $body.employeeId) -and ($body.employeeCode -eq $employeeCode)
        }
        $script:Created.EmployeeId = [long]$employeeJson.employeeId

        $employeeGet = Test-Api "Get temporary employee" GET "/api/employees/$($script:Created.EmployeeId)" 200 $adminHeaders
        Test-ResponseJson "Employee GET matches created id" $employeeGet {
            param($body)
            return [long]$body.employeeId -eq $script:Created.EmployeeId
        } | Out-Null

        $employeeUpdateBody = @{
            employeeCode = $employeeCode
            firstName = "SmokeUpdated"
            lastName = "TesterUpdated"
            email = "updated_$employeeEmail"
            phone = "9876543211"
            dateOfJoining = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
            departmentId = $script:Created.DepartmentId
            designationId = $script:Created.DesignationId
            status = "INACTIVE"
        }

        $employeeUpdate = Test-Api "Update temporary employee" PUT "/api/employees/$($script:Created.EmployeeId)" 200 $adminHeaders $employeeUpdateBody
        Test-ResponseJson "Employee update persisted" $employeeUpdate {
            param($body)
            return $body.firstName -eq "SmokeUpdated" -and $body.status -eq "INACTIVE" -and $body.phone -eq "9876543211"
        } | Out-Null
    }

    # ------------------------------------------------------------
    # ADMIN CRUD: USER
    # ------------------------------------------------------------
    Write-Section "ADMIN CRUD - USER"

    if ($null -ne $script:Created.EmployeeId) {
        $testUsername = "smk$($script:TestGuid)_user"
        $userCreate = Test-Api "Create temporary user" POST "/api/users" 200 $adminHeaders @{
            employeeId = $script:Created.EmployeeId
            username = $testUsername
            passwordHash = "SmokeTestPassword123!"
            roleId = [long]$employeeRole.roleId
            enabled = $true
        }

        if ($userCreate.StatusCode -eq 200) {
            $userJson = Test-ResponseJson "User create response" $userCreate {
                param($body)
                return ($null -ne $body.userId) -and ($body.username -eq $testUsername) -and ($body.enabled -eq $true)
            }
            $script:Created.UserId = [long]$userJson.userId

            $userGet = Test-Api "Get temporary user" GET "/api/users/$($script:Created.UserId)" 200 $adminHeaders
            Test-ResponseJson "User GET matches created id" $userGet {
                param($body)
                return [long]$body.userId -eq $script:Created.UserId
            } | Out-Null

            $updatedUsername = "${testUsername}_updated"
            $userUpdate = Test-Api "Update temporary user" PUT "/api/users/$($script:Created.UserId)" 200 $adminHeaders @{
                employeeId = $script:Created.EmployeeId
                username = $updatedUsername
                passwordHash = "SmokeTestPassword456!"
                roleId = [long]$employeeRole.roleId
                enabled = $true
            }
            Test-ResponseJson "User update persisted" $userUpdate {
                param($body)
                return $body.username -eq $updatedUsername -and $body.enabled -eq $true
            } | Out-Null
        }
    }

    # ------------------------------------------------------------
    # ADMIN CRUD: ATTENDANCE
    # ------------------------------------------------------------
    Write-Section "ADMIN CRUD - ATTENDANCE"

    if ($null -ne $script:Created.EmployeeId) {
        $attendanceDate = (Get-Date).Date.AddDays(-2).ToString("yyyy-MM-dd")
        $attendanceBody = @{
            employeeId = $script:Created.EmployeeId
            attendanceDate = $attendanceDate
            status = "PRESENT"
            checkIn = "$attendanceDate`T09:00:00"
            checkOut = "$attendanceDate`T18:00:00"
        }

        $attendanceCreate = Test-Api "Create temporary attendance" POST "/api/attendance" 200 $adminHeaders $attendanceBody
        if ($attendanceCreate.StatusCode -eq 200) {
            $attendanceJson = Test-ResponseJson "Attendance create response" $attendanceCreate {
                param($body)
                return ($null -ne $body.attendanceId) -and ([long]$body.employeeId -eq $script:Created.EmployeeId)
            }
            $script:Created.AttendanceId = [long]$attendanceJson.attendanceId

            $attendanceGet = Test-Api "Get temporary attendance" GET "/api/attendance/$($script:Created.AttendanceId)" 200 $adminHeaders
            Test-ResponseJson "Attendance GET matches created id" $attendanceGet {
                param($body)
                return [long]$body.attendanceId -eq $script:Created.AttendanceId
            } | Out-Null

            $attendanceUpdateBody = @{
                employeeId = $script:Created.EmployeeId
                attendanceDate = $attendanceDate
                status = "HALF_DAY"
                checkIn = "$attendanceDate`T09:00:00"
                checkOut = "$attendanceDate`T13:00:00"
            }
            $attendanceUpdate = Test-Api "Update temporary attendance" PUT "/api/attendance/$($script:Created.AttendanceId)" 200 $adminHeaders $attendanceUpdateBody
            Test-ResponseJson "Attendance update persisted" $attendanceUpdate {
                param($body)
                return $body.status -eq "HALF_DAY"
            } | Out-Null
        }
    }

    # ------------------------------------------------------------
    # ADMIN CRUD: LEAVE REQUEST
    # ------------------------------------------------------------
    Write-Section "ADMIN CRUD - LEAVE REQUEST"

    if ($null -ne $script:Created.EmployeeId) {
        $leaveBody = @{
            employeeId = $script:Created.EmployeeId
            startDate = (Get-Date).Date.AddDays(10).ToString("yyyy-MM-dd")
            endDate = (Get-Date).Date.AddDays(11).ToString("yyyy-MM-dd")
            reason = "Smoke-test leave request"
            status = "PENDING"
            approvedBy = $null
        }

        $leaveCreate = Test-Api "Create temporary leave request" POST "/api/leave-requests" 200 $adminHeaders $leaveBody
        if ($leaveCreate.StatusCode -eq 200) {
            $leaveJson = Test-ResponseJson "Leave create response" $leaveCreate {
                param($body)
                return ($null -ne $body.leaveId) -and ([long]$body.employeeId -eq $script:Created.EmployeeId) -and ($body.status -eq "PENDING")
            }
            $script:Created.LeaveId = [long]$leaveJson.leaveId

            $leaveGet = Test-Api "Get temporary leave request" GET "/api/leave-requests/$($script:Created.LeaveId)" 200 $adminHeaders
            Test-ResponseJson "Leave GET matches created id" $leaveGet {
                param($body)
                return [long]$body.leaveId -eq $script:Created.LeaveId
            } | Out-Null

            $leaveUpdateBody = $leaveBody.Clone()
            $leaveUpdateBody.reason = "Smoke-test leave request updated"
            $leaveUpdateBody.status = "APPROVED"
            if ($null -ne $adminUserId) {
                $leaveUpdateBody.approvedBy = $adminUserId
            }

            $leaveUpdate = Test-Api "Update temporary leave request" PUT "/api/leave-requests/$($script:Created.LeaveId)" 200 $adminHeaders $leaveUpdateBody
            Test-ResponseJson "Leave update persisted" $leaveUpdate {
                param($body)
                return $body.status -eq "APPROVED" -and $body.reason -eq "Smoke-test leave request updated"
            } | Out-Null
        }
    }

    # ------------------------------------------------------------
    # ADMIN CRUD: EMPLOYEE PROJECT ASSIGNMENT
    # ------------------------------------------------------------
    Write-Section "ADMIN CRUD - EMPLOYEE PROJECT ASSIGNMENT"

    if ($null -ne $script:Created.EmployeeId -and $null -ne $script:Created.ProjectId) {
        $assignmentBody = @{
            employeeId = $script:Created.EmployeeId
            projectId = $script:Created.ProjectId
            assignedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
            roleInProject = "Smoke Tester"
        }

        $assignmentCreate = Test-Api "Create temporary employee-project assignment" POST "/api/employee-projects" 200 $adminHeaders $assignmentBody
        if ($assignmentCreate.StatusCode -eq 200) {
            Test-ResponseJson "Assignment create response" $assignmentCreate {
                param($body)
                return [long]$body.employeeId -eq $script:Created.EmployeeId -and [long]$body.projectId -eq $script:Created.ProjectId
            } | Out-Null

            $assignmentGet = Test-Api "Get temporary assignment" GET "/api/employee-projects/$($script:Created.EmployeeId)/$($script:Created.ProjectId)" 200 $adminHeaders
            Test-ResponseJson "Assignment GET matches composite id" $assignmentGet {
                param($body)
                return [long]$body.employeeId -eq $script:Created.EmployeeId -and [long]$body.projectId -eq $script:Created.ProjectId
            } | Out-Null

            $assignmentUpdate = Test-Api "Update temporary assignment" PUT "/api/employee-projects/$($script:Created.EmployeeId)/$($script:Created.ProjectId)" 200 $adminHeaders @{
                employeeId = $script:Created.EmployeeId
                projectId = $script:Created.ProjectId
                assignedAt = (Get-Date).AddMinutes(1).ToString("yyyy-MM-ddTHH:mm:ss")
                roleInProject = "Smoke Tester Updated"
            }
            Test-ResponseJson "Assignment update persisted" $assignmentUpdate {
                param($body)
                return $body.roleInProject -eq "Smoke Tester Updated"
            } | Out-Null
        }
    }

    # ------------------------------------------------------------
    # ADMIN CRUD: AUDIT LOG DIRECT ENDPOINT
    # ------------------------------------------------------------
    Write-Section "ADMIN CRUD - AUDIT LOG"

    if ($null -ne $adminUserId) {
        $auditBody = @{
            userId = $adminUserId
            action = "SMOKE_TEST"
            entityName = "SmokeTest"
            entityId = $script:Created.EmployeeId
            oldValue = "before"
            newValue = "after"
            createdAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        }

        $auditCreate = Test-Api "Create temporary audit log" POST "/api/audit-logs" 200 $adminHeaders $auditBody
        if ($auditCreate.StatusCode -eq 200) {
            $auditJson = Test-ResponseJson "Audit log create response" $auditCreate {
                param($body)
                return ($null -ne $body.auditId) -and ($body.entityName -eq "SmokeTest")
            }
            $script:Created.AuditId = [long]$auditJson.auditId

            $auditGet = Test-Api "Get temporary audit log" GET "/api/audit-logs/$($script:Created.AuditId)" 200 $adminHeaders
            Test-ResponseJson "Audit log GET matches created id" $auditGet {
                param($body)
                return [long]$body.auditId -eq $script:Created.AuditId
            } | Out-Null

            $auditUpdate = Test-Api "Update temporary audit log" PUT "/api/audit-logs/$($script:Created.AuditId)" 200 $adminHeaders (@{
                userId = $adminUserId
                action = "SMOKE_TEST_UPDATED"
                entityName = "SmokeTest"
                entityId = $script:Created.EmployeeId
                oldValue = "before"
                newValue = "updated"
                createdAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
            })
            Test-ResponseJson "Audit log update persisted" $auditUpdate {
                param($body)
                return $body.action -eq "SMOKE_TEST_UPDATED" -and $body.newValue -eq "updated"
            } | Out-Null
        }
    }

    # ------------------------------------------------------------
    # EMPLOYEE READ/RBAC/OWNERSHIP
    # ------------------------------------------------------------
    if ($null -ne $employee) {
        Write-Section "EMPLOYEE RBAC / OWNERSHIP"

        $employeeAllowed = @(
            "/api/employees",
            "/api/projects",
            "/api/employee-projects",
            "/api/attendance",
            "/api/leave-requests"
        )

        foreach ($endpoint in $employeeAllowed) {
            Test-Api "Employee allowed GET $endpoint" GET $endpoint 200 $employeeHeaders | Out-Null
        }

        $employeeRestricted = @(
            "/api/departments",
            "/api/designations",
            "/api/users",
            "/api/roles",
            "/api/audit-logs"
        )

        foreach ($endpoint in $employeeRestricted) {
            Test-Api "Employee restricted GET $endpoint" GET $endpoint 403 $employeeHeaders | Out-Null
        }

        # Employee can read only its own employee record.
        Test-Api "Employee can read own employee record" GET "/api/employees/$($employee.EmployeeId)" 200 $employeeHeaders | Out-Null

        if ($null -ne $script:Created.EmployeeId) {
            Test-Api "Employee cannot read another employee record" GET "/api/employees/$($script:Created.EmployeeId)" 403 $employeeHeaders | Out-Null
        }

        # Employee cannot write admin-managed resources. Valid payloads are used
        # so that a 400 cannot masquerade as a security result.
        if ($null -ne $script:Created.DepartmentId) {
            Test-Api "Employee cannot update department" PUT "/api/departments/$($script:Created.DepartmentId)" 403 $employeeHeaders @{
                departmentName = "$($script:TestPrefix)_Blocked"
                description = "Should never be persisted"
            } | Out-Null
        }

        if ($null -ne $script:Created.DesignationId) {
            Test-Api "Employee cannot update designation" PUT "/api/designations/$($script:Created.DesignationId)" 403 $employeeHeaders @{
                designationName = "$($script:TestPrefix)_Blocked"
                departmentId = $script:Created.DepartmentId
            } | Out-Null
        }

        if ($null -ne $script:Created.ProjectId) {
            Test-Api "Employee cannot update project" PUT "/api/projects/$($script:Created.ProjectId)" 403 $employeeHeaders @{
                projectName = "$($script:TestPrefix)_Blocked"
                description = "Should never be persisted"
                startDate = (Get-Date -Format "yyyy-MM-dd")
                endDate = $null
                status = "ACTIVE"
            } | Out-Null
        }

        if ($null -ne $script:Created.UserId) {
            Test-Api "Employee cannot update user" PUT "/api/users/$($script:Created.UserId)" 403 $employeeHeaders @{
                employeeId = $script:Created.EmployeeId
                username = "should_not_work"
                passwordHash = "ShouldNotWork123!"
                roleId = [long]$employeeRole.roleId
                enabled = $true
            } | Out-Null
        }

        # Employee cannot write attendance/employee-projects because SecurityConfig blocks those methods.
        if ($null -ne $script:Created.AttendanceId) {
            Test-Api "Employee cannot update attendance" PUT "/api/attendance/$($script:Created.AttendanceId)" 403 $employeeHeaders @{
                employeeId = $employee.EmployeeId
                attendanceDate = (Get-Date).Date.ToString("yyyy-MM-dd")
                status = "PRESENT"
            } | Out-Null
        }

        if ($null -ne $script:Created.EmployeeId -and $null -ne $script:Created.ProjectId) {
            Test-Api "Employee cannot update another employee project assignment" PUT "/api/employee-projects/$($script:Created.EmployeeId)/$($script:Created.ProjectId)" 403 $employeeHeaders @{
                employeeId = $script:Created.EmployeeId
                projectId = $script:Created.ProjectId
                assignedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                roleInProject = "Should not work"
            } | Out-Null
        }

        # Employee leave request ownership/creation is explicitly supported.
        $employeeLeave = Test-Api "Employee creates own leave request" POST "/api/leave-requests" 200 $employeeHeaders @{
            employeeId = 999999999
            startDate = (Get-Date).Date.AddDays(20).ToString("yyyy-MM-dd")
            endDate = (Get-Date).Date.AddDays(21).ToString("yyyy-MM-dd")
            reason = "Employee smoke-test leave"
            status = "APPROVED"
            approvedBy = 123456789
        }

        if ($employeeLeave.StatusCode -eq 200) {
            $employeeLeaveJson = Test-ResponseJson "Employee leave forces own employee and PENDING" $employeeLeave {
                param($body)
                return [long]$body.employeeId -eq $employee.EmployeeId -and $body.status -eq "PENDING" -and $null -eq $body.approvedBy
            }
            $employeeLeaveId = if ($null -ne $employeeLeaveJson) { [long]$employeeLeaveJson.leaveId } else { $null }

            if ($null -ne $employeeLeaveId) {
                Test-Api "Employee updates own pending leave" PUT "/api/leave-requests/$employeeLeaveId" 200 $employeeHeaders @{
                    employeeId = 999999999
                    startDate = (Get-Date).Date.AddDays(21).ToString("yyyy-MM-dd")
                    endDate = (Get-Date).Date.AddDays(22).ToString("yyyy-MM-dd")
                    reason = "Employee smoke-test leave updated"
                    status = "APPROVED"
                    approvedBy = 123456789
                } | Out-Null

                # The service deliberately forces EMPLOYEE updates back to PENDING.
                # Therefore the employee is still allowed to delete this own leave request.
                $employeeLeaveDelete = Test-Api "Employee deletes own pending leave" DELETE "/api/leave-requests/$employeeLeaveId" 204 $employeeHeaders
                if ($employeeLeaveDelete.StatusCode -eq 204) {
                    $employeeLeaveId = $null
                }
            }
        }

        # If the temporary admin-created leave is still pending, employee must be blocked from it because it is not theirs.
        if ($null -ne $script:Created.LeaveId) {
            Test-Api "Employee cannot read admin-created leave belonging to another employee" GET "/api/leave-requests/$($script:Created.LeaveId)" 403 $employeeHeaders | Out-Null
        }
    }

    # ------------------------------------------------------------
    # AUDIT LOG BEHAVIOR
    # Verify system-generated audit logging is actually occurring.
    # ------------------------------------------------------------
    Write-Section "AUDIT LOG BEHAVIOR"

    $auditListAfterCrud = Test-Api "Read audit logs after CRUD activity" GET "/api/audit-logs" 200 $adminHeaders
    if ($auditListAfterCrud.StatusCode -eq 200 -and $null -ne $script:Created.EmployeeId) {
        $auditArray = Test-ResponseJson "Audit logs response is an array" $auditListAfterCrud {
            param($body)
            return $body -is [System.Array]
        }

        if ($null -ne $auditArray) {
            $employeeAuditRecords = @($auditArray | Where-Object {
                [string]$_.entityName -eq "Employee" -and $null -ne $_.entityId -and [long]$_.entityId -eq $script:Created.EmployeeId
            })
            Assert-Condition "Employee CRUD generated audit records" ($employeeAuditRecords.Count -ge 1) "No audit record was found for temporary employee $($script:Created.EmployeeId)"

            if ($null -ne $script:Created.LeaveId) {
                $leaveAuditRecords = @($auditArray | Where-Object {
                    [string]$_.entityName -eq "LeaveRequest" -and $null -ne $_.entityId -and [long]$_.entityId -eq $script:Created.LeaveId
                })
                Assert-Condition "Leave CRUD generated audit records" ($leaveAuditRecords.Count -ge 1) "No audit record was found for temporary leave $($script:Created.LeaveId)"
            }
        }
    }

    # ------------------------------------------------------------
    # ADMIN DELETE CONTRACTS
    # Each delete is a real CRUD assertion. Cleanup below is only the
    # emergency/failure-path fallback.
    # ------------------------------------------------------------
    Write-Section "ADMIN DELETE CONTRACTS"

    if ($null -ne $script:Created.AuditId) {
        $r = Test-Api "Delete temporary audit log" DELETE "/api/audit-logs/$($script:Created.AuditId)" 204 $adminHeaders
        if ($r.StatusCode -eq 204) {
            Test-Api "Deleted audit log is no longer readable" GET "/api/audit-logs/$($script:Created.AuditId)" 404 $adminHeaders | Out-Null
            $script:Created.AuditId = $null
        }
    }

    if ($null -ne $script:Created.AttendanceId) {
        $r = Test-Api "Delete temporary attendance" DELETE "/api/attendance/$($script:Created.AttendanceId)" 204 $adminHeaders
        if ($r.StatusCode -eq 204) {
            Test-Api "Deleted attendance is no longer readable" GET "/api/attendance/$($script:Created.AttendanceId)" 404 $adminHeaders | Out-Null
            $script:Created.AttendanceId = $null
        }
    }

    if ($null -ne $script:Created.LeaveId) {
        $r = Test-Api "Delete temporary leave request" DELETE "/api/leave-requests/$($script:Created.LeaveId)" 204 $adminHeaders
        if ($r.StatusCode -eq 204) {
            Test-Api "Deleted leave request is no longer readable" GET "/api/leave-requests/$($script:Created.LeaveId)" 404 $adminHeaders | Out-Null
            $script:Created.LeaveId = $null
        }
    }

    if ($null -ne $script:Created.EmployeeId -and $null -ne $script:Created.ProjectId) {
        $r = Test-Api "Delete temporary employee-project assignment" DELETE "/api/employee-projects/$($script:Created.EmployeeId)/$($script:Created.ProjectId)" 204 $adminHeaders
        if ($r.StatusCode -eq 204) {
            Test-Api "Deleted assignment is no longer readable" GET "/api/employee-projects/$($script:Created.EmployeeId)/$($script:Created.ProjectId)" 404 $adminHeaders | Out-Null
        }
    }

    if ($null -ne $script:Created.UserId) {
        $r = Test-Api "Delete temporary user" DELETE "/api/users/$($script:Created.UserId)" 204 $adminHeaders
        if ($r.StatusCode -eq 204) {
            Test-Api "Deleted user is no longer readable" GET "/api/users/$($script:Created.UserId)" 404 $adminHeaders | Out-Null
            $script:Created.UserId = $null
        }
    }

    if ($null -ne $script:Created.EmployeeId) {
        $deletedEmployeeId = $script:Created.EmployeeId
        $r = Test-Api "Delete temporary employee" DELETE "/api/employees/$deletedEmployeeId" 204 $adminHeaders
        if ($r.StatusCode -eq 204) {
            Test-Api "Deleted employee is no longer readable" GET "/api/employees/$deletedEmployeeId" 404 $adminHeaders | Out-Null
            $script:Created.EmployeeId = $null
        }
    }

    if ($null -ne $script:Created.DesignationId) {
        # DesignationController returns void, so Spring MVC responds 200 for delete.
        $r = Test-Api "Delete temporary designation" DELETE "/api/designations/$($script:Created.DesignationId)" 200 $adminHeaders
        if ($r.StatusCode -eq 200) {
            $afterDelete = Test-Api "Deleted designation absent from department list" GET "/api/designations/department/$($script:Created.DepartmentId)" 200 $adminHeaders
            Test-ResponseJson "Deleted designation absent from department list" $afterDelete {
                param($body)
                return ($body | Where-Object { [long]$_.designationId -eq $script:Created.DesignationId }).Count -eq 0
            } | Out-Null
            $script:Created.DesignationId = $null
        }
    }

    if ($null -ne $script:Created.DepartmentId) {
        $r = Test-Api "Delete temporary department" DELETE "/api/departments/$($script:Created.DepartmentId)" 204 $adminHeaders
        if ($r.StatusCode -eq 204) {
            Test-Api "Deleted department is no longer readable" GET "/api/departments/$($script:Created.DepartmentId)" 404 $adminHeaders | Out-Null
            $script:Created.DepartmentId = $null
        }
    }

    if ($null -ne $script:Created.ProjectId) {
        $r = Test-Api "Delete temporary project" DELETE "/api/projects/$($script:Created.ProjectId)" 204 $adminHeaders
        if ($r.StatusCode -eq 204) {
            Test-Api "Deleted project is no longer readable" GET "/api/projects/$($script:Created.ProjectId)" 404 $adminHeaders | Out-Null
            $script:Created.ProjectId = $null
        }
    }

    # ------------------------------------------------------------
    # NEGATIVE VALIDATION CHECKS
    # ------------------------------------------------------------
    Write-Section "NEGATIVE VALIDATION CHECKS"

    Test-Api "Invalid role payload is rejected" POST "/api/roles" 400 $adminHeaders @{ roleName = "" } | Out-Null
    # Use a real, pre-existing employee so the 400 result tests the enum/validation
    # itself rather than failing because the employeeId is invalid or missing.
    $validationEmployee = if ($null -ne $employee.EmployeeId) { $employee.EmployeeId } elseif ($existingEmployees.Count -gt 0) { [long]$existingEmployees[0].employeeId } else { $null }
    if ($null -ne $validationEmployee) {
        Test-Api "Invalid attendance status is rejected" POST "/api/attendance" 400 $adminHeaders @{
            employeeId = $validationEmployee
            attendanceDate = (Get-Date).Date.ToString("yyyy-MM-dd")
            status = "NOT_A_STATUS"
        } | Out-Null
        Test-Api "Invalid leave status is rejected" POST "/api/leave-requests" 400 $adminHeaders @{
            employeeId = $validationEmployee
            startDate = (Get-Date).Date.AddDays(30).ToString("yyyy-MM-dd")
            endDate = (Get-Date).Date.AddDays(31).ToString("yyyy-MM-dd")
            reason = "Invalid smoke-test leave"
            status = "NOT_A_STATUS"
        } | Out-Null
    } else {
        Assert-Condition "Negative validation setup has a real employee" $false "No existing employee is available to perform validation tests safely" | Out-Null
    }

}
catch {
    Write-Host "`n[FAIL] Fatal smoke-test error -> $($_.Exception.Message)" -ForegroundColor Red
    $script:Failed++
}
finally {
    # ------------------------------------------------------------
    # CLEANUP - reverse dependency order
    # ------------------------------------------------------------
    Write-Section "CLEANUP"

    # Temporary audit log created directly by this script.
    if ($null -ne $script:Created.AuditId) {
        Cleanup-Api "Delete temporary audit log" DELETE "/api/audit-logs/$($script:Created.AuditId)" $adminHeaders
    }

    if ($null -ne $script:Created.AttendanceId) {
        Cleanup-Api "Delete temporary attendance" DELETE "/api/attendance/$($script:Created.AttendanceId)" $adminHeaders
    }

    if ($null -ne $script:Created.LeaveId) {
        Cleanup-Api "Delete temporary admin-created leave" DELETE "/api/leave-requests/$($script:Created.LeaveId)" $adminHeaders
    }

    if ($null -ne $script:Created.EmployeeId -and $null -ne $script:Created.ProjectId) {
        Cleanup-Api "Delete temporary employee-project assignment" DELETE "/api/employee-projects/$($script:Created.EmployeeId)/$($script:Created.ProjectId)" $adminHeaders
    }

    if ($null -ne $script:Created.UserId) {
        Cleanup-Api "Delete temporary user" DELETE "/api/users/$($script:Created.UserId)" $adminHeaders
    }

    if ($null -ne $script:Created.EmployeeId) {
        Cleanup-Api "Delete temporary employee" DELETE "/api/employees/$($script:Created.EmployeeId)" $adminHeaders
    }

    if ($null -ne $script:Created.DesignationId) {
        Cleanup-Api "Delete temporary designation" DELETE "/api/designations/$($script:Created.DesignationId)" $adminHeaders
    }

    if ($null -ne $script:Created.DepartmentId) {
        Cleanup-Api "Delete temporary department" DELETE "/api/departments/$($script:Created.DepartmentId)" $adminHeaders
    }

    if ($null -ne $script:Created.ProjectId) {
        Cleanup-Api "Delete temporary project" DELETE "/api/projects/$($script:Created.ProjectId)" $adminHeaders
    }

    if ($null -ne $script:Created.RoleId) {
        Cleanup-Api "Delete temporary role" DELETE "/api/roles/$($script:Created.RoleId)" $adminHeaders
    }

    # Remove direct test-created audit log reference only; system-generated audit logs
    # intentionally remain because those are production behavior under test.
    Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Passed:  $script:Passed" -ForegroundColor Green
    Write-Host "Failed:  $script:Failed" -ForegroundColor Red
    Write-Host "Skipped: $script:Skipped" -ForegroundColor DarkYellow
    Write-Host "Cleanup failures: $script:CleanupFailures" -ForegroundColor $(if ($script:CleanupFailures -eq 0) { "Green" } else { "Red" })

    if ($script:Failed -gt 0 -or $script:CleanupFailures -gt 0) {
        exit 1
    }

    exit 0
}
