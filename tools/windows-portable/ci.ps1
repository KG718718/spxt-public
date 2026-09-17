param([Parameter(Mandatory=$true)][string]$Work,[Parameter(Mandatory=$true)][string]$Commit,[string]$NodeDir,[string]$GoRoot)
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$taskWork=[IO.Path]::GetFullPath($Work)
if($taskWork -notmatch '^E:\\' -or (Test-Path -LiteralPath $taskWork)){throw 'Fresh isolated E output required'}
$taskGit=(Get-Command git).Source
if((& $taskGit -C $taskRepo rev-parse HEAD).Trim() -ne $Commit){throw 'Must build checkout HEAD'}
if((& $taskGit -C $taskRepo status --porcelain --untracked-files=no)){throw 'Tracked changes cannot enter candidate'}
New-Item -ItemType Directory -Path $taskWork | Out-Null
$taskPin=Get-Content -Raw (Join-Path $taskRepo 'tools/windows-launcher/toolchain.json') | ConvertFrom-Json
$taskDist=Get-Content -Raw (Join-Path $taskRepo 'tools/installer/distribution.json') | ConvertFrom-Json
function Run-Checked([string]$exe,[string[]]$arguments) {
 & $exe @arguments
 if($LASTEXITCODE -ne 0){throw "Command failed: $exe (exit $LASTEXITCODE)"}
}
function Get-Pinned($url,$hash,$zip,$destination) {
 Invoke-WebRequest -Uri $url -OutFile $zip -TimeoutSec 240
 if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLower() -ne $hash){throw 'Tool archive hash mismatch'}
 Expand-Archive -LiteralPath $zip -DestinationPath $destination
}
if(!$GoRoot){
 Get-Pinned $taskPin.goWindowsZip $taskPin.sha256 (Join-Path $taskWork 'go.zip') (Join-Path $taskWork 'go-tool')
 $GoRoot=Join-Path $taskWork 'go-tool/go'
}
if(!$NodeDir){
 Get-Pinned $taskDist.nodeUrl $taskDist.nodeArchiveSha256 (Join-Path $taskWork 'node.zip') (Join-Path $taskWork 'node-tool')
 $NodeDir=Join-Path $taskWork "node-tool/node-v$($taskDist.nodeVersion)-win-x64"
}
$taskGo=Join-Path $GoRoot 'bin/go.exe'
$taskNode=Join-Path $NodeDir 'node.exe'
# All runtime/tests/caches are external to source and the portable program.
$taskBuild=Join-Path $taskWork 'runtime-build';New-Item -ItemType Directory -Path $taskBuild | Out-Null
Run-Checked $taskNode @((Join-Path $taskRepo 'tools/windows-runtime/build.cjs'),$Commit,$taskBuild,$NodeDir,$taskGit)
$taskRoot=Join-Path $taskWork '暂存程序 中文 with spaces'
Copy-Item -LiteralPath (Join-Path $taskBuild 'KSESSION-RUNTIME') -Destination $taskRoot -Recurse
$taskPackageScript=Join-Path $PSScriptRoot 'package.cjs'
Run-Checked $taskNode @($taskPackageScript,'prepare',$taskRoot,$GoRoot)
$taskLauncher=Join-Path $taskWork 'launcher-output'
& (Join-Path $taskRepo 'tools/windows-launcher/build.ps1') -RuntimeRoot $taskRoot -OutputDir $taskLauncher -SourceCommit $Commit -GoExe $taskGo
Run-Checked $taskNode @($taskPackageScript,'finish',$taskRoot,$taskLauncher,$taskGit,$taskRepo,$Commit)
$taskArtifact=Join-Path $taskWork 'artifact';New-Item -ItemType Directory -Path $taskArtifact | Out-Null
$env:KSESSION_TEST_LAUNCHER=Join-Path $taskRoot 'K-SESSION.exe'
$env:KSESSION_TEST_EVIDENCE=Join-Path $taskWork 'launcher-integration'
$env:KSESSION_PORTABLE_REPO=$taskRepo
Push-Location (Join-Path $taskRepo 'tools/windows-launcher')
try {
 Run-Checked $taskGo @('vet','./...')
 Run-Checked $taskGo @('test','-count=1','-v','-run','^TestLauncherIntegration$','.')
 $env:KSESSION_PORTABLE_ROOT=$taskRoot
 $env:KSESSION_PORTABLE_EVIDENCE=Join-Path $taskWork 'portable-staging'
 Run-Checked $taskGo @('test','-count=1','-v','-run','^TestPortable$','.')
 Run-Checked $taskNode @($taskPackageScript,'archive',$taskRoot,$taskArtifact,(Join-Path $env:KSESSION_PORTABLE_EVIDENCE 'portable-test-report.json'))
 $taskExtract=Join-Path $taskWork '解包程序 中文 with spaces'
 Expand-Archive -LiteralPath (Join-Path $taskArtifact 'K-SESSION-portable-beta-win-x64.zip') -DestinationPath $taskExtract
 $env:KSESSION_PORTABLE_ROOT=Join-Path $taskExtract 'K-SESSION'
 # Child name and parent both include Chinese/space, actual exe path still tests both.
 $env:KSESSION_PORTABLE_EVIDENCE=Join-Path $taskWork 'portable-extracted'
 Run-Checked $taskNode @($taskPackageScript,'verify',$env:KSESSION_PORTABLE_ROOT)
 Run-Checked $taskGo @('test','-count=1','-v','-run','^TestPortable$','.')
} finally {Pop-Location}
$taskStaging=Get-Content -Raw (Join-Path $taskWork 'portable-staging/portable-test-report.json')|ConvertFrom-Json
$taskExtracted=Get-Content -Raw (Join-Path $taskWork 'portable-extracted/portable-test-report.json')|ConvertFrom-Json
$taskIdentity=Get-Content -Raw (Join-Path $taskArtifact 'zip-identity.json')|ConvertFrom-Json
@{status='PASS';sourceCommit=$Commit;zipSha256=$taskIdentity.zipSha256;staging=$taskStaging;extracted=$taskExtracted;humanWin10='PENDING; no browser screenshot claims'}|ConvertTo-Json -Depth 30|Set-Content -Encoding utf8 (Join-Path $taskArtifact 'portable-test-report.json')
Copy-Item -LiteralPath (Join-Path $taskRoot 'build-info.json') -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $taskRoot 'manifest/runtime-manifest.json') -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $taskWork 'launcher-integration/integration.json') -Destination $taskArtifact
(Get-Content -Raw (Join-Path $taskRoot 'manifest/runtime-manifest.json')|ConvertFrom-Json).licenses|ConvertTo-Json -Depth 20|Set-Content -Encoding utf8 (Join-Path $taskArtifact 'license-summary.json')
foreach($taskEntry in Get-ChildItem -LiteralPath $taskArtifact){
 if($taskEntry.PSIsContainer -or $taskEntry.Name -notin @('K-SESSION-portable-beta-win-x64.zip','SHA256SUMS.txt','zip-identity.json','portable-test-report.json','build-info.json','runtime-manifest.json','integration.json','license-summary.json')){throw 'Unexpected artifact content'}
}
Write-Output 'PORTABLE AUTOMATED GATES PASS; actual Actions ZIP Win10 human acceptance remains required'
