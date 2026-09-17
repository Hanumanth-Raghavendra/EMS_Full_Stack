$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRoot = 'C:\EMS_Main'
$BackendRoot = Join-Path $ProjectRoot 'hr-service'
$FrontendRoot = Join-Path $ProjectRoot 'hr-frontend'
$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PatchRoot = Join-Path $PackageRoot 'PatchFiles'
$BackupRoot = Join-Path $ProjectRoot 'EMS_Backups'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$BackupDir = Join-Path $BackupRoot "EMS_PreFix_CriticalFixes_v4.2_$Stamp"
$BackupZip = "$BackupDir.zip"

$Targets = [ordered]@{
    'hr-service\src\main\java\com\example\hr_service\controller\DepartmentController.java' = @{
        baseline = 'c2f51cfd46368de37a62f935163bb8ad88916861f4014a2fca9ee94de373f3fa'
        patched  = '88e88f0d6bc44a7f11322d72a71350453bb2b4b59dc037178804c3b50dff2b25'
    }
    'hr-service\src\main\java\com\example\hr_service\repository\ProjectRepository.java' = @{
        baseline = '508636b784e1ac882c691b9b5374dc7902537388bc70b88364bc6aa954281ddd'
        patched  = 'ee6ef66e320b489f6d4a5d0922e6e23c6bccb9940c78ebf289f30357bfc1a52f'
    }
    'hr-service\src\main\java\com\example\hr_service\repository\EmployeeRepository.java' = @{
        baseline = '1c8fc7a142d1525d72ce4c118b5eb2148fa57a8818a5807c518af5c7adaed291'
        patched  = '072ad0ed791cf467660bb7fcd4783e6a5e9b11433c84b5c3493ceec0c0547f37'
    }
    'hr-service\src\main\java\com\example\hr_service\service\ProjectServiceImpl.java' = @{
        baseline = '9a39225465497171ab4fbc0338ff90ca9c0f9bc54b60bce7ea772181bb67cd37'
        patched  = '98fa9aba347a775f716346d5b633b9ef1bbff7040921af00fbe8e0f7c75afca2'
    }
    'hr-service\src\main\java\com\example\hr_service\service\EmployeeServiceImpl.java' = @{
        baseline = 'a12ceef4a72c5bce4d939e2f3d30678dd2dcb04801da17ec4a5bbde9f3396319'
        patched  = 'a4c1cea94b665a46bee142bfc33ab633ef2a2831fa503cfd35fdac3c3d8bae2c'
    }
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Assert-File([string]$Path, [string]$Label) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Missing required file: $Label -> $Path"
    }
}

function Restore-FromBackup {
    param([string]$StageDir)
    foreach ($relative in $Targets.Keys) {
        $src = Join-Path $StageDir $relative
        $dst = Join-Path $ProjectRoot $relative
        $parent = Split-Path -Parent $dst
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
        Copy-Item -LiteralPath $src -Destination $dst -Force
    }
}

Write-Host '=== GUARDED EMS FIX v4.2 ===' -ForegroundColor Cyan
Write-Host 'Exactly three targeted fixes.'
Write-Host 'Nothing is written until every baseline SHA-256 matches.'
Write-Host 'If any verification/test fails after the write, the five source files are restored automatically.'
Write-Host ''

$stageDir = Join-Path $BackupDir 'source'
$backupCreated = $false
$patchStarted = $false

try {
    Write-Host '[1/5] Verifying exact current source and patch package...' -ForegroundColor Yellow
    foreach ($relative in $Targets.Keys) {
        $target = Join-Path $ProjectRoot $relative
        Assert-File $target $relative
        $actual = Get-Sha256 $target
        $expected = $Targets[$relative].baseline
        if ($actual -ne $expected) {
            throw "Baseline SHA-256 mismatch for $relative. Expected $expected but found $actual. No source files were changed."
        }

        $patchRelative = $relative -replace '^hr-service\\src\\main\\java\\com\\example\\hr_service\\', ''
        $patch = Join-Path $PatchRoot $patchRelative
        Assert-File $patch "patch for $relative"
        $patchedHash = Get-Sha256 $patch
        $expectedPatched = $Targets[$relative].patched
        if ($patchedHash -ne $expectedPatched) {
            throw "Patch SHA-256 mismatch for $patchRelative. Expected $expectedPatched but found $patchedHash. No source files were changed."
        }
    }
    Write-Host '      Baseline and patch package verified.' -ForegroundColor Green

    Write-Host '[2/5] Creating exact restore point...' -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $stageDir -Force | Out-Null
    foreach ($relative in $Targets.Keys) {
        $src = Join-Path $ProjectRoot $relative
        $dst = Join-Path $stageDir $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force | Out-Null
        Copy-Item -LiteralPath $src -Destination $dst -Force
    }
    Compress-Archive -Path (Join-Path $stageDir '*') -DestinationPath $BackupZip -Force
    Remove-Item -LiteralPath $stageDir -Recurse -Force
    $backupCreated = $true
    Write-Host "      Restore point: $BackupZip" -ForegroundColor Green

    Write-Host '[3/5] Applying exactly five source-file updates...' -ForegroundColor Yellow
    $patchStarted = $true
    foreach ($relative in $Targets.Keys) {
        $target = Join-Path $ProjectRoot $relative
        $patchRelative = $relative -replace '^hr-service\\src\\main\\java\\com\\example\\hr_service\\', ''
        $patch = Join-Path $PatchRoot $patchRelative
        Assert-File $patch "patch for $relative"
        Copy-Item -LiteralPath $patch -Destination $target -Force
    }
    Write-Host '      Verifying patched hashes...' -ForegroundColor Yellow
    foreach ($relative in $Targets.Keys) {
        $target = Join-Path $ProjectRoot $relative
        $actual = Get-Sha256 $target
        $expected = $Targets[$relative].patched
        if ($actual -ne $expected) {
            throw "Patched SHA-256 mismatch for $relative. Expected $expected but found $actual."
        }
    }
    Write-Host '      Patch contents verified.' -ForegroundColor Green

    Write-Host '[4/5] Running backend tests...' -ForegroundColor Yellow
    Push-Location $BackendRoot
    try {
        $mvnw = Join-Path $BackendRoot 'mvnw.cmd'
        if (-not (Test-Path -LiteralPath $mvnw -PathType Leaf)) {
            throw "Maven Wrapper not found: $mvnw"
        }
        & $mvnw test
        if ($LASTEXITCODE -ne 0) {
            throw "Backend tests failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
    Write-Host '      Backend tests passed.' -ForegroundColor Green

    Write-Host '[5/5] Running frontend tests and production build...' -ForegroundColor Yellow
    Push-Location $FrontendRoot
    try {
        & npm run test:run
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend tests failed with exit code $LASTEXITCODE."
        }
        & npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend production build failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
    Write-Host '      Frontend tests and build passed.' -ForegroundColor Green

    Write-Host ''
    Write-Host '=== GUARDED APPLY PASSED ===' -ForegroundColor Green
    Write-Host 'Only the three targeted fixes remain applied.'
    Write-Host "Restore point: $BackupZip"
    Write-Host ''
    Write-Host 'Next: restart the backend, then run your full CRUD regression script.' -ForegroundColor Cyan
    exit 0
}
catch {
    Write-Host ''
    Write-Host 'VERIFICATION/APPLY FAILED.' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($patchStarted -and $backupCreated) {
        Write-Host 'Restoring the exact pre-fix source...' -ForegroundColor Yellow
        $restoreTemp = Join-Path $ProjectRoot "EMS_Backups\_restore_v4.2_$Stamp"
        try {
            New-Item -ItemType Directory -Path $restoreTemp -Force | Out-Null
            Expand-Archive -LiteralPath $BackupZip -DestinationPath $restoreTemp -Force
            Restore-FromBackup -StageDir $restoreTemp
            Remove-Item -LiteralPath $restoreTemp -Recurse -Force
            Write-Host 'RESTORE COMPLETE. No fix remains applied.' -ForegroundColor Green
        }
        catch {
            Write-Host 'AUTOMATIC RESTORE FAILED. DO NOT START THE APPLICATION. Use the manual restore script with the backup ZIP.' -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
    }
    else {
        Write-Host 'No source restore was necessary because no patch was applied.' -ForegroundColor Green
    }

    exit 1
}
