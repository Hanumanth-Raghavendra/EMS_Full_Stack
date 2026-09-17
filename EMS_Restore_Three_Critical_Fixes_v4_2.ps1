$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRoot = 'C:\EMS_Main'
$BackupRoot = Join-Path $ProjectRoot 'EMS_Backups'

$backup = Get-ChildItem -LiteralPath $BackupRoot -Filter 'EMS_PreFix_CriticalFixes_v4.2_*.zip' -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if ($null -eq $backup) {
    throw "No v4.2 restore ZIP was found in $BackupRoot."
}

$files = @(
    'hr-service\src\main\java\com\example\hr_service\controller\DepartmentController.java'
    'hr-service\src\main\java\com\example\hr_service\repository\ProjectRepository.java'
    'hr-service\src\main\java\com\example\hr_service\repository\EmployeeRepository.java'
    'hr-service\src\main\java\com\example\hr_service\service\ProjectServiceImpl.java'
    'hr-service\src\main\java\com\example\hr_service\service\EmployeeServiceImpl.java'
)

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$temp = Join-Path $BackupRoot "_manual_restore_v4.2_$timestamp"
New-Item -ItemType Directory -Path $temp -Force | Out-Null

try {
    Expand-Archive -LiteralPath $backup.FullName -DestinationPath $temp -Force

    foreach ($relative in $files) {
        $src = Join-Path $temp $relative
        $dst = Join-Path $ProjectRoot $relative
        if (-not (Test-Path -LiteralPath $src -PathType Leaf)) {
            throw "Backup is missing: $relative"
        }
        New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force | Out-Null
        Copy-Item -LiteralPath $src -Destination $dst -Force
    }

    Write-Host "RESTORE COMPLETE from: $($backup.FullName)" -ForegroundColor Green
}
finally {
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
}
