# pre-tool-use-long-running.ps1 — Warn about long-running commands
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs }

$ErrorActionPreference = "Stop"
$Input = $input | Out-String | ConvertFrom-Json

$ToolName = if ($Input.toolName) { $Input.toolName } else { "" }
$ToolArgs = if ($Input.toolArgs) { $Input.toolArgs } else { "" }

# Only check bash/shell tool calls
if ($ToolName -ne "bash" -and $ToolName -ne "shell") {
    exit 0
}

$LongRunningPatterns = @(
    "npm install", "npm ci", "pnpm install", "yarn install", "bun install",
    "cargo build", "cargo test", "docker build", "docker compose",
    "pip install", "go build ./...", "go test ./..."
)

foreach ($Pattern in $LongRunningPatterns) {
    if ($ToolArgs -match [regex]::Escape($Pattern)) {
        Write-Warning "Long-running command detected. Consider running in a separate terminal or with a timeout."
        break
    }
}

exit 0
