param(
  [Parameter(Mandatory=$true)][string]$OutputDirectory,
  [string]$SourceCommit = '49b3e35c68468b3c61e3ad19ed379ce057d17886',
  [string]$VerifiedNodeArchive
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$out = [IO.Path]::GetFullPath($OutputDirectory)
if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') { throw 'Windows x64 required' }
if ($out -notmatch '^E:\\' -or $out.StartsWith($repo + '\',[StringComparison]::OrdinalIgnoreCase) -or $out -eq $repo) { throw 'Output must be outside source, on E drive' }
if (Test-Path -LiteralPath $out) { throw 'Output already exists; choose a new directory. Nothing is deleted.' }
if ($SourceCommit -notmatch '^[a-f0-9]{40}$') { throw 'Full source commit required' }
$git = (Get-Command git.exe).Source
$remote = & $git -C $repo remote get-url origin
if ($LASTEXITCODE -ne 0 -or $remote.Trim() -ne 'https://github.com/KG718718/spxt-public.git') { throw 'Not the approved public repository' }
$raw = & $git -C $repo show "${SourceCommit}:tools/installer/distribution.json"
if ($LASTEXITCODE -ne 0) { throw 'Source commit not found' }
$dist = ($raw -join "`n") | ConvertFrom-Json
if ($dist.nodeVersion -ne '24.21.0' -or $dist.nodeUrl -ne 'https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip' -or $dist.checksumsUrl -ne 'https://nodejs.org/dist/v24.21.0/SHASUMS256.txt') { throw 'Node version/source changed; approval required' }
New-Item -ItemType Directory -Path $out | Out-Null
$archive = Join-Path $out 'node-v24.21.0-win-x64.zip'
$sums = Invoke-WebRequest -Uri $dist.checksumsUrl -MaximumRedirection 0 -TimeoutSec 60
if ($sums.Content -notmatch ($dist.nodeArchiveSha256 + '\s+node-v24\.21\.0-win-x64\.zip') -or $sums.Content -notmatch ($dist.nodeExeSha256 + '\s+win-x64/node\.exe')) { throw 'Official checksum mismatch' }
if ($VerifiedNodeArchive) {
  $cached = (Resolve-Path -LiteralPath $VerifiedNodeArchive).Path
  if ($cached -notmatch '^E:\\' -or (Get-FileHash -LiteralPath $cached -Algorithm SHA256).Hash.ToLowerInvariant() -ne $dist.nodeArchiveSha256) { throw 'Cached official archive hash mismatch' }
  Copy-Item -LiteralPath $cached -Destination $archive
} else {
  Invoke-WebRequest -Uri $dist.nodeUrl -MaximumRedirection 0 -OutFile $archive -TimeoutSec 180
}
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $dist.nodeArchiveSha256) { throw 'Archive hash mismatch' }
Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $out 'toolchain')
$runtime = Join-Path $out 'toolchain/node-v24.21.0-win-x64'
$node = Join-Path $runtime 'node.exe'
if ((Get-FileHash -LiteralPath $node -Algorithm SHA256).Hash.ToLowerInvariant() -ne $dist.nodeExeSha256) { throw 'Node executable hash mismatch' }
# Bootstrap also removes NODE_OPTIONS, NODE_PATH and all inherited npm credentials.
$bootstrapTemp = Join-Path $out 'bootstrap-temp'
New-Item -ItemType Directory -Path $bootstrapTemp | Out-Null
$psi = [Diagnostics.ProcessStartInfo]::new()
$psi.FileName = $node
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.Environment.Clear()
$psi.Environment['SystemRoot'] = $env:SystemRoot
$psi.Environment['WINDIR'] = $env:SystemRoot
$psi.Environment['PATH'] = Join-Path $env:SystemRoot 'System32'
$psi.Environment['TEMP'] = $bootstrapTemp
$psi.Environment['TMP'] = $bootstrapTemp
foreach ($argument in @((Join-Path $PSScriptRoot 'build.cjs'),$SourceCommit,$out,$runtime,$git)) { $psi.ArgumentList.Add($argument) }
$process = [Diagnostics.Process]::Start($psi)
$process.WaitForExit()
exit $process.ExitCode
