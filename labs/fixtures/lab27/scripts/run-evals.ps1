<#
.SYNOPSIS
  Lab 27 live run: run one named Vally suite against a real model, then price the run.

.DESCRIPTION
  THIS IS A LIVE RUN. It calls a real model through the Copilot SDK and spends AIU.
  Everything that needs no model lives in tier0.ps1; run that first.

  Accepts the same flags as run-evals.sh, in either spelling:

    --suite <pr-gate|full|pr-gate-guards|full-guards>   (default: pr-gate)   or  -Suite <name>
    --model <model>   a model ID to evaluate instead of the one each eval spec pins   or  -Model <id>

  What it does
    1. Refuses to run unless the vally on PATH is the version pinned by vally_cli_version in
       docs/_meta/registry.yaml (eval specs are version-specific, so a different CLI would
       judge them by different rules).
    2. Runs   vally eval --suite <suite> --require-pass
                         --output-dir "$Lab27Dir/vally-results"
                         --param "RUN_DIR=$Lab27Dir/vally-results"
       Vally creates a <timestamp> directory inside --output-dir for the run. Program graders
       execute with their working directory inside a disposable copy of the workspace, so they
       cannot find that directory unless it is handed to them: RUN_DIR is the absolute path that
       guarded-commands.cjs walks (newest <timestamp> only) to find events.jsonl.
    3. Finds the newest <timestamp> directory and runs eval-cost.cjs on its results.jsonl, so the
       run's root-only AIU is checked against the budget ceiling.
    4. Exits non-zero if the eval verdict OR the cost check failed.

  Works in Windows PowerShell 5.1 and PowerShell 7. Run from anywhere:

    powershell -NoProfile -ExecutionPolicy Bypass -File labs/fixtures/lab27/scripts/run-evals.ps1 --suite pr-gate
#>
[CmdletBinding(PositionalBinding = $false)]
param(
    [string]$Suite = "pr-gate",
    [string]$Model = "",
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Rest
)

$ErrorActionPreference = "Stop"
# Vally's CLI usage telemetry is separate from evaluation tracing; opt out of it for scripted runs.
$env:VALLY_TELEMETRY_OPTOUT = "1"

function Show-Usage {
    Write-Host "Usage: run-evals.ps1 [--suite <pr-gate|full|pr-gate-guards|full-guards>] [--model <model>]"
    Write-Host "  --suite   named suite from .vally.yaml (default: pr-gate)"
    Write-Host "  --model   model ID to evaluate instead of the one each eval spec pins"
    Write-Host "This is a LIVE run: it calls a real model and spends AIU. tier0.ps1 spends none."
}

function Fail([string]$Message, [int]$Code = 1) {
    Write-Host "run-evals: FAILED - $Message" -ForegroundColor Red
    exit $Code
}

# Accept the bash-style --suite / --model spellings as well as the native -Suite / -Model ones.
$tokens = @()
if ($Rest) { $tokens = @($Rest) }
$i = 0
while ($i -lt $tokens.Count) {
    $token = $tokens[$i]
    if ($token -eq "--suite" -or $token -eq "--model") {
        if ($i + 1 -ge $tokens.Count) { Show-Usage; exit 2 }
        if ($token -eq "--suite") { $Suite = $tokens[$i + 1] } else { $Model = $tokens[$i + 1] }
        $i += 2
    }
    elseif ($token -eq "-h" -or $token -eq "--help") {
        Show-Usage
        exit 0
    }
    else {
        Write-Host "run-evals: unknown argument '$token'"
        Show-Usage
        exit 2
    }
}

if (@("pr-gate", "full", "pr-gate-guards", "full-guards") -notcontains $Suite) {
    Write-Host "run-evals: unknown suite '$Suite' (expected pr-gate, full, pr-gate-guards or full-guards)"
    exit 2
}

# Resolve paths from the script location so the caller's working directory does not matter.
$Lab27Dir = Split-Path -Parent $PSScriptRoot
$RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $Lab27Dir))
$Registry = Join-Path (Join-Path $RepoRoot "docs") (Join-Path "_meta" "registry.yaml")
$ResultsDir = Join-Path $Lab27Dir "vally-results"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "node was not found on PATH (Vally needs Node 22.15 or newer)."
}

$pinned = $null
if (Test-Path $Registry) {
    $match = Select-String -Path $Registry -Pattern '^vally_cli_version:\s*"([^"]+)"' | Select-Object -First 1
    if ($match) { $pinned = $match.Matches[0].Groups[1].Value }
}
if (-not $pinned) { Fail "vally_cli_version was not found in docs/_meta/registry.yaml." }

if (-not (Get-Command vally -ErrorAction SilentlyContinue)) {
    Fail "vally is not on PATH. Install the pinned version: npm install -g @microsoft/vally-cli@$pinned (Node 22.15 or newer)."
}
$installed = $null
try { $installed = (& vally --version 2>$null | Select-Object -First 1) } catch { $installed = $null }
if ($null -ne $installed) { $installed = "$installed".Trim() }
if ($installed -ne $pinned) {
    $shown = $installed
    if (-not $shown) { $shown = "no version" }
    Fail "the vally on PATH reports '$shown' but docs/_meta/registry.yaml pins $pinned. Install the pinned version: npm install -g @microsoft/vally-cli@$pinned"
}

$modelNote = ""
if ($Model) { $modelNote = " on model '$Model'" }
Write-Host "run-evals: LIVE run of suite '$Suite'$modelNote - this calls a real model and spends AIU."
Write-Host "run-evals: results go to $ResultsDir"
if (-not (Test-Path $ResultsDir)) { New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null }

# Vally names each run directory with an ISO-like timestamp, so the lexically greatest name is the newest.
function Get-NewestRunDir([string]$Dir) {
    if (-not (Test-Path $Dir)) { return $null }
    Get-ChildItem -Path $Dir -Directory |
        Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}T' } |
        Sort-Object -Property Name |
        Select-Object -Last 1
}

# Remember the newest directory from an earlier run: if vally dies before writing a new one, an old
# run must not be priced and reported as this run's result.
$before = Get-NewestRunDir $ResultsDir

$evalRc = 0
$costRc = 0
Push-Location $Lab27Dir
try {
    $vallyArgs = @("eval", "--suite", $Suite, "--require-pass", "--output-dir", $ResultsDir, "--param", "RUN_DIR=$ResultsDir")
    if ($Model) { $vallyArgs += @("--model", $Model) }
    & vally @vallyArgs
    $evalRc = $LASTEXITCODE

    $newest = Get-NewestRunDir $ResultsDir
    $isNew = $false
    if ($newest) {
        if (-not $before) { $isNew = $true } elseif ($newest.Name -ne $before.Name) { $isNew = $true }
    }

    $resultsFile = $null
    if ($isNew) { $resultsFile = Join-Path $newest.FullName "results.jsonl" }
    if ($resultsFile -and (Test-Path $resultsFile)) {
        Write-Host ""
        Write-Host "== Root-only AIU for $($newest.Name) =="
        node evals/graders/eval-cost.cjs $resultsFile
        $costRc = $LASTEXITCODE
    }
    else {
        Write-Host "run-evals: this run wrote no new <timestamp>/results.jsonl under $ResultsDir, so the cost check could not run (older runs are never priced as this one)."
        $costRc = 1
    }
}
finally {
    Pop-Location
}

Write-Host ""
if ($evalRc -ne 0) {
    Fail "vally eval exited with code $evalRc (cost check exit code: $costRc)." $evalRc
}
if ($costRc -ne 0) {
    Fail "the eval verdict passed but the cost check exited with code $costRc." $costRc
}
Write-Host "run-evals: OK - suite '$Suite' passed and the run is within the AIU budget."
exit 0
