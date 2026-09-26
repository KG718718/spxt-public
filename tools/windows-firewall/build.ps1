param(
  [Parameter(Mandatory=$true)][string]$OutputDir,
  [Parameter(Mandatory=$true)][string]$SourceCommit,
  [Parameter(Mandatory=$true)][string]$RuntimeManifestSha256,
  [Parameter(Mandatory=$true)][string]$NodeSha256,
  [Parameter(Mandatory=$true)][string]$InstallerVersion,
  [string]$GoExe='go'
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if($SourceCommit -notmatch '^[a-f0-9]{40}$'){throw 'Exact source commit required'}
if($RuntimeManifestSha256 -notmatch '^[a-f0-9]{64}$'){throw 'Exact runtime manifest SHA256 required'}
if($NodeSha256 -ne 'ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32'){throw 'Pinned Node SHA256 required'}
if($InstallerVersion -ne '1.1.0-beta.3'){throw 'Batch 4.5 beta.3 installer version required'}
$taskOutput=[IO.Path]::GetFullPath($OutputDir)
if(Test-Path -LiteralPath $taskOutput){throw 'Output must be new'}
if((& $GoExe version) -ne 'go version go1.27.1 windows/amd64'){throw 'Pinned Go 1.27.1 Windows amd64 required'}
$env:GOOS='windows';$env:GOARCH='amd64';$env:CGO_ENABLED='0';$env:GOTOOLCHAIN='local';$env:GOPROXY='off';$env:GOSUMDB='off';$env:GOENV='off';$env:GOFLAGS='';$env:GOEXPERIMENT=''
$flags="-H windowsgui -s -w -buildid= -X main.buildSourceCommit=$SourceCommit -X main.buildRuntimeManifestSHA256=$RuntimeManifestSha256 -X main.buildNodeSHA256=$NodeSha256 -X main.buildInstallerVersion=$InstallerVersion"
Push-Location $PSScriptRoot
try {
  & $GoExe test -count=1 ./...
  if($LASTEXITCODE -ne 0){throw 'Firewall helper tests failed'}
  New-Item -ItemType Directory -Path $taskOutput | Out-Null
  & $GoExe build -trimpath -buildvcs=false -ldflags $flags -o (Join-Path $taskOutput 'K-SESSION-Firewall.exe') .
  if($LASTEXITCODE -ne 0){throw 'Firewall helper build failed'}
} finally { Pop-Location }
$exe=Join-Path $taskOutput 'K-SESSION-Firewall.exe'
[ordered]@{product='K⁺-SESSION';component='firewall-helper';qualification='UNSIGNED DEVELOPMENT ARTIFACT';sourceCommit=$SourceCommit;runtimeManifestSha256=$RuntimeManifestSha256;nodeSha256=$NodeSha256;installerVersion=$InstallerVersion;toolchain=(& $GoExe version);GOOS='windows';GOARCH='amd64';CGO_ENABLED='0';windowsSubsystem='gui';bytes=(Get-Item -LiteralPath $exe).Length;sha256=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLower()} | ConvertTo-Json | Set-Content -Encoding utf8 -LiteralPath (Join-Path $taskOutput 'build-info.json')
