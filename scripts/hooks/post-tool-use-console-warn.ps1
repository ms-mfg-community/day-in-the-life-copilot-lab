# post-tool-use-console-warn.ps1 — Warn about console.log in edited files
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs, toolResult }

$ErrorActionPreference = "Stop"
$Input = $input | Out-String | ConvertFrom-Json

$ToolName = if ($Input.toolName) { $Input.toolName } else { "" }
$ToolArgs = if ($Input.toolArgs) { $Input.toolArgs } else { "" }

if ($ToolName -ne "edit" -and $ToolName -ne "create" -and $ToolName -ne "write") {
    exit 0
}

try {
    $ArgsObj = $ToolArgs | ConvertFrom-Json
    $FilePath = if ($ArgsObj.file_path) { $ArgsObj.file_path } elseif ($ArgsObj.path) { $ArgsObj.path } else { "" }
} catch {
    exit 0
}

if (-not $FilePath) { exit 0 }

if ($FilePath -match '\.(js|jsx|ts|tsx|mjs|cjs)$') {
    if (Test-Path $FilePath) {
        $Count = (Select-String -Path $FilePath -Pattern 'console\.log' -AllMatches | Measure-Object).Count
        if ($Count -gt 0) {
            Write-Warning "$Count console.log statement(s) found in $FilePath. Remove before committing."
        }
    }
}

exit 0
