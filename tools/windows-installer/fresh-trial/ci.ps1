param([Parameter(Mandatory=$true)][string]$Work)
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$taskWork=[IO.Path]::GetFullPath($Work)
$taskContext=Get-Content -Raw -LiteralPath (Join-Path $taskWork 'context.json')|ConvertFrom-Json
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public' -or
   $taskContext.controlCommit -cne $env:GITHUB_SHA -or $env:GITHUB_RUN_ATTEMPT -ne '1' -or $taskContext.run.id -ne $env:GITHUB_RUN_ID -or
   $taskWork -notmatch '^E:\\' -or (git -C $taskRepo rev-parse HEAD).Trim() -cne $taskContext.sourceCommit){throw 'Fresh source context rejected'}
$taskReportPath=Join-Path $taskWork 'fresh-report.json'
$taskReport=Get-Content -Raw -LiteralPath $taskReportPath|ConvertFrom-Json
. (Join-Path $taskRepo 'tools/tests/lan-host/node-test-environment.ps1')
$taskVariables=@('TEMP','TMP','GOCACHE','GOTMPDIR','GOOS','GOARCH','CGO_ENABLED','GOTOOLCHAIN','GOPROXY','GOSUMDB','GOENV','GOWORK','GOFLAGS','GOEXPERIMENT','NODE_PATH','NODE_OPTIONS','PLAYWRIGHT_BROWSERS_PATH','KSESSION_FRESH_TESTED_SOURCE','KSESSION_FRESH_BUILD_NODE')
$taskPrevious=Save-KSessionProcessEnvironment $taskVariables
$taskFinalStarted=$false
$taskToolchainStarted=$false;$taskToolchainOwned=$false;$taskToolchainRestored=$true
$taskBuildDiagnostic=Join-Path $taskWork 'build-diagnostic.json'
function Stage([string]$Reason){
  $taskReport.stage='BUILD';$taskReport.reason=$Reason
  $taskPhase=switch($Reason){'BUILD_PORTABLE_FAILED'{'RUNTIME'}'BUILD_TOOLCHAIN_FAILED'{'TOOLCHAIN'}'BUILD_COMPILER_FAILED'{'ISCC'}'BROWSER_TOOL_FAILED'{'BROWSER_TOOL'}default{'ASSEMBLY'}}
  $taskReport.buildDiagnostic=[pscustomobject]@{stage=$taskPhase;classification='COMMAND_FAILED';script=$null;line=$null}
  [IO.File]::WriteAllText($taskBuildDiagnostic,($taskReport.buildDiagnostic|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($taskReportPath,($taskReport|ConvertTo-Json -Depth 12 -Compress)+"`n",[Text.UTF8Encoding]::new($false))
}
function User-Uninstall-Snapshot {
  $taskMap=[ordered]@{}
  foreach($taskView in @([Microsoft.Win32.RegistryView]::Registry64,[Microsoft.Win32.RegistryView]::Registry32)){
    $taskHive=[Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,$taskView)
    try{
      $taskParent=$taskHive.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Uninstall')
      if($null -eq $taskParent){continue}
      try{foreach($taskName in @($taskParent.GetSubKeyNames()|Sort-Object)){
        $taskKey=$taskParent.OpenSubKey($taskName);if($null -eq $taskKey){throw 'User registration unknown'}
        try{$taskValues=[ordered]@{};foreach($taskValue in @($taskKey.GetValueNames()|Sort-Object)){$taskValues[$taskValue]=$taskKey.GetValue($taskValue)};if($taskKey.GetSubKeyNames().Count -ne 0){$taskValues['_nested']=$true};$taskMap[([string]$taskView+':'+$taskName)]=$taskValues}finally{$taskKey.Dispose()}
      }}finally{$taskParent.Dispose()}
    }finally{$taskHive.Dispose()}
  }
  return $taskMap
}
function Checked([string]$Exe,[string[]]$Arguments){& $Exe @Arguments;if($LASTEXITCODE -ne 0){throw 'Fresh checked command failed'}}
function Pinned([string]$Uri,[string]$Hash,[string]$Zip,[string]$Output){Invoke-WebRequest -Uri $Uri -OutFile $Zip -TimeoutSec 240;if((Get-FileHash -LiteralPath $Zip -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Hash){throw 'Pinned tool identity rejected'};Expand-Archive -LiteralPath $Zip -DestinationPath $Output}
try {
  $env:NODE_OPTIONS='';$env:GOWORK='off';$env:KSESSION_FRESH_TESTED_SOURCE=$taskContext.sourceCommit
  if($taskContext.mode -eq 'CANDIDATE'){
    Stage 'BUILD_PORTABLE_FAILED'
    $taskPortable=Join-Path $taskWork 'portable'
    & (Join-Path $PSScriptRoot 'build-payload.ps1') -Work $taskPortable -Commit $taskContext.sourceCommit -BuildDiagnostic $taskBuildDiagnostic
    if($LASTEXITCODE -ne 0){throw 'Fresh portable build failed'}
    $taskNode=Join-Path $taskPortable 'node-tool/node-v24.21.0-win-x64/node.exe'
    $taskGo=Join-Path $taskPortable 'go-tool/go/bin/go.exe'
    Stage 'BUILD_TOOLCHAIN_FAILED'
    $taskUserBefore=User-Uninstall-Snapshot
    foreach($taskValue in $taskUserBefore.Values){if([string]$taskValue.DisplayName -match '^Inno Setup'){throw 'Existing user compiler registration; refuse install'}}
    $taskToolchainStarted=$true;$taskToolchainRestored=$false
    & (Join-Path $taskRepo 'tools/windows-installer/toolchain.ps1') -Work (Join-Path $taskWork 'inno')
    if($LASTEXITCODE -ne 0){throw 'Fresh compiler toolchain failed'}
    $taskUserAfter=User-Uninstall-Snapshot
    foreach($taskKey in $taskUserBefore.Keys){if(!$taskUserAfter.Contains($taskKey) -or ($taskUserAfter[$taskKey]|ConvertTo-Json -Depth 8 -Compress) -cne ($taskUserBefore[$taskKey]|ConvertTo-Json -Depth 8 -Compress)){throw 'User registration changed; ownership unknown'}}
    $taskNewKeys=@($taskUserAfter.Keys|Where-Object{!$taskUserBefore.Contains($_)})
    if($taskNewKeys.Count -ne 1){throw 'Compiler registration ownership unknown'}
    $taskCompilerRegistration=$taskUserAfter[$taskNewKeys[0]]
    if([string]$taskCompilerRegistration.DisplayName -notmatch '^Inno Setup' -or [string]$taskCompilerRegistration.InstallLocation -ine (Join-Path $taskWork 'inno/compiler') -or $taskCompilerRegistration.Contains('_nested')){throw 'Compiler registration ownership unknown'}
    $taskCompilerUninstall=Join-Path $taskWork 'inno/compiler/unins000.exe'
    if(!(Test-Path -LiteralPath $taskCompilerUninstall -PathType Leaf)){throw 'Compiler uninstaller unknown'}
    $taskCompilerUninstallHash=(Get-FileHash -LiteralPath $taskCompilerUninstall -Algorithm SHA256).Hash
    $taskToolchainOwned=$true
    Stage 'BUILD_COMPILER_FAILED'
    Checked $taskNode @((Join-Path $PSScriptRoot 'build.cjs'),$taskPortable,(Join-Path $taskWork 'inno/compiler'),(Join-Path $taskWork 'setup'),$taskContext.sourceCommit)
    Copy-Item -LiteralPath (Join-Path $taskWork 'setup/artifact') -Destination (Join-Path $taskWork 'artifact') -Recurse
  }elseif($taskContext.mode -eq 'QA'){
    Stage 'BUILD_TOOLCHAIN_FAILED'
    $taskDistribution=Get-Content -Raw -LiteralPath (Join-Path $taskRepo 'tools/installer/distribution.json')|ConvertFrom-Json
    $taskGoPin=Get-Content -Raw -LiteralPath (Join-Path $taskRepo 'tools/windows-launcher/toolchain.json')|ConvertFrom-Json
    Pinned $taskDistribution.nodeUrl $taskDistribution.nodeArchiveSha256 (Join-Path $taskWork 'node.zip') (Join-Path $taskWork 'node-tool')
    Pinned $taskGoPin.goWindowsZip $taskGoPin.sha256 (Join-Path $taskWork 'go.zip') (Join-Path $taskWork 'go-tool')
    $taskNode=Join-Path $taskWork 'node-tool/node-v24.21.0-win-x64/node.exe';$taskGo=Join-Path $taskWork 'go-tool/go/bin/go.exe'
    if((Get-FileHash -LiteralPath $taskNode -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskDistribution.nodeExeSha256){throw 'QA Node identity failed'}
    # Only immutable artifact extraction. No Runtime/Launcher/helper/Setup rebuild in QA.
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $taskZip=[IO.Compression.ZipFile]::OpenRead((Join-Path $taskWork 'candidate.zip'))
    try{
      $taskNames=@('K-SESSION-Fresh-Trial-1.1.0-beta.4.exe','K-SESSION-Fresh-Trial-1.1.0-beta.4.exe.sha256','build-info.json','installer-manifest.json','LICENSE-Inno-Setup.txt','license-summary.json','fresh-report.json')
      if($taskZip.Entries.Count -ne $taskNames.Count -or (Compare-Object ($taskNames|Sort-Object) @($taskZip.Entries.FullName|Sort-Object))){throw 'QA artifact allowlist failed'}
      if(@($taskZip.Entries|Where-Object{$_.Length -lt 1 -or $_.Length -gt 512MB}).Count -ne 0){throw 'QA artifact bound failed'}
      New-Item -ItemType Directory -Path (Join-Path $taskWork 'artifact')|Out-Null
      foreach($taskEntry in $taskZip.Entries){[IO.Compression.ZipFileExtensions]::ExtractToFile($taskEntry,(Join-Path $taskWork "artifact/$($taskEntry.FullName)"),$false)}
    }finally{$taskZip.Dispose()}
  }else{throw 'Fresh mode rejected'}
  Stage 'BROWSER_TOOL_FAILED'
  $taskBrowser=Join-Path $taskWork 'browser-tool';Copy-Item -LiteralPath (Join-Path $taskRepo 'tools/tests/fresh-lan-trial/browser-tool') -Destination $taskBrowser -Recurse
  $taskNpm=Join-Path (Split-Path $taskNode) 'node_modules/npm/bin/npm-cli.js'
  Push-Location $taskBrowser
  try{Checked $taskNode @($taskNpm,'ci','--ignore-scripts','--omit=optional','--bin-links=false','--no-audit','--no-fund','--cache',(Join-Path $taskWork 'browser-cache'))}finally{Pop-Location}
  $env:PLAYWRIGHT_BROWSERS_PATH=Join-Path $taskWork 'browser-binaries';$env:NODE_PATH=Join-Path $taskBrowser 'node_modules'
  Checked $taskNode @((Join-Path $taskBrowser 'node_modules/playwright-core/cli.js'),'install','chromium')
  $env:GOTOOLCHAIN='local';$env:GOPROXY='off';$env:GOSUMDB='off';$env:GOENV='off';$env:GOWORK='off';$env:CGO_ENABLED='0';$env:GOOS='windows';$env:GOARCH='amd64';$env:GOFLAGS='';$env:GOEXPERIMENT=''
  $env:GOCACHE=Join-Path $taskWork 'test-go-cache';$env:GOTMPDIR=Join-Path $taskWork 'test-go-temp';New-Item -ItemType Directory -Force -Path $env:GOCACHE,$env:GOTMPDIR|Out-Null
  $env:TEMP=$env:GOTMPDIR;$env:TMP=$env:GOTMPDIR
  $taskFinalStarted=$true
  Checked $taskNode @((Join-Path $PSScriptRoot 'hosted-run.cjs'),$taskRepo,$taskWork,$taskNode,$taskGo)
}catch{
  if(!$taskFinalStarted){$taskReport.status='FAIL';[IO.File]::WriteAllText($taskReportPath,($taskReport|ConvertTo-Json -Depth 12 -Compress)+"`n",[Text.UTF8Encoding]::new($false))}
  $script:taskFailed=$true
}finally{
  if($taskToolchainStarted){
    try{
      if(!$taskToolchainOwned){throw 'Compiler cleanup unproven'}
      $taskCurrentUser=User-Uninstall-Snapshot
      if(($taskCurrentUser|ConvertTo-Json -Depth 8 -Compress) -cne ($taskUserAfter|ConvertTo-Json -Depth 8 -Compress) -or (Get-FileHash -LiteralPath $taskCompilerUninstall -Algorithm SHA256).Hash -cne $taskCompilerUninstallHash -or (((Get-Item -LiteralPath $taskCompilerUninstall).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)){throw 'Compiler ownership changed'}
      $taskToolCleanup=Start-Process -FilePath $taskCompilerUninstall -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') -WindowStyle Hidden -PassThru -Wait
      if($taskToolCleanup.ExitCode -ne 0 -or ((User-Uninstall-Snapshot)|ConvertTo-Json -Depth 8 -Compress) -cne ($taskUserBefore|ConvertTo-Json -Depth 8 -Compress) -or (Test-Path -LiteralPath $taskCompilerUninstall)){throw 'Compiler cleanup failed'}
      $taskToolchainRestored=$true
    }catch{$taskToolchainRestored=$false;$script:taskFailed=$true}
  }
  Restore-KSessionProcessEnvironment $taskPrevious
  $taskFinal=Get-Content -Raw -LiteralPath $taskReportPath|ConvertFrom-Json
  $taskFinal.cleanup.environmentRestored=(Test-KSessionProcessEnvironmentRestored $taskPrevious)
  $taskFinal.cleanup.ownedToolchainAbsent=$taskToolchainRestored
  if(Test-Path -LiteralPath $taskBuildDiagnostic){$taskFinal.buildDiagnostic=Get-Content -Raw -LiteralPath $taskBuildDiagnostic|ConvertFrom-Json}
  if(!$taskFinalStarted){$taskFinal.cleanup.ownedLauncherExited=$true;$taskFinal.cleanup.ownedNodeExited=$true;$taskFinal.cleanup.handlesClosed=$true;$taskFinal.cleanup.lockReleased=$true;$taskFinal.cleanup.ownedRulesAbsent=$true;$taskFinal.cleanup.ownedRegistrationAbsent=$true;$taskFinal.cleanup.ownedShortcutsAbsent=$true}
  if(!$taskFinal.cleanup.environmentRestored -or !$taskToolchainRestored){$taskFinal.status='FAIL';$taskFinal.reason='CLEANUP_UNPROVEN';if($taskFinal.stage -eq 'COMPLETE'){$taskFinal.stage='F09'};$script:taskFailed=$true}
  [IO.File]::WriteAllText($taskReportPath,($taskFinal|ConvertTo-Json -Depth 12 -Compress)+"`n",[Text.UTF8Encoding]::new($false))
  if($taskFinal.status -eq 'FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING'){Copy-Item -LiteralPath $taskReportPath -Destination (Join-Path $taskWork 'artifact/fresh-report.json')}
}
if($script:taskFailed){exit 1}
