param(
  [Parameter(Mandatory = $true)]
  [string]$BackupDirectory
)

$ErrorActionPreference = "Stop"
$resolvedBackup = [System.IO.Path]::GetFullPath($BackupDirectory)
$manifestPath = Join-Path $resolvedBackup "manifest.json"
$databaseFile = Join-Path $resolvedBackup "database.dump"
$objectsDirectory = Join-Path $resolvedBackup "objects"

if (-not (Test-Path -LiteralPath $manifestPath) -or
    -not (Test-Path -LiteralPath $databaseFile) -or
    -not (Test-Path -LiteralPath $objectsDirectory)) {
  throw "Backup directory is incomplete"
}
if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  throw "DATABASE_URL is required"
}

& pg_restore.exe --clean --if-exists --no-owner --dbname=$env:DATABASE_URL $databaseFile
if ($LASTEXITCODE -ne 0) {
  throw "pg_restore failed with exit code $LASTEXITCODE"
}

& mc.exe alias set meridian-restore $env:S3_ENDPOINT $env:S3_ACCESS_KEY $env:S3_SECRET_KEY
if ($LASTEXITCODE -ne 0) {
  throw "MinIO client alias setup failed"
}
& mc.exe mirror --overwrite $objectsDirectory "meridian-restore/$($env:S3_BUCKET)"
if ($LASTEXITCODE -ne 0) {
  throw "MinIO object restore failed"
}

Write-Output "Restore completed from: $resolvedBackup"
