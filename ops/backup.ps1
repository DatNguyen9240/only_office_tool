param(
  [Parameter(Mandatory = $true)]
  [string]$Destination,
  [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$resolvedDestination = [System.IO.Path]::GetFullPath($Destination)
if (-not (Test-Path -LiteralPath $resolvedDestination)) {
  New-Item -ItemType Directory -Path $resolvedDestination | Out-Null
}

$requiredVariables = @(
  "DATABASE_URL",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "S3_BUCKET"
)
foreach ($variable in $requiredVariables) {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($variable))) {
    throw "Missing required environment variable: $variable"
  }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDirectory = Join-Path $resolvedDestination "meridian-$stamp"
New-Item -ItemType Directory -Path $backupDirectory | Out-Null

$databaseFile = Join-Path $backupDirectory "database.dump"
& pg_dump.exe --format=custom --no-owner --file=$databaseFile $env:DATABASE_URL
if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE"
}

$mcAlias = "meridian-backup"
& mc.exe alias set $mcAlias $env:S3_ENDPOINT $env:S3_ACCESS_KEY $env:S3_SECRET_KEY
if ($LASTEXITCODE -ne 0) {
  throw "MinIO client alias setup failed"
}
& mc.exe mirror "$mcAlias/$($env:S3_BUCKET)" (Join-Path $backupDirectory "objects")
if ($LASTEXITCODE -ne 0) {
  throw "MinIO object backup failed"
}

$manifest = @{
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  database = "database.dump"
  objects = "objects"
  bucket = $env:S3_BUCKET
} | ConvertTo-Json
Set-Content -LiteralPath (Join-Path $backupDirectory "manifest.json") -Value $manifest

$cutoff = (Get-Date).AddDays(-[Math]::Max($RetentionDays, 1))
Get-ChildItem -LiteralPath $resolvedDestination -Directory |
  Where-Object {
    $_.Name -like "meridian-*" -and
    $_.CreationTime -lt $cutoff -and
    [System.IO.Path]::GetFullPath($_.FullName).StartsWith(
      $resolvedDestination,
      [System.StringComparison]::OrdinalIgnoreCase
    )
  } |
  Remove-Item -Recurse -Force

Write-Output "Backup completed: $backupDirectory"
