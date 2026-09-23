param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Work
)
$ErrorActionPreference='Stop'
$taskCurrent=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$taskSource=(Resolve-Path -LiteralPath $Source).Path
$taskWork=[IO.Path]::GetFullPath($Work)
$taskCommit='e9417f036d0cdf736ff84682556a994040f0de0b'
$taskTree='5da66cb9b73dfa307948634634bfab2cfaaead12'
if($taskSource -notmatch '^E:\\' -or $taskWork -notmatch '^E:\\' -or (Test-Path -LiteralPath $taskWork)){throw 'Exact beta.1 source and fresh build output must be on E'}
$taskHostNode=(Get-Command node).Source
& $taskHostNode (Join-Path $taskCurrent 'tools/windows-installer/verify-beta1-source.cjs') $taskSource
if($LASTEXITCODE -ne 0){throw 'BETA1_SOURCE_VERIFICATION_FAILED'}
New-Item -ItemType Directory -Path $taskWork|Out-Null
$taskPortable=Join-Path $taskWork 'portable'
& (Join-Path $taskSource 'tools/windows-portable/ci.ps1') -Work $taskPortable -Commit $taskCommit
if($LASTEXITCODE -ne 0){throw 'beta.1 Runtime/Launcher/Portable build failed'}
$taskNode=Join-Path $taskPortable 'node-tool/node-v24.21.0-win-x64/node.exe'
& $taskNode (Join-Path $taskSource 'tools/tests/windows-installer/contract.cjs')
if($LASTEXITCODE -ne 0){throw 'beta.1 installer contract failed'}
& (Join-Path $taskSource 'tools/windows-installer/toolchain.ps1') -Work (Join-Path $taskWork 'toolchain')
if($LASTEXITCODE -ne 0){throw 'beta.1 installer toolchain failed'}
& $taskNode (Join-Path $taskSource 'tools/windows-installer/build.cjs') $taskPortable (Join-Path $taskWork 'toolchain/compiler') (Join-Path $taskWork 'candidate') $taskCommit 'candidate'
if($LASTEXITCODE -ne 0){throw 'beta.1 candidate Setup build failed'}
& $taskNode (Join-Path $taskCurrent 'tools/windows-installer/verify-beta1-build.cjs') $taskWork (Join-Path $taskWork 'BETA1-BUILD-ONLY-REPORT.json')
if($LASTEXITCODE -ne 0){throw 'beta.1 build-only integrity verification failed'}
Write-Output 'EXACT BETA.1 BUILD-ONLY PASS; HISTORICAL GUI REGRESSION NOT RUN'
