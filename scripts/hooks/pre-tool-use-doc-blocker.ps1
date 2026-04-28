# pre-tool-use-doc-blocker.ps1 — Block creation of unnecessary documentation files
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs }

$ErrorActionPreference = "Stop"
$Input = $input | Out-String | ConvertFrom-Json

$ToolName = if ($Input.toolName) { $Input.toolName } else { "" }
$ToolArgs = if ($Input.toolArgs) { $Input.toolArgs } else { "" }

# Only check file creation tools
if ($ToolName -ne "create" -and $ToolName -ne "edit" -and $ToolName -ne "write") {
    exit 0
}

try {
    $ArgsObj = $ToolArgs | ConvertFrom-Json
    $FilePath = if ($ArgsObj.file_path) { $ArgsObj.file_path } elseif ($ArgsObj.path) { $ArgsObj.path } else { "" }
} catch {
    exit 0
}

if (-not $FilePath) { exit 0 }

# Allow documentation in these paths
$AllowedPatterns = @("docs/", ".github/", "labs/", "solutions/", "AGENTS.md", "README.md", "CHANGELOG.md", "LICENSE", "CONTRIBUTING.md")

if ($FilePath -match '\.(md|txt)$') {
    $IsAllowed = $false
    foreach ($Pattern in $AllowedPatterns) {
        if ($FilePath -match [regex]::Escape($Pattern)) {
            $IsAllowed = $true
            break
        }
    }
    if (-not $IsAllowed -and -not (Test-Path $FilePath)) {
        Write-Output '{"permissionDecision":"deny","permissionDecisionReason":"Creating documentation files outside of docs/ or .github/ is blocked."}'
        exit 0
    }
}

exit 0
