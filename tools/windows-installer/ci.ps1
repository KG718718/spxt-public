param([Parameter(Mandatory=$true)][string]$Work,[Parameter(Mandatory=$true)][string]$Commit)
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$taskWork=[IO.Path]::GetFullPath($Work)
if($taskWork -notmatch '^E:\\' -or (Test-Path -LiteralPath $taskWork)){throw 'Fresh E setup build required'}
New-Item -ItemType Directory -Path $taskWork|Out-Null
$taskPortable=Join-Path $taskWork 'portable'
& (Join-Path $taskRepo 'tools/windows-portable/ci.ps1') -Work $taskPortable -Commit $Commit
$taskNode=Join-Path $taskPortable 'node-tool/node-v24.21.0-win-x64/node.exe'
$taskGo=Join-Path $taskPortable 'go-tool/go/bin/go.exe'
& (Join-Path $PSScriptRoot 'toolchain.ps1') -Work (Join-Path $taskWork 'toolchain')
$taskCompiler=Join-Path $taskWork 'toolchain/compiler'
foreach($taskMode in @('candidate','fault-space','fault-cancel')){
 & $taskNode (Join-Path $PSScriptRoot 'build.cjs') $taskPortable $taskCompiler (Join-Path $taskWork $taskMode) $Commit $taskMode
 if($LASTEXITCODE -ne 0){throw "Installer build failed: $taskMode"}
}
$taskArtifact=Join-Path $taskWork 'candidate/artifact'
$env:KSESSION_SETUP_BUILD=$taskWork
$env:KSESSION_SETUP_ARTIFACT=$taskArtifact
$env:KSESSION_SETUP_EVIDENCE=Join-Path $taskWork 'installer-tests'
$env:KSESSION_PORTABLE_REPO=$taskRepo
Push-Location (Join-Path $taskRepo 'tools/windows-launcher')
try {
 & $taskGo test -count=1 -timeout=15m -v -run '^TestSetup$' .
 if($LASTEXITCODE -ne 0){throw 'Installer automated test failed'}
} finally {Pop-Location}
Copy-Item -LiteralPath (Join-Path $env:KSESSION_SETUP_EVIDENCE 'INSTALLER-TEST-REPORT.json') -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $taskWork 'toolchain/toolchain-verification.json') -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $taskPortable 'artifact/portable-test-report.json') -Destination $taskArtifact
Write-Output 'SETUP AUTOMATION COMPLETE; manual default wizard and external-network-disabled tests still required'
