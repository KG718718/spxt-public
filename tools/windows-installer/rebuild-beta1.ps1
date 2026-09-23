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
$taskGit=(Get-Command git).Source
if([IO.Path]::GetFullPath((& $taskGit -C $taskSource rev-parse --show-toplevel).Trim()) -ne $taskSource -or
   (& $taskGit -C $taskSource rev-parse HEAD).Trim() -ne $taskCommit -or
   (& $taskGit -C $taskSource rev-parse 'HEAD^{tree}').Trim() -ne $taskTree -or
   (& $taskGit -C $taskSource status --porcelain --untracked-files=no)){throw 'Exact clean beta.1 checkout required'}
$taskBlobs=[ordered]@{
 'package-lock.json'='46ee051e66e3a3cf32f97054a8da6d8e9dbf2f5b'
 'tools/installer/distribution.json'='1ba8274bd78d3e68cc3b7f05e7cc25f26664444f'
 'tools/windows-runtime/build.cjs'='a08178fbb484ce9cf234569af8b2d2682334d4cb'
 'tools/windows-launcher/go.mod'='9dd0946b06476835ace75579599b892efff28820'
 'tools/windows-launcher/toolchain.json'='bd3f69cd6a0185a1b0a02e8f0f1f3878cacb8a15'
 'tools/windows-launcher/build.ps1'='19e93893a4de57724e0eff088789b07e2e4b8220'
 'tools/windows-portable/ci.ps1'='7bd4c0c249f71a49750457619b99282da9eee729'
 'tools/windows-installer/toolchain.json'='997eaf1c4351ecaa7d1413e56b79d06dca07a437'
 'tools/windows-installer/toolchain.ps1'='489099a99919326ad2705e696d9804ccab7f13dc'
 'tools/windows-installer/build.cjs'='54b6d705d7497877b42c292ac16d8aa11aa5b2d3'
 'tools/windows-installer/setup.iss'='2a11cd2d1ff64edfb297b85bff3767371e0fcead'
 'tools/tests/windows-installer/contract.cjs'='0d7be20e5068a3d6cad61371fbe30f46da022132'
}
foreach($taskEntry in $taskBlobs.GetEnumerator()){
 $taskActual=(& $taskGit hash-object (Join-Path $taskSource $taskEntry.Key)).Trim()
 if($taskActual -ne $taskEntry.Value){throw ('beta.1 build input mismatch: '+$taskEntry.Key)}
}
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
