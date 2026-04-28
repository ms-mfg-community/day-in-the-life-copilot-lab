# preflight.ps1 — Advanced Copilot CLI Workshop readiness check (PowerShell).
#
# PowerShell parity of scripts/preflight.sh. Verifies prerequisites for the
# live workshop and — with -Lab14 — for the Lab 14 tmux-orchestrator pattern.
#
# Classification contract:
#   FAIL  workshop cannot proceed here; remediation required.
#   WARN  degraded but workable; note the caveat.
#   PASS  ready.
#
# Exits 1 if any FAIL, else 0. -Json emits a single JSON object to stdout.
#
# Test hooks (environment variables — documented for CI parity with .sh):
#   PREFLIGHT_OS          linux|darwin|wsl2|wsl1|windows
#   PREFLIGHT_REPO_PATH   path used for "repo on /mnt/c/" check

[CmdletBinding()]
param(
    [switch]$Lab14,
    [switch]$Json,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    @'
preflight.ps1 — Advanced Copilot CLI Workshop readiness check

Usage:
  pwsh scripts/preflight.ps1 [-Lab14] [-Json]

Options:
  -Lab14   Enable Lab 14 (tmux-orchestrator) strict checks: tmux becomes
           required; WSL1 and Windows PowerShell-only configurations are
           classified as FAIL instead of WARN.
  -Json    Emit a machine-readable JSON report on stdout.
  -Help    Show this message.

Exit codes:
  0  No FAIL checks (warnings may be present).
  1  At least one FAIL check.
'@ | Write-Output
    exit 0
}

$checks = New-Object System.Collections.Generic.List[object]

function Record {
    param(
        [string]$Id,
        [ValidateSet('pass','warn','fail')] [string]$Status,
        [string]$Message,
        [string]$Remediation = ''
    )
    $checks.Add([pscustomobject]@{
        id          = $Id
        status      = $Status
        message     = $Message
        remediation = $Remediation
    }) | Out-Null
}

function Test-Tool {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-DetectedOs {
    if ($env:PREFLIGHT_OS) { return $env:PREFLIGHT_OS }
    if ($IsMacOS)   { return 'darwin' }
    if ($IsWindows) { return 'windows' }
    if ($IsLinux) {
        $procVersion = ''
        if (Test-Path '/proc/version') {
            try { $procVersion = Get-Content '/proc/version' -ErrorAction SilentlyContinue -Raw } catch { }
        }
        if ($procVersion -match '(?i)microsoft|wsl') {
            if ($procVersion -match 'microsoft-standard' `
                -or $env:WSL_INTEROP -or $env:WSL_DISTRO_NAME) {
                return 'wsl2'
            }
            return 'wsl1'
        }
        return 'linux'
    }
    return 'unknown'
}

$os = Get-DetectedOs
$repoPath = if ($env:PREFLIGHT_REPO_PATH) { $env:PREFLIGHT_REPO_PATH } else { (Get-Location).Path }

# -------- required tools --------
$requiredTools = @(
    @{ Id = 'git';     Cmd = 'git';     OkMsg = 'git on PATH';         Fix = 'Install git: https://git-scm.com/downloads' },
    @{ Id = 'gh';      Cmd = 'gh';      OkMsg = 'GitHub CLI on PATH';  Fix = "Install GitHub CLI: https://cli.github.com/ (then 'gh auth login')" },
    @{ Id = 'copilot'; Cmd = 'copilot'; OkMsg = 'Copilot CLI on PATH'; Fix = 'Install Copilot CLI: npm install -g @github/copilot (see https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli)' },
    @{ Id = 'node';    Cmd = 'node';    OkMsg = 'Node.js on PATH';     Fix = 'Install Node.js 18+ from https://nodejs.org/' }
)
foreach ($t in $requiredTools) {
    if (Test-Tool $t.Cmd) { Record $t.Id 'pass' $t.OkMsg '' }
    else { Record $t.Id 'fail' "$($t.Cmd) not found on PATH" $t.Fix }
}

# -------- tmux (FAIL under -Lab14, WARN otherwise) --------
if (Test-Tool 'tmux') {
    Record 'tmux' 'pass' 'tmux on PATH' ''
} elseif ($Lab14) {
    Record 'tmux' 'fail' 'tmux not found on PATH (required for Lab 14)' `
        "Install tmux — Linux: 'sudo apt-get install -y tmux'; macOS: 'brew install tmux'; Windows: run the workshop inside WSL2 and install tmux there."
} else {
    Record 'tmux' 'warn' 'tmux not found on PATH (required for Lab 14, optional elsewhere)' `
        "Install tmux before Lab 14 — Linux: 'sudo apt-get install -y tmux'; macOS: 'brew install tmux'."
}

# -------- container runtime --------
if (Test-Tool 'docker') {
    Record 'container-runtime' 'pass' 'docker on PATH' ''
} elseif (Test-Tool 'podman') {
    Record 'container-runtime' 'pass' 'podman on PATH' ''
} else {
    Record 'container-runtime' 'warn' 'No container runtime (docker or podman) detected' `
        'Install Docker Desktop, Podman Desktop, or use GitHub Codespaces for the devcontainer path.'
}

# -------- gh-aw extension --------
if (Test-Tool 'gh') {
    $extOut = ''
    try { $extOut = (& gh extension list 2>$null) -join "`n" } catch { }
    if ($extOut -match 'gh-aw') {
        Record 'gh-aw' 'pass' 'gh-aw extension installed' ''
    } else {
        Record 'gh-aw' 'warn' 'gh-aw extension not installed (needed for Labs 08–09)' `
            'Run: gh extension install github/gh-aw'
    }
} else {
    Record 'gh-aw' 'warn' 'skipped — gh CLI is missing' `
        'Install gh first (see above), then: gh extension install github/gh-aw'
}

# -------- OS classification --------
switch ($os) {
    { $_ -in 'darwin','linux' } {
        Record 'os' 'pass' "native $os — fully supported" ''
    }
    'wsl2' {
        if ($repoPath -match '^(/mnt/[a-zA-Z]/|[A-Za-z]:\\)') {
            Record 'os' 'warn' `
                "WSL2 with repo under $repoPath — degraded (slow file I/O, file-watcher flakiness)" `
                'Move the repo onto the Linux filesystem (e.g. ~/repos/<name> under $HOME) before the workshop. See labs/lab14.md compatibility matrix.'
        } else {
            Record 'os' 'pass' 'WSL2 with repo on Linux filesystem — recommended Windows config' ''
        }
    }
    'wsl1' {
        if ($Lab14) {
            Record 'os' 'fail' `
                'WSL1 is not supported for Lab 14 (no working tmux/interop guarantees)' `
                "Upgrade to WSL2: 'wsl --set-version <distro> 2' (Windows 10 2004+/Windows 11). See labs/lab14.md compatibility matrix."
        } else {
            Record 'os' 'warn' 'WSL1 is not tested for this workshop' `
                "Prefer WSL2 — 'wsl --set-version <distro> 2'."
        }
    }
    'windows' {
        if ($Lab14) {
            Record 'os' 'fail' `
                'Windows PowerShell-only is unsupported for Lab 14 (tmux-orchestrator requires a Unix environment)' `
                'Run the workshop inside WSL2 with the repo on the Linux filesystem, or use GitHub Codespaces. See labs/lab14.md compatibility matrix.'
        } else {
            Record 'os' 'warn' `
                'Windows native shell — some labs (Lab 14 in particular) require a Unix environment' `
                'Use WSL2 or GitHub Codespaces for full coverage.'
        }
    }
    default {
        Record 'os' 'warn' "Unknown OS: $os" `
            'If this is not macOS / Linux / WSL2, see labs/lab14.md compatibility matrix before the workshop.'
    }
}

# -------- emit --------
$fails = ($checks | Where-Object { $_.status -eq 'fail' }).Count
$warns = ($checks | Where-Object { $_.status -eq 'warn' }).Count

if ($Json) {
    $payload = [pscustomobject]@{
        os     = $os
        lab14  = [bool]$Lab14
        fails  = $fails
        warns  = $warns
        checks = $checks
    }
    $payload | ConvertTo-Json -Depth 5 -Compress
} else {
    Write-Output 'Advanced Copilot CLI Workshop — preflight'
    Write-Output ("OS: {0}  |  Lab 14 strict: {1}" -f $os, $(if ($Lab14) { 'on' } else { 'off' }))
    Write-Output ''
    foreach ($c in $checks) {
        $icon = switch ($c.status) {
            'pass' { '[PASS]' }
            'warn' { '[WARN]' }
            'fail' { '[FAIL]' }
        }
        Write-Output ("  {0} {1,-20} {2}" -f $icon, $c.id, $c.message)
        if ($c.status -ne 'pass' -and $c.remediation) {
            Write-Output ("        -> {0}" -f $c.remediation)
        }
    }
    Write-Output ''
    Write-Output ("Summary: {0} FAIL, {1} WARN" -f $fails, $warns)
    if ($fails -gt 0) {
        Write-Output 'Result: NOT READY — address FAIL items above before the workshop.'
    } elseif ($warns -gt 0) {
        Write-Output 'Result: READY (with warnings) — review WARN items before the workshop.'
    } else {
        Write-Output 'Result: READY'
    }
}

if ($fails -gt 0) { exit 1 } else { exit 0 }
