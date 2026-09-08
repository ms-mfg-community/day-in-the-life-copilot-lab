param(
  [string]$Revision = 'HEAD',
  [string]$Output = 'packaging\core\out'
)
$ErrorActionPreference = 'Stop'
node (Join-Path $PSScriptRoot 'build.mjs') --revision $Revision --output $Output
exit $LASTEXITCODE
