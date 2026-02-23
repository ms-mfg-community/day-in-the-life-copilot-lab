# pre-tool-use-secret-scan.ps1 — Block commits containing hardcoded secrets
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs }

$ErrorActionPreference = "Stop"
$Input = $input | Out-String | ConvertFrom-Json

$ToolName = if ($Input.toolName) { $Input.toolName } else { "" }
$ToolArgs = if ($Input.toolArgs) { $Input.toolArgs } else { "" }

# Only check file write/create operations
if ($ToolName -ne "create" -and $ToolName -ne "edit" -and $ToolName -ne "write") {
    exit 0
}

try {
    $ArgsObj = $ToolArgs | ConvertFrom-Json
    $Content = if ($ArgsObj.content) { $ArgsObj.content } elseif ($ArgsObj.new_string) { $ArgsObj.new_string } else { "" }
} catch {
    exit 0
}

if (-not $Content) { exit 0 }

# Scan for common secret patterns
$SecretPatterns = @(
    'sk-[a-zA-Z0-9]{20,}',
    'AKIA[0-9A-Z]{16}',
    'ghp_[a-zA-Z0-9]{36}',
    '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----',
    'password\s*=\s*["\x27][^"\x27]{8,}',
    'api[_-]?key\s*=\s*["\x27][^"\x27]{8,}'
)

foreach ($Pattern in $SecretPatterns) {
    if ($Content -match $Pattern) {
        Write-Output '{"permissionDecision":"deny","permissionDecisionReason":"Potential secret or credential detected. Use environment variables instead."}'
        exit 0
    }
}

exit 0
