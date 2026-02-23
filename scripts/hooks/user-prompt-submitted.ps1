# user-prompt-submitted.ps1 — Log user prompts for audit trail
# Input: JSON via stdin with { timestamp, cwd, prompt }

$ErrorActionPreference = "Stop"
$Input = $input | Out-String | ConvertFrom-Json

$Cwd = if ($Input.cwd) { $Input.cwd } else { "." }
$Prompt = if ($Input.prompt) { $Input.prompt } else { "" }

$LogDir = Join-Path $Cwd ".github/logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Truncate to 200 chars for privacy
$Truncated = if ($Prompt.Length -gt 200) { $Prompt.Substring(0, 200) } else { $Prompt }

$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
Add-Content -Path (Join-Path $LogDir "prompts.log") -Value "[$Timestamp] Prompt: $Truncated"
