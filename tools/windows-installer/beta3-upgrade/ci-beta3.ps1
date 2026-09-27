param(
  [Parameter(Mandatory=$true)][string]$Work,
  [Parameter(Mandatory=$true)][string]$Commit,
  [Parameter(Mandatory=$true)][string]$StageReport,
  [switch]$FullHosted,
  [switch]$DiagnosticHosted
)
$ErrorActionPreference='Stop'
if($FullHosted -and $DiagnosticHosted){throw 'Full and diagnostic hosted modes are mutually exclusive'}
$taskStageReport=[IO.Path]::GetFullPath($StageReport)
$taskStages=@('PREFLIGHT','PORTABLE','IDENTITY','COMPATIBILITY','FROZEN_REGRESSION','TOOLCHAIN','SETUP_BUILD',
  'HOSTED_LAN','OFFLINE_LIFECYCLE','FIREWALL','ARTIFACT_ASSEMBLY','COMPLETE')
$script:taskStage='PREFLIGHT'
function Set-FixedStage([string]$Stage,[string]$Status='RUNNING'){
  if($Stage -notin $taskStages -or $Status -notin @('RUNNING','PASS','FAIL')){throw 'Invalid fixed CI stage'}
  New-Item -ItemType Directory -Path (Split-Path $taskStageReport) -Force|Out-Null
  $taskMode=if($FullHosted){'FULL'}elseif($DiagnosticHosted){'DIAGNOSTIC'}else{'BUILD_ONLY'}
  [IO.File]::WriteAllText($taskStageReport,(@{schema=1;status=$Status;stage=$Stage;sourceCommit=$Commit;mode=$taskMode}|ConvertTo-Json),(New-Object Text.UTF8Encoding($false)))
  $script:taskStage=$Stage
}
Set-FixedStage 'PREFLIGHT'
trap{Set-FixedStage $script:taskStage 'FAIL';throw}
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$taskWork=[IO.Path]::GetFullPath($Work)
if($taskWork -notmatch '^E:\\' -or (Test-Path -LiteralPath $taskWork)){throw 'Fresh E beta3 build required'}
if((git -C $taskRepo rev-parse HEAD).Trim() -ne $Commit){throw 'Must build checkout HEAD'}
if(git -C $taskRepo status --porcelain --untracked-files=no){throw 'Tracked changes cannot enter beta3 candidate'}
New-Item -ItemType Directory -Path $taskWork|Out-Null
$taskPortable=Join-Path $taskWork 'portable'
Set-FixedStage 'PORTABLE'
& (Join-Path $taskRepo 'tools/windows-portable/ci-lan.ps1') -Work $taskPortable -Commit $Commit
if($LASTEXITCODE -ne 0){throw 'LAN portable build failed'}
$taskNode=Join-Path $taskPortable 'node-tool/node-v24.21.0-win-x64/node.exe'
$taskBundle=Join-Path $taskWork 'accepted-f3-beta2-bundle.json'
Set-FixedStage 'IDENTITY'
& $taskNode (Join-Path $PSScriptRoot 'trusted-identity.cjs') `
  (Join-Path $taskRepo 'docs/tasks/windows-installer-v1.1/batch-4.5/evidence/accepted-f3-beta2-identity.json') $taskBundle
if($LASTEXITCODE -ne 0){throw 'Accepted F3 identity bundle generation failed'}
$taskCompatibility=Join-Path $taskWork 'beta3-compatibility-report.json'
Set-FixedStage 'COMPATIBILITY'
& $taskNode (Join-Path $taskRepo 'tools/tests/windows-installer/beta3-upgrade/compatibility-report.cjs') $taskCompatibility $Commit
if($LASTEXITCODE -ne 0){throw 'Beta3 compatibility or transaction tests failed'}
Set-FixedStage 'FROZEN_REGRESSION'
& $taskNode --test --test-concurrency=1 `
  (Join-Path $taskRepo 'tools/tests/windows-installer/upgrade-detection/upgrade-detection.test.cjs') `
  (Join-Path $taskRepo 'tools/tests/windows-installer/upgrade-lifecycle/contract.test.cjs') `
  (Join-Path $taskRepo 'tools/tests/windows-installer/upgrade-preflight/preflight.test.cjs') `
  (Join-Path $taskRepo 'tools/tests/windows-installer/upgrade-transaction/contract.test.cjs') `
  (Join-Path $taskRepo 'tools/tests/windows-installer/upgrade-transaction/gate.test.cjs') `
  (Join-Path $taskRepo 'tools/tests/windows-installer/upgrade-transaction/transaction.test.cjs')
if($LASTEXITCODE -ne 0){throw 'Frozen beta1 to beta2 upgrade regression failed'}
Set-FixedStage 'TOOLCHAIN'
& (Join-Path $taskRepo 'tools/windows-installer/toolchain.ps1') -Work (Join-Path $taskWork 'toolchain')
if($LASTEXITCODE -ne 0){throw 'Installer toolchain failed'}
$taskCompiler=Join-Path $taskWork 'toolchain/compiler'
$taskModes=if($DiagnosticHosted){@('candidate','fault-payload-hash','fault-post-copy')}else{@('candidate','fault-space','fault-permission','fault-cancel','fault-copy','fault-payload-hash','fault-post-copy')}
Set-FixedStage 'SETUP_BUILD'
foreach($taskMode in $taskModes){
  $taskBuildMode=if($taskMode -eq 'candidate'){'lan-candidate'}else{$taskMode}
  & $taskNode (Join-Path $PSScriptRoot 'build-beta3.cjs') $taskPortable $taskCompiler (Join-Path $taskWork $taskMode) $Commit $taskBuildMode $taskBundle
  if($LASTEXITCODE -ne 0){throw "Beta3 LAN Setup build failed: $taskMode"}
}
$taskCandidate=Join-Path $taskWork 'candidate'
$taskArtifact=Join-Path $taskCandidate 'artifact'
Copy-Item -LiteralPath (Join-Path $taskPortable 'artifact/portable-test-report.json') -Destination $taskArtifact
Copy-Item -LiteralPath (Join-Path $taskWork 'toolchain/toolchain-verification.json') -Destination $taskArtifact
$taskLifecycle='PENDING_FULL_HOSTED'
if($FullHosted -or $DiagnosticHosted){
  $taskBeta2=[IO.Path]::GetFullPath([string]$env:KSESSION_BETA2_SETUP)
  if(!$env:KSESSION_BETA2_SETUP -or $taskBeta2 -notmatch '^E:\\' -or !(Test-Path -LiteralPath $taskBeta2 -PathType Leaf) -or
      (Get-Item -LiteralPath $taskBeta2).Length -ne 33018840 -or
      (Get-FileHash -LiteralPath $taskBeta2 -Algorithm SHA256).Hash.ToLower() -ne '877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6'){
    throw 'Exact accepted F3 beta2 Setup identity required'
  }
  $taskHostedReport=Join-Path $taskWork 'hosted-lan/hosted-lan-gate.json'
  Set-FixedStage 'HOSTED_LAN'
  & $taskNode (Join-Path $taskRepo 'tools/tests/lan-host/hosted-gate.cjs') $taskHostedReport
  if($LASTEXITCODE -ne 0){throw 'Hosted LAN isolation gate failed'}
  if($FullHosted){
    $taskSessionReport=Join-Path $taskWork 'hosted-lan/production-sessions.json'
    $env:KSESSION_LAN_SESSION_REPORT=$taskSessionReport
    $env:NODE_PATH=Join-Path $taskPortable '解包程序 中文 with spaces/K-SESSION/app/node_modules'
    try{
      & $taskNode --test --test-concurrency=1 (Join-Path $taskRepo 'tools/tests/lan-host/production-sessions.test.cjs')
      if($LASTEXITCODE -ne 0){throw 'Production LAN handler session gate failed'}
    }finally{
      Remove-Item Env:KSESSION_LAN_SESSION_REPORT,Env:NODE_PATH -ErrorAction SilentlyContinue
    }
  }
  $env:KSESSION_SETUP_BUILD=$taskWork
  $env:KSESSION_SETUP_ARTIFACT=$taskArtifact
  $env:KSESSION_SETUP_EVIDENCE=Join-Path $taskWork 'installer-tests'
  $env:KSESSION_SETUP_UPGRADE_EVIDENCE=Join-Path $taskWork 'upgrade-tests'
  $env:KSESSION_PORTABLE_REPO=$taskRepo
  $taskGo=Join-Path $taskPortable 'go-tool/go/bin/go.exe'
  Set-FixedStage 'OFFLINE_LIFECYCLE'
  & (Join-Path $PSScriptRoot 'offline-ci-beta3.ps1') -Work (Join-Path $taskWork 'offline-gate') `
    -Go $taskGo -Node $taskNode -LauncherSource (Join-Path $taskRepo 'tools/windows-launcher') -DiagnosticHosted:$DiagnosticHosted
  if($LASTEXITCODE -ne 0){throw 'Offline beta3 lifecycle failed'}
  $taskInstalled=Join-Path $env:KSESSION_SETUP_UPGRADE_EVIDENCE 'installed-program/program'
  $taskInstance=Join-Path 'D:\' ('KSESSION-B4-UPGRADE-'+$Commit.Substring(0,12)+'/synthetic-instance')
  $taskFirewallReport=Join-Path $taskWork 'firewall-tests/firewall-hosted-gate.json'
  Set-FixedStage 'FIREWALL'
  & (Join-Path $taskRepo 'tools/tests/lan-host/firewall-hosted-gate.ps1') `
    -Helper (Join-Path $taskInstalled 'K-SESSION-Firewall.exe') -Instance $taskInstance `
    -Program (Join-Path $taskInstalled 'runtime/node.exe') -Output $taskFirewallReport
  if($LASTEXITCODE -ne 0){throw 'Hosted NetSecurity gate failed'}
  if($FullHosted){Copy-Item -LiteralPath (Join-Path $env:KSESSION_SETUP_EVIDENCE 'BETA3-INSTALLER-TEST-REPORT.json') -Destination $taskArtifact}
  Copy-Item -LiteralPath (Join-Path $env:KSESSION_SETUP_UPGRADE_EVIDENCE 'BETA3-UPGRADE-TEST-REPORT.json') -Destination $taskArtifact
  Copy-Item -LiteralPath (Join-Path $taskWork 'offline-gate/offline-network.json') -Destination $taskArtifact
  Copy-Item -LiteralPath $taskHostedReport -Destination $taskArtifact
  if($FullHosted){Copy-Item -LiteralPath $taskSessionReport -Destination $taskArtifact}
  Copy-Item -LiteralPath $taskFirewallReport -Destination $taskArtifact
  $taskLifecycle='PASS'
}
Set-FixedStage 'ARTIFACT_ASSEMBLY'
$taskCompatibilityReport=Get-Content -Raw -LiteralPath $taskCompatibility|ConvertFrom-Json
$taskCompatibilityReport|Add-Member -NotePropertyName frozenBeta1ToBeta2Regression -NotePropertyValue 'PASS'
$taskCompatibilityReport|Add-Member -NotePropertyName actualSetupLifecycle -NotePropertyValue $taskLifecycle
$taskCompatibilityReport|ConvertTo-Json -Depth 8|Set-Content -Encoding utf8 -LiteralPath (Join-Path $taskArtifact 'beta3-compatibility-report.json')
Copy-Item -LiteralPath $taskStageReport -Destination $taskArtifact
Set-FixedStage 'COMPLETE' 'PASS'
# Refresh the artifact copy after the final state transition.
Copy-Item -LiteralPath $taskStageReport -Destination (Join-Path $taskArtifact (Split-Path $taskStageReport -Leaf)) -Force
Write-Output 'BETA3 LAN CANDIDATE BUILT; actual accepted-F3 upgrade lifecycle and real LAN acceptance remain pending'
