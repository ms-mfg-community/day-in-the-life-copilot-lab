# Post-tool-use hook: Verify .NET build after editing C# files

$toolName = $env:TOOL_NAME
$filePath = $env:FILE_PATH

if ($toolName -ne "edit" -and $toolName -ne "create") { exit 0 }
if ($filePath -notlike "*.cs") { exit 0 }

$output = dotnet build ContosoUniversity.sln --nologo --verbosity quiet 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  BUILD FAILED after editing $filePath"
    Write-Host ""
    $output | Select-Object -Last 20 | Write-Host
    Write-Host ""
    Write-Host "Fix the build errors before continuing."
    exit 1
}

Write-Host "✅ Build succeeded after editing $filePath"
