<#
.SYNOPSIS
  Lab 27 Tier 0: every check that needs no model call, no credentials and no global install.

.DESCRIPTION
  Step 1  node evals/graders/self-check.cjs                      (Demo A)
  Step 2  node evals/graders/eval-cost.cjs <recorded results>    (Demo C)
  Step 3  vally lint + vally grade (Demo B), ONLY when the installed vally is the
          version pinned by vally_cli_version in docs/_meta/registry.yaml. Any other
          version, or no vally at all, skips this step with a note and still exits 0:
          eval specs are version-specific (the pinned release rejects an unknown
          stimulus field and requires lowercase kebab-case grader names), so a lint
          result from the wrong CLI would mislead more than it would help.

  Nothing here calls a model, so it spends 0 AIU. Works in Windows PowerShell 5.1
  and PowerShell 7. Run from anywhere:

    powershell -NoProfile -ExecutionPolicy Bypass -File labs/fixtures/lab27/scripts/tier0.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
# Vally's CLI usage telemetry is separate from evaluation tracing; opt out of it for scripted runs.
$env:VALLY_TELEMETRY_OPTOUT = "1"

$Lab27Dir = Split-Path -Parent $PSScriptRoot
$RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $Lab27Dir))
$Registry = Join-Path (Join-Path $RepoRoot "docs") (Join-Path "_meta" "registry.yaml")

function Fail([string]$Message, [int]$Code = 1) {
    Write-Host "tier0: FAILED - $Message" -ForegroundColor Red
    exit $Code
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "node was not found on PATH (Tier 0 needs Node 18 or newer)."
}

Push-Location $Lab27Dir
try {
    Write-Host "== Tier 0, step 1 of 3: grader self-check (Demo A) =="
    node evals/graders/self-check.cjs
    if ($LASTEXITCODE -ne 0) { Fail "self-check.cjs exited with code $LASTEXITCODE." $LASTEXITCODE }

    Write-Host ""
    Write-Host "== Tier 0, step 2 of 3: root-only AIU on the recorded fixture (Demo C) =="
    node evals/graders/eval-cost.cjs evals/fixtures/recorded-results.jsonl
    if ($LASTEXITCODE -ne 0) { Fail "eval-cost.cjs exited with code $LASTEXITCODE." $LASTEXITCODE }

    Write-Host ""
    Write-Host "== Tier 0, step 3 of 3: Vally CLI checks (only for the pinned version) =="
    $pinned = $null
    if (Test-Path $Registry) {
        $match = Select-String -Path $Registry -Pattern '^vally_cli_version:\s*"([^"]+)"' | Select-Object -First 1
        if ($match) { $pinned = $match.Matches[0].Groups[1].Value }
    }
    if (-not $pinned) { Fail "vally_cli_version was not found in docs/_meta/registry.yaml." }

    $vally = Get-Command vally -ErrorAction SilentlyContinue
    if (-not $vally) {
        Write-Host "SKIP: vally is not on PATH. To run lint and Demo B: npm install -g @microsoft/vally-cli@$pinned (Node 22.15 or newer), then run this script again."
    }
    else {
        $installed = $null
        try { $installed = (& vally --version 2>$null | Select-Object -First 1) } catch { $installed = $null }
        if ($null -ne $installed) { $installed = "$installed".Trim() }
        if ($installed -ne $pinned) {
            $shown = $installed
            if (-not $shown) { $shown = "no version" }
            Write-Host "SKIP: the vally on PATH reports '$shown' but docs/_meta/registry.yaml pins $pinned. Install the pinned version to run lint and Demo B: npm install -g @microsoft/vally-cli@$pinned"
        }
        else {
            foreach ($spec in @(
                "evals/hermetic/reviewer-routing/eval.yaml",
                "evals/hermetic/skill-triggers/eval.yaml",
                "evals/guards/no-unapproved-push/eval.yaml",
                "evals/guards/secret-scan-guard/eval.yaml"
            )) {
                vally lint -e $spec --strict
                if ($LASTEXITCODE -ne 0) { Fail "vally lint --strict rejected $spec." $LASTEXITCODE }
            }

            Write-Host ""
            Write-Host "Demo B: re-grade the recorded trajectories offline (the --workspace warning is expected: all 3 are graded against the same directory)"
            $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
            Get-Content -Raw -Encoding UTF8 (Join-Path $Lab27Dir "evals/fixtures/recorded-results.jsonl") |
                vally grade --eval-spec evals/hermetic/reviewer-routing/eval.yaml --workspace . --require-pass
            if ($LASTEXITCODE -ne 0) { Fail "vally grade --require-pass failed." $LASTEXITCODE }
        }
    }

    Write-Host ""
    Write-Host "tier0: OK (0 model calls, 0 AIU)"
}
finally {
    Pop-Location
}
exit 0
