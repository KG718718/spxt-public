param(
  [Parameter(Mandatory=$true)][string]$RepositoryRoot,
  [Parameter(Mandatory=$true)][string]$ReportPath,
  [Parameter(Mandatory=$true)][string]$SourceCommit
)
$ErrorActionPreference='Stop'
$taskFailed=$false
$taskStatus='FAIL'
$taskSafeCommit=$SourceCommit

function Write-KSessionStaticGateReport {
  param([Parameter(Mandatory=$true)][string]$Status)
  $taskReport=[ordered]@{schema=1;status=$Status;gate='HISTORICAL_IDENTITY_STATIC';sourceCommit=$taskSafeCommit}
  $taskBytes=[Text.UTF8Encoding]::new($false).GetBytes(($taskReport|ConvertTo-Json -Compress)+"`n")
  $taskStream=[IO.File]::Open($ReportPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$taskStream.Write($taskBytes,0,$taskBytes.Length);$taskStream.Flush($true)}finally{$taskStream.Dispose()}
}

if($SourceCommit -cnotmatch '^[a-f0-9]{40}$' -or ![IO.Path]::IsPathFullyQualified($RepositoryRoot) -or
   ![IO.Path]::IsPathFullyQualified($ReportPath) -or !(Test-Path -LiteralPath $RepositoryRoot -PathType Container) -or
   !(Test-Path -LiteralPath (Split-Path -Parent $ReportPath) -PathType Container) -or (Test-Path -LiteralPath $ReportPath)){
  exit 40
}

try {
  $taskRoot=(Resolve-Path -LiteralPath $RepositoryRoot).Path
  Push-Location -LiteralPath $taskRoot
  try {
    $taskCommands=@(
      [pscustomobject]@{Args=@('--check','tools/windows-installer/historical-identity/index.cjs')},
      [pscustomobject]@{Args=@('--check','tools/windows-installer/historical-identity/cli.cjs')},
      [pscustomobject]@{Args=@('--test','tools/tests/windows-installer/historical-identity/historical-identity.test.cjs')},
      [pscustomobject]@{Args=@('--test','tools/tests/windows-installer/upgrade-detection/upgrade-detection.test.cjs')},
      [pscustomobject]@{Args=@('--test','tools/tests/windows-installer/upgrade-preflight/preflight.test.cjs')},
      [pscustomobject]@{Args=@('tools/tests/windows-installer/contract.cjs')}
    )
    foreach($taskCommand in $taskCommands){
      $taskNativeArgs=$taskCommand.Args
      & node @taskNativeArgs *> $null
      if($LASTEXITCODE -ne 0){throw 'STATIC_GATE_COMMAND_FAILED'}
    }
    $taskStatus='PASS'
  } finally { Pop-Location }
} catch {
  $taskFailed=$true
} finally {
  try { Write-KSessionStaticGateReport -Status $taskStatus }
  catch { $taskFailed=$true }
}
if($taskFailed){exit 41}
