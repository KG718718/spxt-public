param([Parameter(Mandatory=$true)][string]$RuntimeRoot,[Parameter(Mandatory=$true)][string]$OutputDir,[Parameter(Mandatory=$true)][string]$SourceCommit,[string]$FirewallHelperSha256='',[string]$GoExe='go',[switch]$FreshTrial)
$ErrorActionPreference='Stop'
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
$env:TEMP=$env:GOTMPDIR;$env:TMP=$env:GOTMPDIR
$env:GOPROXY='off';$env:GOSUMDB='off';$env:GOENV='off';$env:GOFLAGS='';$env:GOEXPERIMENT=''
Push-Location $PSScriptRoot
try {
 & $GoExe test -count=1 -run '^Test(RelativePathSafety|EnvironmentAllowlist|InstanceOutsidePackage|RuntimeMissing|JobOwnsOnlyChild|InstallDataSafety|LANReadyRequiresEveryGate|FixedServerStatusesMapToProductStates|CandidateAndJSONAreStrict|EnvironmentLANModeIsExplicitAndAllowlisted|ExactListenerOwnershipRejectsWildcardThirdNICPortAndPIDImpersonationRows|CopyURLSourceIsOnlyCurrentPrivateEndpoint|PersistedPortNeverSilentlyFallsThroughRange|FirewallHelperFixedHashBeforeElevation|FirewallHelperAbsentHashKeepsHistoricalLocalMode|FirewallEnvironmentFailureIsFailClosed|FirewallInterfaceNameArgumentIsQuoted|EnableRejectionRestoresDisabledPreferenceAndLocalChild|LANSettingsTransitionDoesNotBlockUIThread|TransitionStartFailureRestoresOldConfigAndService|FirstTransitionStartFailureKeepsDeterminedPort|TransitionRejectsUnexpectedFallbackPort|FailedRefreshRevokesStaleCopyURL|FreshDiscoveryMismatchRevokesCopyURL|FreshDiscoveryMatchPublishesURLWhenFirewallBlocked|StopDispatchRetriesBusyOwnedWindow|StopDispatchKeepsStrictOverallTimeout|StrictLocalStatusAndActualPIDSocketOwnership)$' ./...
 if($LASTEXITCODE -ne 0){throw 'Go tests failed'}
 if($FreshTrial){
   . (Join-Path $PSScriptRoot '../windows-firewall/test-environment.ps1')
   $taskFreshTests=@('TestFreshLogonPlanIsCurrentUserInstalledOnly','TestFreshEnvironmentAndNetworkBindingFailClosed')
   $taskFreshRaw=Join-Path $taskScratch 'fresh-launcher-tests.jsonl'
   & $GoExe test -tags fresh_trial_tests -json -count=1 -run ('^(' + ($taskFreshTests -join '|') + ')$') . *> $taskFreshRaw
   $taskFreshExit=$LASTEXITCODE;$taskFreshSummary=Read-KSessionGoTestSummary $taskFreshRaw
   if($taskFreshExit -ne 0 -or $taskFreshSummary.JSONInvalid -or $taskFreshSummary.PackagePass -ne 1 -or $taskFreshSummary.PackageFail -ne 0 -or @($taskFreshSummary.FailedNames).Count -ne 0 -or @($taskFreshSummary.SkippedNames).Count -ne 0 -or (Compare-Object @($taskFreshTests|Sort-Object) @($taskFreshSummary.Passed|Sort-Object))){throw 'Fresh Launcher policy gate failed'}
 }
 $taskFlags="-H windowsgui -s -w -buildid= -X main.buildCommit=$SourceCommit -X main.runtimeHash=$taskHash -X main.firewallHelperHash=$FirewallHelperSha256"
 if($FreshTrial){$taskFlags+=' -X main.freshTrial=1'}
 & $GoExe build -trimpath -buildvcs=false -ldflags $taskFlags -o (Join-Path $taskOutput 'K-SESSION.exe') .
 if($LASTEXITCODE -ne 0){throw 'Go build failed'}
} finally {Pop-Location}
$taskExe=Join-Path $taskOutput 'K-SESSION.exe'
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
