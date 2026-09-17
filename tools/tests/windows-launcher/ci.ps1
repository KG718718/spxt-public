param([Parameter(Mandatory=$true)][string]$Work,[Parameter(Mandatory=$true)][string]$Commit)
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$taskWork=[IO.Path]::GetFullPath($Work)
if(Test-Path -LiteralPath $taskWork){throw 'Fresh output required'}
New-Item -ItemType Directory -Path $taskWork | Out-Null
$taskPin=Get-Content -Raw (Join-Path $taskRepo 'tools/windows-launcher/toolchain.json') | ConvertFrom-Json
$taskDist=Get-Content -Raw (Join-Path $taskRepo 'tools/installer/distribution.json') | ConvertFrom-Json
function Get-PinnedArchive($url,$hash,$archive,$destination) {
 Invoke-WebRequest -Uri $url -OutFile $archive -TimeoutSec 180
 if((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLower() -ne $hash){throw 'Official distribution hash mismatch'}
 Expand-Archive -LiteralPath $archive -DestinationPath $destination
}
Get-PinnedArchive $taskPin.goWindowsZip $taskPin.sha256 (Join-Path $taskWork 'go.zip') (Join-Path $taskWork 'go-tool')
Get-PinnedArchive $taskDist.nodeUrl $taskDist.nodeArchiveSha256 (Join-Path $taskWork 'node.zip') (Join-Path $taskWork 'node-tool')
$taskGo=Join-Path $taskWork 'go-tool/go/bin/go.exe'
$taskNodeDir=Join-Path $taskWork "node-tool/node-v$($taskDist.nodeVersion)-win-x64"
$taskNode=Join-Path $taskNodeDir 'node.exe'
$taskBuild=Join-Path $taskWork 'runtime-build';New-Item -ItemType Directory -Path $taskBuild | Out-Null
& $taskNode (Join-Path $taskRepo 'tools/windows-runtime/build.cjs') $Commit $taskBuild $taskNodeDir (Get-Command git).Source
if($LASTEXITCODE -ne 0){throw 'Frozen Runtime build failed'}
$taskArtifact=Join-Path $taskWork 'artifact';New-Item -ItemType Directory -Path $taskArtifact | Out-Null
$taskPackage=Join-Path $taskWork 'Runtime 中文 with spaces'
Copy-Item -LiteralPath (Join-Path $taskBuild 'KSESSION-RUNTIME') -Destination $taskPackage -Recurse
& (Join-Path $taskRepo 'tools/windows-launcher/build.ps1') -RuntimeRoot $taskPackage -OutputDir (Join-Path $taskArtifact 'launcher') -SourceCommit $Commit -GoExe $taskGo
Copy-Item -LiteralPath (Join-Path $taskArtifact 'launcher/K-SESSION.exe') -Destination $taskPackage
Copy-Item -LiteralPath (Join-Path $taskArtifact 'launcher/build-info.json') -Destination $taskPackage
$env:KSESSION_TEST_LAUNCHER=Join-Path $taskPackage 'K-SESSION.exe'
$env:KSESSION_TEST_EVIDENCE=Join-Path $taskWork 'integration'
Push-Location (Join-Path $taskRepo 'tools/windows-launcher')
try {
 & $taskGo test -count=1 -v -run '^TestLauncherIntegration$' . 2>&1 | Tee-Object -FilePath (Join-Path $taskArtifact 'integration-test.log')
 if($LASTEXITCODE -ne 0){throw 'Actual EXE integration failed'}
 & $taskGo vet ./...
 if($LASTEXITCODE -ne 0){throw 'Go vet failed'}
} finally {Pop-Location}
Copy-Item -LiteralPath (Join-Path $env:KSESSION_TEST_EVIDENCE 'integration.json') -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $taskBuild 'build-report.json') -Destination (Join-Path $taskArtifact 'runtime-build-report.json')
# Reject accidental build caches or synthetic instance material in the public artifact.
foreach($taskEntry in Get-ChildItem -LiteralPath $taskArtifact) {
 if($taskEntry.Name -notin @('launcher','integration-test.log','integration.json','runtime-build-report.json')) {throw 'Unexpected artifact content'}
}
# Do not upload instance data/logs, credentials, caches or downloaded toolchains.
Compress-Archive -LiteralPath $taskPackage -DestinationPath (Join-Path $taskArtifact 'K-SESSION-launcher-runtime-prototype.zip')
Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $taskArtifact 'K-SESSION-launcher-runtime-prototype.zip') | ForEach-Object { "$($_.Hash.ToLower())  K-SESSION-launcher-runtime-prototype.zip" } | Set-Content -Encoding ascii (Join-Path $taskArtifact 'runtime-ZIP-SHA256.txt')
