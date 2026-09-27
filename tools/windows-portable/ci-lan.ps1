param(
  [Parameter(Mandatory=$true)][string]$Work,
  [Parameter(Mandatory=$true)][string]$Commit,
  [string]$NodeDir,
  [string]$GoRoot
)
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$taskWork=[IO.Path]::GetFullPath($Work)
if($taskWork -notmatch '^E:\\' -or (Test-Path -LiteralPath $taskWork)){throw 'Fresh isolated E output required'}
$taskGit=(Get-Command git).Source
if((& $taskGit -C $taskRepo rev-parse HEAD).Trim() -ne $Commit){throw 'Must build checkout HEAD'}
if((& $taskGit -C $taskRepo status --porcelain --untracked-files=no)){throw 'Tracked changes cannot enter LAN candidate'}
New-Item -ItemType Directory -Path $taskWork|Out-Null
$taskPin=Get-Content -Raw (Join-Path $taskRepo 'tools/windows-launcher/toolchain.json')|ConvertFrom-Json
$taskDist=Get-Content -Raw (Join-Path $taskRepo 'tools/installer/distribution.json')|ConvertFrom-Json
function Run-Checked([string]$exe,[string[]]$arguments){
  & $exe @arguments
  if($LASTEXITCODE -ne 0){throw "Command failed: $exe (exit $LASTEXITCODE)"}
}
function Get-Pinned($url,$hash,$zip,$destination){
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
$taskBuild=Join-Path $taskWork 'runtime-build';New-Item -ItemType Directory -Path $taskBuild|Out-Null
Run-Checked $taskNode @((Join-Path $taskRepo 'tools/windows-runtime/build.cjs'),$Commit,$taskBuild,$NodeDir,$taskGit)
$taskRoot=Join-Path $taskWork '暂存程序 中文 with spaces'
Copy-Item -LiteralPath (Join-Path $taskBuild 'KSESSION-RUNTIME') -Destination $taskRoot -Recurse
$taskPackageScript=Join-Path $PSScriptRoot 'package-lan.cjs'
Run-Checked $taskNode @($taskPackageScript,'prepare',$taskRoot,$GoRoot)
$taskManifest=Join-Path $taskRoot 'manifest/runtime-manifest.json'
$taskRuntimeHash=(Get-FileHash -LiteralPath $taskManifest -Algorithm SHA256).Hash.ToLower()
$taskNodeHash=(Get-FileHash -LiteralPath (Join-Path $taskRoot 'runtime/node.exe') -Algorithm SHA256).Hash.ToLower()
$taskHelper=Join-Path $taskWork 'firewall-helper-output'
& (Join-Path $taskRepo 'tools/windows-firewall/build.ps1') -OutputDir $taskHelper -SourceCommit $Commit `
  -RuntimeManifestSha256 $taskRuntimeHash -NodeSha256 $taskNodeHash -InstallerVersion '1.1.0-beta.3' -GoExe $taskGo
if($LASTEXITCODE -ne 0){throw 'Firewall helper build failed'}
$taskHelperHash=(Get-FileHash -LiteralPath (Join-Path $taskHelper 'K-SESSION-Firewall.exe') -Algorithm SHA256).Hash.ToLower()
$taskLauncher=Join-Path $taskWork 'launcher-output'
& (Join-Path $taskRepo 'tools/windows-launcher/build.ps1') -RuntimeRoot $taskRoot -OutputDir $taskLauncher `
  -SourceCommit $Commit -FirewallHelperSha256 $taskHelperHash -GoExe $taskGo
if($LASTEXITCODE -ne 0){throw 'LAN Launcher build failed'}
Run-Checked $taskNode @($taskPackageScript,'finish',$taskRoot,$taskLauncher,$taskHelper,$taskGit,$taskRepo,$Commit)
$taskLanTests=@(
  'tools/tests/lan-host/config.test.cjs','tools/tests/lan-host/network.test.cjs',
  'tools/tests/lan-host/server.test.cjs','tools/tests/lan-host/server-startup.test.cjs',
  'tools/tests/lan-host/server-runtime.test.cjs'
) | ForEach-Object {Join-Path $taskRepo $_}
$taskLauncherTests=@(Get-ChildItem -LiteralPath (Join-Path $taskRepo 'tools/tests/lan-host') -Filter 'launcher*.test.cjs' -File|ForEach-Object FullName)
if($taskLauncherTests.Count -eq 0){throw 'LAN Launcher contract tests missing'}
$taskRuntimeModules=Join-Path $taskRoot 'app/node_modules'
if(!(Test-Path -LiteralPath (Join-Path $taskRuntimeModules 'multer') -PathType Container)){throw 'Built Runtime dependency tree is incomplete'}
$taskPreviousNodePath=$env:NODE_PATH
$env:NODE_PATH=$taskRuntimeModules
try{
  Run-Checked $taskNode @('-e',"const p=require.resolve('multer');if(!p.startsWith(process.env.NODE_PATH))process.exit(23)")
  Run-Checked $taskNode (@('--test')+$taskLanTests+$taskLauncherTests)
}finally{
  if($null -eq $taskPreviousNodePath){Remove-Item Env:NODE_PATH -ErrorAction SilentlyContinue}else{$env:NODE_PATH=$taskPreviousNodePath}
}
$taskArtifact=Join-Path $taskWork 'artifact';New-Item -ItemType Directory -Path $taskArtifact|Out-Null
$env:KSESSION_TEST_LAUNCHER=Join-Path $taskRoot 'K-SESSION.exe'
$env:KSESSION_TEST_EVIDENCE=Join-Path $taskWork 'launcher-integration'
$env:KSESSION_PORTABLE_REPO=$taskRepo
Push-Location (Join-Path $taskRepo 'tools/windows-launcher')
try{
  Run-Checked $taskGo @('vet','./...')
  Run-Checked $taskGo @('test','-count=1','-v','-run','^TestLauncherIntegration$','.')
  $env:KSESSION_PORTABLE_ROOT=$taskRoot
  $env:KSESSION_PORTABLE_EVIDENCE=Join-Path $taskWork 'portable-staging'
  Run-Checked $taskGo @('test','-count=1','-v','-run','^TestPortable$','.')
  Run-Checked $taskNode @($taskPackageScript,'archive',$taskRoot,$taskArtifact,(Join-Path $env:KSESSION_PORTABLE_EVIDENCE 'portable-test-report.json'))
  $taskExtract=Join-Path $taskWork '解包程序 中文 with spaces'
  Expand-Archive -LiteralPath (Join-Path $taskArtifact 'K-SESSION-portable-lan-beta-win-x64.zip') -DestinationPath $taskExtract
  $env:KSESSION_PORTABLE_ROOT=Join-Path $taskExtract 'K-SESSION'
  $env:KSESSION_PORTABLE_EVIDENCE=Join-Path $taskWork 'portable-extracted'
  Run-Checked $taskNode @($taskPackageScript,'verify',$env:KSESSION_PORTABLE_ROOT)
  Run-Checked $taskGo @('test','-count=1','-v','-run','^TestPortable$','.')
}finally{Pop-Location}
$taskStaging=Get-Content -Raw (Join-Path $taskWork 'portable-staging/portable-test-report.json')|ConvertFrom-Json
$taskExtracted=Get-Content -Raw (Join-Path $taskWork 'portable-extracted/portable-test-report.json')|ConvertFrom-Json
$taskIdentity=Get-Content -Raw (Join-Path $taskArtifact 'zip-identity.json')|ConvertFrom-Json
@{status='PASS';sourceCommit=$Commit;zipSha256=$taskIdentity.zipSha256;firewallHelperSha256=$taskHelperHash;
  staging=$taskStaging;extracted=$taskExtracted;humanWin10='PENDING; no real LAN or browser claim'}|ConvertTo-Json -Depth 30|
  Set-Content -Encoding utf8 (Join-Path $taskArtifact 'portable-test-report.json')
Copy-Item -LiteralPath (Join-Path $taskRoot 'build-info.json') -Destination $taskArtifact
Copy-Item -LiteralPath $taskManifest -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $taskWork 'launcher-integration/integration.json') -Destination $taskArtifact
(Get-Content -Raw $taskManifest|ConvertFrom-Json).licenses|ConvertTo-Json -Depth 20|Set-Content -Encoding utf8 (Join-Path $taskArtifact 'license-summary.json')
foreach($taskEntry in Get-ChildItem -LiteralPath $taskArtifact){
  if($taskEntry.PSIsContainer -or $taskEntry.Name -notin @('K-SESSION-portable-lan-beta-win-x64.zip','SHA256SUMS.txt','zip-identity.json','portable-test-report.json','build-info.json','runtime-manifest.json','integration.json','license-summary.json')){throw 'Unexpected LAN portable artifact content'}
}
Write-Output 'LAN PORTABLE AUTOMATED GATES PASS; real Win10 LAN acceptance remains required'
