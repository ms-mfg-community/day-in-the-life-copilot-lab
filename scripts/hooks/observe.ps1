# observe.ps1 — Continuous-learning-v2 observation hook
# Captures tool usage for instinct-based learning
# Usage: observe.ps1 <pre|post>
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs, toolResult? }

param(
    [Parameter(Position = 0)]
    [ValidateSet('pre', 'post')]
    [string]$ObserveType = 'pre'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$homunculusDirectory = Join-Path $HOME '.copilot/homunculus'
$observationsFile = Join-Path $homunculusDirectory 'observations.jsonl'

# Create directory if needed
$null = New-Item -ItemType Directory -Path $homunculusDirectory -Force

# Read input from stdin
$inputJson = [Console]::In.ReadToEnd()
$hookInput = $inputJson | ConvertFrom-Json

$toolNameProperty = $hookInput.PSObject.Properties['toolName']
$toolName = if ($null -ne $toolNameProperty) { [string]$toolNameProperty.Value } else { '' }

# Skip if no tool name
if ([string]::IsNullOrEmpty($toolName)) {
    exit 0
}

$toolArgumentsProperty = $hookInput.PSObject.Properties['toolArgs']
$toolArguments = if ($null -ne $toolArgumentsProperty -and $null -ne $toolArgumentsProperty.Value) {
    $toolArgumentsProperty.Value
}
else {
    [PSCustomObject]@{}
}

# Build observation JSON
$observation = [ordered]@{
    timestamp = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    type      = $ObserveType
    tool      = $toolName
    input     = $toolArguments
}

if ($ObserveType -eq 'post') {
    $toolResultProperty = $hookInput.PSObject.Properties['toolResult']
    $observation.result = if ($null -ne $toolResultProperty) {
        $toolResultProperty.Value
    }
    else {
        $null
    }
}

$observationJson = $observation | ConvertTo-Json -Depth 100 -Compress
Add-Content -LiteralPath $observationsFile -Value $observationJson -Encoding utf8

exit 0
