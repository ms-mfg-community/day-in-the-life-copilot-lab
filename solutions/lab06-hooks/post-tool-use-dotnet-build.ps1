# post-tool-use-dotnet-build.ps1 — Verify .NET build after Copilot edits a C# file.
#
# Copilot CLI 1.0.37 hook IPC contract (per binary inspection of SJt/EJt):
#   - Event payload arrives as JSON on STDIN, NOT in env vars.
#   - Only COPILOT_PROJECT_DIR and CLAUDE_PROJECT_DIR are exported to the child.
#   - $env:TOOL_NAME / $env:FILE_PATH are NEVER set — older docs are wrong.
#
# postToolUse payload shape:
#   { sessionId, timestamp, cwd, toolName, toolArgs (parsed object),
#     toolResult: @{ resultType; textResultForLlm } }

$ErrorActionPreference = "Stop"

$Event = ($input | Out-String) | ConvertFrom-Json

$ToolName = if ($Event.toolName) { $Event.toolName } else { "" }
$Cwd      = if ($Event.cwd)      { $Event.cwd }      else { "." }
$FilePath = ""
if ($Event.toolArgs) {
    if     ($Event.toolArgs.file_path) { $FilePath = $Event.toolArgs.file_path }
    elseif ($Event.toolArgs.path)      { $FilePath = $Event.toolArgs.path }
}

if ($ToolName -ne "edit" -and $ToolName -ne "create" -and $ToolName -ne "write") {
    exit 0
}

if ($FilePath -notmatch '\.(cs|csproj|cshtml)$') {
    exit 0
}

$ProjectDir = if ($env:CLAUDE_PROJECT_DIR)  { $env:CLAUDE_PROJECT_DIR }
              elseif ($env:COPILOT_PROJECT_DIR) { $env:COPILOT_PROJECT_DIR }
              else { $Cwd }
$Solution = Join-Path $ProjectDir "dotnet/ContosoUniversity.sln"

$Output = dotnet build $Solution --nologo --verbosity quiet 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  BUILD FAILED after editing $FilePath"
    Write-Host ""
    $Output | Select-Object -Last 20 | Write-Host
    Write-Host ""
    Write-Host "Fix the build errors before continuing."
    exit 1
}

Write-Host "✅ Build succeeded after editing $FilePath"
exit 0
