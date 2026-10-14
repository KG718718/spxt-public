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
$taskVariables=@('TEMP','TMP','GOCACHE','GOTMPDIR','GOOS','GOARCH','CGO_ENABLED','GOTOOLCHAIN','GOPROXY','GOSUMDB','GOENV','GOWORK','GOFLAGS','GOEXPERIMENT','NODE_PATH','NODE_OPTIONS','PLAYWRIGHT_BROWSERS_PATH','KSESSION_FRESH_TESTED_SOURCE')
$taskPrevious=Save-KSessionProcessEnvironment $taskVariables
$taskFinalStarted=$false
function Stage([string]$Reason){$taskReport.stage='BUILD';$taskReport.reason=$Reason;[IO.File]::WriteAllText($taskReportPath,($taskReport|ConvertTo-Json -Depth 12 -Compress)+"`n",[Text.UTF8Encoding]::new($false))}
function Checked([string]$Exe,[string[]]$Arguments){& $Exe @Arguments;if($LASTEXITCODE -ne 0){throw 'Fresh checked command failed'}}
function Pinned([string]$Uri,[string]$Hash,[string]$Zip,[string]$Output){Invoke-WebRequest -Uri $Uri -OutFile $Zip -TimeoutSec 240;if((Get-FileHash -LiteralPath $Zip -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Hash){throw 'Pinned tool identity rejected'};Expand-Archive -LiteralPath $Zip -DestinationPath $Output}
try {
  $env:NODE_OPTIONS='';$env:GOWORK='off';$env:KSESSION_FRESH_TESTED_SOURCE=$taskContext.sourceCommit
  if($taskContext.mode -eq 'CANDIDATE'){
    Stage 'BUILD_PORTABLE_FAILED'
    $taskPortable=Join-Path $taskWork 'portable'
    & (Join-Path $taskRepo 'tools/windows-portable/ci-lan.ps1') -Work $taskPortable -Commit $taskContext.sourceCommit -FreshTrial
    if($LASTEXITCODE -ne 0){throw 'Fresh portable build failed'}
    $taskNode=Join-Path $taskPortable 'node-tool/node-v24.21.0-win-x64/node.exe'
    $taskGo=Join-Path $taskPortable 'go-tool/go/bin/go.exe'
    Stage 'BUILD_TOOLCHAIN_FAILED'
    & (Join-Path $taskRepo 'tools/windows-installer/toolchain.ps1') -Work (Join-Path $taskWork 'inno')
    if($LASTEXITCODE -ne 0){throw 'Fresh compiler toolchain failed'}
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
  Restore-KSessionProcessEnvironment $taskPrevious
  $taskFinal=Get-Content -Raw -LiteralPath $taskReportPath|ConvertFrom-Json
  $taskFinal.cleanup.environmentRestored=$true
  if(!$taskFinalStarted){$taskFinal.cleanup.ownedLauncherExited=$true;$taskFinal.cleanup.ownedNodeExited=$true;$taskFinal.cleanup.handlesClosed=$true;$taskFinal.cleanup.lockReleased=$true;$taskFinal.cleanup.ownedRulesAbsent=$true}
  [IO.File]::WriteAllText($taskReportPath,($taskFinal|ConvertTo-Json -Depth 12 -Compress)+"`n",[Text.UTF8Encoding]::new($false))
  if($taskFinal.status -eq 'FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING'){Copy-Item -LiteralPath $taskReportPath -Destination (Join-Path $taskWork 'artifact/fresh-report.json')}
}
if($script:taskFailed){exit 1}
