#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Create .specify/epics/<slug>/ and seed epic.md from the extension's epic-template.

.DESCRIPTION
    PowerShell twin of create-epic.sh. Refuses to overwrite an existing epic and
    throws on any failure so the calling command stops rather than reporting a
    success it did not achieve.

.PARAMETER Slug
    Lowercase letters, digits and hyphens only. Becomes a directory name.

.EXAMPLE
    .\create-epic.ps1 -Slug checkout-rewrite
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Slug
)

$ErrorActionPreference = 'Stop'

# Validate before touching the filesystem: the slug becomes a directory name.
if ($Slug -cnotmatch '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$') {
    Write-Error "Invalid slug '$Slug' — use lowercase letters, digits and hyphens only."
}

# Resolve paths relative to this script, not to the caller's cwd:
#   <ext>/scripts/powershell/create-epic.ps1 -> <ext>/templates/epic-template.md
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExtRoot = (Resolve-Path (Join-Path $ScriptDir '..' '..')).Path
$Template = Join-Path $ExtRoot 'templates' 'epic-template.md'

if (-not (Test-Path -LiteralPath $Template -PathType Leaf)) {
    Write-Error "Template not found at $Template"
}

# The epic lives under the project's .specify/, which is the grandparent of the
# installed extension directory: .specify/extensions/<id>/ -> .specify/
$SpecifyDir = (Resolve-Path (Join-Path $ExtRoot '..' '..')).Path
$EpicDir = Join-Path $SpecifyDir 'epics' $Slug
$EpicFile = Join-Path $EpicDir 'epic.md'

if (Test-Path -LiteralPath $EpicFile) {
    Write-Error "Epic already exists at $EpicFile — choose another slug."
}

New-Item -ItemType Directory -Path $EpicDir -Force | Out-Null
Copy-Item -LiteralPath $Template -Destination $EpicFile

Write-Output "EPIC_DIR: $EpicDir"
Write-Output "EPIC_FILE: $EpicFile"
