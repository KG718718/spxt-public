param([Parameter(Mandatory=$true)][string]$RuntimeRoot,[Parameter(Mandatory=$true)][string]$OutputDir,[Parameter(Mandatory=$true)][string]$SourceCommit,[string]$GoExe='go')
$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path -LiteralPath $RuntimeRoot).Path
$taskOutput=[IO.Path]::GetFullPath($OutputDir)
if(Test-Path -LiteralPath $taskOutput){throw 'Output must be new; never overwrite artifacts'}
if($SourceCommit -notmatch '^[a-f0-9]{40}$'){throw 'Exact commit required'}
$taskGoVersion=& $GoExe version
if($taskGoVersion -ne 'go version go1.27.1 windows/amd64'){throw 'Pinned Go 1.27.1 Windows amd64 required'}
$taskManifest=Join-Path $taskRoot 'manifest/runtime-manifest.json'
$taskHash=(Get-FileHash -LiteralPath $taskManifest -Algorithm SHA256).Hash.ToLower()
New-Item -ItemType Directory -Path $taskOutput | Out-Null
$env:GOOS='windows';$env:GOARCH='amd64';$env:CGO_ENABLED='0';$env:GOTOOLCHAIN='local'
$env:GOCACHE=Join-Path (Split-Path $taskOutput) 'go-cache'
$env:GOTMPDIR=Join-Path (Split-Path $taskOutput) 'go-temp'
New-Item -ItemType Directory -Force -Path $env:GOCACHE,$env:GOTMPDIR | Out-Null
$env:TEMP=$env:GOTMPDIR;$env:TMP=$env:GOTMPDIR
$env:GOPROXY='off';$env:GOSUMDB='off'
Push-Location $PSScriptRoot
try {
 & $GoExe test -count=1 -run 'Test(RelativePathSafety|EnvironmentAllowlist|InstanceOutsidePackage|RuntimeMissing|JobOwnsOnlyChild)$' ./...
 if($LASTEXITCODE -ne 0){throw 'Go tests failed'}
 $taskFlags="-H windowsgui -s -w -buildid= -X main.buildCommit=$SourceCommit -X main.runtimeHash=$taskHash"
 & $GoExe build -trimpath -buildvcs=false -ldflags $taskFlags -o (Join-Path $taskOutput 'K-SESSION.exe') .
 if($LASTEXITCODE -ne 0){throw 'Go build failed'}
} finally {Pop-Location}
$taskExe=Join-Path $taskOutput 'K-SESSION.exe'
$taskExeHash=(Get-FileHash -LiteralPath $taskExe -Algorithm SHA256).Hash.ToLower()
$taskInfo=[ordered]@{product='K⁺-SESSION';qualification='UNSIGNED DEVELOPMENT ARTIFACT';version='launcher development build / Batch 2A';sourceCommit=$SourceCommit;toolchain=$taskGoVersion;GOOS='windows';GOARCH='amd64';CGO_ENABLED='0';runtimeManifestSha256=$taskHash;runtimeSourceCommit=(Get-Content -Raw -LiteralPath $taskManifest|ConvertFrom-Json).sourceCommit;bytes=(Get-Item -LiteralPath $taskExe).Length;sha256=$taskExeHash}
$taskInfo | ConvertTo-Json | Set-Content -Encoding utf8 -LiteralPath (Join-Path $taskOutput 'build-info.json')
"$taskExeHash  K-SESSION.exe" | Set-Content -Encoding ascii -LiteralPath (Join-Path $taskOutput 'SHA256SUMS.txt')
# Go links its runtime into the EXE; retain the original Go license with the artifact.
$taskGoRoot=& $GoExe env GOROOT
Copy-Item -LiteralPath (Join-Path $taskGoRoot 'LICENSE') -Destination (Join-Path $taskOutput 'LICENSE-Go.txt')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot '../../LICENSE') -Destination (Join-Path $taskOutput 'LICENSE-KSESSION.txt')
$taskInfo | ConvertTo-Json
