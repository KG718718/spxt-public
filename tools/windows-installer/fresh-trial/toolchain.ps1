param([Parameter(Mandatory=$true)][string]$Work)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:GITHUB_REPOSITORY -ne 'KG718718/spxt-public'){throw 'Fresh toolchain Hosted only'}
$taskWork=[IO.Path]::GetFullPath($Work)
if($taskWork -notmatch '^E:\\' -or (Test-Path -LiteralPath $taskWork)){throw 'Fresh owned tool directory required'}
$taskPin=Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot '../toolchain.json')|ConvertFrom-Json
New-Item -ItemType Directory -Path $taskWork|Out-Null
$taskFile=Join-Path $taskWork 'innosetup-6.7.3.exe'
Invoke-WebRequest -Uri $taskPin.url -OutFile $taskFile -TimeoutSec 240
if((Get-FileHash -LiteralPath $taskFile -Algorithm SHA256).Hash.ToLowerInvariant() -cne $taskPin.sha256){throw 'Compiler archive identity rejected'}
$taskSignature=Get-AuthenticodeSignature -LiteralPath $taskFile
if($taskSignature.Status -ne 'Valid' -or $taskSignature.SignerCertificate.Subject -notmatch 'CN=Pyrsys B\.V\.'){throw 'Compiler publisher rejected'}
$taskCompiler=Join-Path $taskWork 'compiler'
# Upstream is-6_7_3/isportable.iss explicitly disables prior directory reuse,
# uninstall registration, icons, file associations and external desktop deletion.
$taskArgs=@('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/PORTABLE=1','/NOICONS','/TASKS=',('/DIR="'+$taskCompiler+'"'),('/LOG="'+(Join-Path $taskWork 'tool-private.log')+'"'))
$taskProcess=Start-Process -FilePath $taskFile -ArgumentList $taskArgs -WindowStyle Hidden -PassThru -Wait
if($taskProcess.ExitCode -ne 0){throw 'Portable compiler extraction failed'}
if(!(Test-Path -LiteralPath (Join-Path $taskCompiler 'ISCC.exe') -PathType Leaf) -or (Test-Path -LiteralPath (Join-Path $taskCompiler 'unins000.exe'))){throw 'Portable compiler output rejected'}
[ordered]@{version=$taskPin.version;sha256=$taskPin.sha256;signature='Valid';signer='Pyrsys B.V.';mode='UPSTREAM_PORTABLE';licenseSha256=(Get-FileHash -LiteralPath (Join-Path $taskCompiler 'License.txt') -Algorithm SHA256).Hash.ToLowerInvariant()}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $taskWork 'toolchain-verification.json') -Encoding utf8
