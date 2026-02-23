# error-occurred.ps1 — Log errors with context for debugging
# Input: JSON via stdin with { timestamp, cwd, error: { message, name, stack } }

$ErrorActionPreference = "Stop"
$Input = $input | Out-String | ConvertFrom-Json

$Cwd = if ($Input.cwd) { $Input.cwd } else { "." }
$ErrorMsg = if ($Input.error.message) { $Input.error.message } else { "unknown error" }
$ErrorName = if ($Input.error.name) { $Input.error.name } else { "Error" }

$LogDir = Join-Path $Cwd ".github/logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
Add-Content -Path (Join-Path $LogDir "errors.log") -Value "[$Timestamp] ${ErrorName}: ${ErrorMsg}"
