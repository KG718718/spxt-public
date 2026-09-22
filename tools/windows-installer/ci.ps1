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
$taskBundle=[IO.Path]::GetFullPath([string]$env:KSESSION_APPROVED_IDENTITY_BUNDLE)
if(!$env:KSESSION_APPROVED_IDENTITY_BUNDLE -or $taskBundle -notmatch '^E:\\' -or !(Test-Path -LiteralPath $taskBundle -PathType Leaf)){
 throw 'T4 must provide the reviewed historical+fresh identity bundle on the fixed E volume'
}
$taskBeta1=[IO.Path]::GetFullPath([string]$env:KSESSION_BETA1_SETUP)
if(!$env:KSESSION_BETA1_SETUP -or $taskBeta1 -notmatch '^E:\\' -or !(Test-Path -LiteralPath $taskBeta1 -PathType Leaf)){
 throw 'T4 must provide the fresh rebuilt beta.1 Setup on the fixed E volume'
}
$env:KSESSION_REQUIRE_FILE_SYMLINK='1'
& $taskNode --test (Join-Path $taskRepo 'tools/tests/windows-installer/upgrade-preflight/preflight.test.cjs')
if($LASTEXITCODE -ne 0){throw 'Hosted file symlink/reparse preflight gate failed'}
& $taskNode (Join-Path $taskRepo 'tools/tests/windows-installer/contract.cjs')
if($LASTEXITCODE -ne 0){throw 'Installer contract failed'}
& $taskNode --test (Join-Path $taskRepo 'tools/tests/windows-installer/upgrade-transaction/contract.test.cjs') (Join-Path $taskRepo 'tools/tests/windows-installer/upgrade-transaction/gate.test.cjs') (Join-Path $taskRepo 'tools/tests/windows-installer/upgrade-transaction/transaction.test.cjs')
if($LASTEXITCODE -ne 0){throw 'Upgrade transaction contract failed'}
& (Join-Path $PSScriptRoot 'toolchain.ps1') -Work (Join-Path $taskWork 'toolchain')
$taskCompiler=Join-Path $taskWork 'toolchain/compiler'
foreach($taskMode in @('candidate','fault-space','fault-permission','fault-cancel','fault-copy','fault-payload-hash','fault-post-copy')){
 & $taskNode (Join-Path $PSScriptRoot 'build.cjs') $taskPortable $taskCompiler (Join-Path $taskWork $taskMode) $Commit $taskMode $taskBundle
 if($LASTEXITCODE -ne 0){throw "Installer build failed: $taskMode"}
}
$taskArtifact=Join-Path $taskWork 'candidate/artifact'
$env:KSESSION_SETUP_BUILD=$taskWork
$env:KSESSION_SETUP_ARTIFACT=$taskArtifact
$env:KSESSION_SETUP_EVIDENCE=Join-Path $taskWork 'installer-tests'
$env:KSESSION_SETUP_UPGRADE_EVIDENCE=Join-Path $taskWork 'upgrade-tests'
$env:KSESSION_PORTABLE_REPO=$taskRepo
& (Join-Path $PSScriptRoot 'offline-ci.ps1') -Work (Join-Path $taskWork 'offline-gate') -Go $taskGo -LauncherSource (Join-Path $taskRepo 'tools/windows-launcher')
Copy-Item -LiteralPath (Join-Path $taskWork 'offline-gate/offline-network.json') -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $env:KSESSION_SETUP_EVIDENCE 'INSTALLER-TEST-REPORT.json') -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $env:KSESSION_SETUP_UPGRADE_EVIDENCE 'UPGRADE-TEST-REPORT.json') -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $taskWork 'toolchain/toolchain-verification.json') -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $taskPortable 'artifact/portable-test-report.json') -Destination $taskArtifact
Write-Output 'SETUP OFFLINE AUTOMATION COMPLETE; actual Win10 default visible wizard remains required'
