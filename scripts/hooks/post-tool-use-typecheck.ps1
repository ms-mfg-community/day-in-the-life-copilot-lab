# post-tool-use-typecheck.ps1 — Run TypeScript type check after editing .ts/.tsx files
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs, toolResult }

$ErrorActionPreference = "Stop"
$Input = $input | Out-String | ConvertFrom-Json

$ToolName = if ($Input.toolName) { $Input.toolName } else { "" }
$ToolArgs = if ($Input.toolArgs) { $Input.toolArgs } else { "" }
$Cwd = if ($Input.cwd) { $Input.cwd } else { "." }

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

if ($FilePath -match '\.(ts|tsx)$') {
    $TsConfig = Join-Path $Cwd "tsconfig.json"
    if (Test-Path $TsConfig) {
        try {
            $Output = & npx --no-install tsc --noEmit 2>&1 | Select-Object -First 20
            if ($Output) { Write-Output $Output }
        } catch {
            # tsc not available — skip
        }
    }
}

exit 0
