param([Parameter(Mandatory=$true)][string]$Work)
$ErrorActionPreference='Stop'
$taskPin=Get-Content -Raw (Join-Path $PSScriptRoot 'toolchain.json')|ConvertFrom-Json
$taskWork=[IO.Path]::GetFullPath($Work)
if($taskWork -notmatch '^E:\\' -or (Test-Path -LiteralPath $taskWork)){throw 'New E tool directory required'}
New-Item -ItemType Directory -Path $taskWork|Out-Null
$env:TEMP=Join-Path $taskWork 'temp';$env:TMP=$env:TEMP
New-Item -ItemType Directory -Path $env:TEMP|Out-Null
$taskFile=Join-Path $taskWork 'innosetup-6.7.3.exe'
Invoke-WebRequest -Uri $taskPin.url -OutFile $taskFile -TimeoutSec 240
if((Get-FileHash -LiteralPath $taskFile -Algorithm SHA256).Hash.ToLower() -ne $taskPin.sha256){throw 'Inno archive hash mismatch'}
$taskSig=Get-AuthenticodeSignature -LiteralPath $taskFile
if($taskSig.Status -ne 'Valid' -or $taskSig.SignerCertificate.Subject -notmatch 'CN=Pyrsys B\.V\.'){throw 'Inno publisher verification failed'}
$taskTool=Join-Path $taskWork 'compiler'
$taskArgs=@('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/NOICONS','/TASKS=',('/DIR="'+$taskTool+'"'),('/LOG="'+(Join-Path $taskWork 'tool-install.log')+'"'))
$taskP=Start-Process -FilePath $taskFile -ArgumentList $taskArgs -WindowStyle Hidden -PassThru -Wait
if($taskP.ExitCode -ne 0){throw 'Inno tool installation failed'}
# Upstream ISCC version-resource is 0.0.0.0; exact version is additionally enforced
# by the compiler's VER/EncodeVer preprocessor in setup.iss (do not trust file metadata).
[ordered]@{version=$taskPin.version;url=$taskPin.url;sha256=$taskPin.sha256;signature='Valid';signer='Pyrsys B.V.';licenseSha256=(Get-FileHash (Join-Path $taskTool 'License.txt')).Hash.ToLower()}|ConvertTo-Json|Set-Content -Encoding utf8 (Join-Path $taskWork 'toolchain-verification.json')
