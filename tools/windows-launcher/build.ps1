param([Parameter(Mandatory=$true)][string]$RuntimeRoot,[Parameter(Mandatory=$true)][string]$OutputDir,[Parameter(Mandatory=$true)][string]$SourceCommit,[string]$FirewallHelperSha256='',[string]$GoExe='go',[switch]$FreshTrial,[string]$BuildDiagnostic='')
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../tests/fresh-lan-trial/memory-process.ps1')
function Fresh-Build-Stage([string]$Stage){if($FreshTrial -and $BuildDiagnostic){[IO.File]::WriteAllText($BuildDiagnostic,(@{stage=$Stage;classification='COMMAND_FAILED';script=$null;line=$null}|ConvertTo-Json -Compress)+"`n",[Text.UTF8Encoding]::new($false))}}
Fresh-Build-Stage 'LAUNCHER_IDENTITY'
$taskRoot=(Resolve-Path -LiteralPath $RuntimeRoot).Path
$taskOutput=[IO.Path]::GetFullPath($OutputDir)
if(Test-Path -LiteralPath $taskOutput){throw 'Output must be new; never overwrite artifacts'}
if($SourceCommit -notmatch '^[a-f0-9]{40}$'){throw 'Exact commit required'}
if($FirewallHelperSha256 -ne '' -and $FirewallHelperSha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'Exact lowercase Firewall helper SHA256 required'}
$taskGoVersion=& $GoExe version
if($taskGoVersion -ne 'go version go1.27.1 windows/amd64'){throw 'Pinned Go 1.27.1 Windows amd64 required'}
$taskManifest=Join-Path $taskRoot 'manifest/runtime-manifest.json'
$taskHash=(Get-FileHash -LiteralPath $taskManifest -Algorithm SHA256).Hash.ToLower()
if($FreshTrial){
  $taskRuntimeManifest=Get-Content -Raw -LiteralPath $taskManifest|ConvertFrom-Json
  if($taskRuntimeManifest.deriveProfile.profile -ne 'fresh-trial' -or $FirewallHelperSha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'Fresh Runtime profile and helper identity required'}
  if((Get-Content -Raw -LiteralPath (Join-Path $taskRoot 'app/public-lan-network.js')) -notmatch 'const FRESH_TRIAL_BUILD = true'){throw 'Fresh Runtime marker required'}
}
New-Item -ItemType Directory -Path $taskOutput | Out-Null
$env:GOOS='windows';$env:GOARCH='amd64';$env:CGO_ENABLED='0';$env:GOTOOLCHAIN='local'
$taskScratch=Join-Path (Split-Path $taskRoot) 'launcher-build-cache'
$env:GOCACHE=Join-Path $taskScratch 'go-cache'
$env:GOTMPDIR=Join-Path $taskScratch 'go-temp'
New-Item -ItemType Directory -Force -Path $env:GOCACHE,$env:GOTMPDIR | Out-Null
if($FreshTrial){
  . (Join-Path $PSScriptRoot '../windows-firewall/test-environment.ps1')
  # The fresh build may live on an owned SUBST volume; safety fixtures must use
  # the physical directory, so canonical identity checks stay unchanged.
  $taskScratch=Resolve-KSessionFirewallPhysicalPath $taskScratch
  $env:GOCACHE=Join-Path $taskScratch 'go-cache';$env:GOTMPDIR=Join-Path $taskScratch 'go-temp'
}
$env:TEMP=$env:GOTMPDIR;$env:TMP=$env:GOTMPDIR
$env:GOPROXY='off';$env:GOSUMDB='off';$env:GOENV='off';$env:GOFLAGS='';$env:GOEXPERIMENT=''
Push-Location $PSScriptRoot
try {
 Fresh-Build-Stage 'LAUNCHER_STANDARD_TESTS'
 $taskStandardResult=Invoke-KSessionMemoryProcess $GoExe @('test','-count=1','-run','^Test(RelativePathSafety|EnvironmentAllowlist|InstanceOutsidePackage|RuntimeMissing|JobOwnsOnlyChild|InstallDataSafety|LANReadyRequiresEveryGate|FixedServerStatusesMapToProductStates|CandidateAndJSONAreStrict|EnvironmentLANModeIsExplicitAndAllowlisted|ExactListenerOwnershipRejectsWildcardThirdNICPortAndPIDImpersonationRows|CopyURLSourceIsOnlyCurrentPrivateEndpoint|PersistedPortNeverSilentlyFallsThroughRange|FirewallHelperFixedHashBeforeElevation|FirewallHelperAbsentHashKeepsHistoricalLocalMode|FirewallEnvironmentFailureIsFailClosed|FirewallInterfaceNameArgumentIsQuoted|EnableRejectionRestoresDisabledPreferenceAndLocalChild|LANSettingsTransitionDoesNotBlockUIThread|TransitionStartFailureRestoresOldConfigAndService|FirstTransitionStartFailureKeepsDeterminedPort|TransitionRejectsUnexpectedFallbackPort|FailedRefreshRevokesStaleCopyURL|FreshDiscoveryMismatchRevokesCopyURL|FreshDiscoveryMatchPublishesURLWhenFirewallBlocked|StopDispatchRetriesBusyOwnedWindow|StopDispatchKeepsStrictOverallTimeout|StrictLocalStatusAndActualPIDSocketOwnership)$','./...')
 if($taskStandardResult.ExitCode -ne 0){throw 'Go tests failed'}
 if($FreshTrial){
   Fresh-Build-Stage 'LAUNCHER_FRESH_TESTS'
   . (Join-Path $PSScriptRoot '../windows-firewall/test-environment.ps1')
   $taskFreshTests=@('TestFreshLogonPlanIsCurrentUserInstalledOnly','TestFreshEnvironmentAndNetworkBindingFailClosed')
   $taskFreshRaw=''
   $taskFreshOverlay=Join-Path $taskScratch 'fresh-launcher-overlay.json'
   & $env:KSESSION_FRESH_BUILD_NODE (Join-Path $PSScriptRoot '../tests/fresh-lan-trial/prepare-policy-overlay.cjs') LAUNCHER $taskFreshOverlay|Out-Null
   if($LASTEXITCODE -ne 0){throw 'Fresh Launcher overlay source rejected'}
   $taskResult=Invoke-KSessionMemoryProcess $GoExe @('test','-overlay',$taskFreshOverlay,'-tags','fresh_trial_tests','-json','-count=1','-run',('^(' + ($taskFreshTests -join '|') + ')$'),'.')
   $taskFreshRaw=$taskResult.Stdout+$taskResult.Stderr
   $taskFreshExit=$taskResult.ExitCode;$taskFreshSummary=Read-KSessionGoTestSummary $taskFreshRaw -FromText
   if($taskFreshExit -ne 0 -or $taskFreshSummary.JSONInvalid -or $taskFreshSummary.PackagePass -ne 1 -or $taskFreshSummary.PackageFail -ne 0 -or @($taskFreshSummary.FailedNames).Count -ne 0 -or @($taskFreshSummary.SkippedNames).Count -ne 0 -or (Compare-Object @($taskFreshTests|Sort-Object) @($taskFreshSummary.Passed|Sort-Object))){throw 'Fresh Launcher policy gate failed'}
 }
 $taskFlags="-H windowsgui -s -w -buildid= -X main.buildCommit=$SourceCommit -X main.runtimeHash=$taskHash -X main.firewallHelperHash=$FirewallHelperSha256"
 if($FreshTrial){$taskFlags+=' -X main.freshTrial=1'}
 Fresh-Build-Stage 'LAUNCHER_COMPILE'
 $taskCompile=Invoke-KSessionMemoryProcess $GoExe @('build','-trimpath','-buildvcs=false','-ldflags',$taskFlags,'-o',(Join-Path $taskOutput 'K-SESSION.exe'),'.')
 if($taskCompile.ExitCode -ne 0){throw 'Go build failed'}
} finally {Pop-Location}
$taskExe=Join-Path $taskOutput 'K-SESSION.exe'
Fresh-Build-Stage 'LAUNCHER_IDENTITY'
$taskExeHash=(Get-FileHash -LiteralPath $taskExe -Algorithm SHA256).Hash.ToLower()
$taskInfo=[ordered]@{product='K⁺-SESSION';qualification='UNSIGNED DEVELOPMENT ARTIFACT';version='launcher development build / Batch LAN-2';sourceCommit=$SourceCommit;toolchain=$taskGoVersion;GOOS='windows';GOARCH='amd64';CGO_ENABLED='0';runtimeManifestSha256=$taskHash;firewallHelperSha256=$FirewallHelperSha256;runtimeSourceCommit=(Get-Content -Raw -LiteralPath $taskManifest|ConvertFrom-Json).sourceCommit;bytes=(Get-Item -LiteralPath $taskExe).Length;sha256=$taskExeHash}
if($FreshTrial){$taskInfo['deriveProfile']='fresh-trial';$taskInfo['freshTrialMarker']='1'}
$taskInfo | ConvertTo-Json | Set-Content -Encoding utf8 -LiteralPath (Join-Path $taskOutput 'build-info.json')
if($FreshTrial){[ordered]@{schema=1;kind='FRESH_LAUNCHER_POLICY';sourceCommit=$SourceCommit;status='PASS';expectedTests=$taskFreshTests;pass=2;fail=0;skipped=0} | ConvertTo-Json | Set-Content -Encoding utf8 -LiteralPath (Join-Path $taskOutput 'fresh-policy-report.json')}
"$taskExeHash  K-SESSION.exe" | Set-Content -Encoding ascii -LiteralPath (Join-Path $taskOutput 'SHA256SUMS.txt')
# Go links its runtime into the EXE; retain the original Go license with the artifact.
$taskGoRoot=& $GoExe env GOROOT
Copy-Item -LiteralPath (Join-Path $taskGoRoot 'LICENSE') -Destination (Join-Path $taskOutput 'LICENSE-Go.txt')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot '../../LICENSE') -Destination (Join-Path $taskOutput 'LICENSE-KSESSION.txt')
$taskInfo | ConvertTo-Json
