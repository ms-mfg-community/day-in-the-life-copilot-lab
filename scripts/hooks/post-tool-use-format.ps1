# post-tool-use-format.ps1 — Auto-format JS/TS files after edit with Prettier
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

if ($FilePath -match '\.(js|jsx|ts|tsx|mjs|cjs)$') {
    $PrettierPath = Join-Path $Cwd "node_modules/.bin/prettier"
    if (Test-Path $PrettierPath) {
        try {
            & npx --no-install prettier --write $FilePath 2>$null
        } catch {
            # Prettier not available — skip
        }
    }
}

exit 0
