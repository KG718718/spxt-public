param([Parameter(Mandatory=$true)][string]$RepositoryRoot,[Parameter(Mandatory=$true)][string]$Work,[Parameter(Mandatory=$true)][string]$Report)
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$repo=(Resolve-Path -LiteralPath $RepositoryRoot).Path;$work=[IO.Path]::GetFullPath($Work);$reportPath=[IO.Path]::GetFullPath($Report)
if(Test-Path -LiteralPath $work){throw 'DRIVER_WORK_EXISTS'};if(Test-Path -LiteralPath $reportPath){throw 'DRIVER_REPORT_EXISTS'}
New-Item -ItemType Directory -Path $work|Out-Null
$expected=@(node (Join-Path $repo 'tools/tests/lan-host/expected-go-tests.cjs') FIREWALL|ConvertFrom-Json)
$fake=Join-Path $work 'fake-go.ps1';$lines=@("if(`$args[0]-eq'version'){'go version go1.27.1 windows/amd64';exit 0}","if(`$args[0]-eq'test'){","if(`$env:KSESSION_FAKE_GO_MODE-eq'ZERO'){exit 0}","if(`$env:KSESSION_FAKE_GO_MODE-eq'PACKAGE'){'{`"Action`":`"pass`"}';exit 0}","if(`$env:KSESSION_FAKE_GO_MODE-eq'NONJSON'){'not-json';exit 9}","if(`$env:KSESSION_FAKE_GO_MODE-eq'KNOWN'){'{`"Action`":`"fail`",`"Test`":`"TestInstallIdentityAndTampering`"}';exit 9}")
foreach($name in $expected){$lines+="'{`"Action`":`"pass`",`"Test`":`"$name`"}'"}
$lines+=@("'{`"Action`":`"pass`"}'",'exit 0','}',"if(`$args[0]-eq'build'){exit 9}",'exit 9')
[IO.File]::WriteAllLines($fake,$lines,[Text.UTF8Encoding]::new($false))
$result=[ordered]@{schema=1;kind='k-session-firewall-build-driver-contract';status='RUNNING';stage='DRIVER';reason='RUNNING';checksPass=0}
function Write-Report(){[IO.File]::WriteAllText($reportPath,($result|ConvertTo-Json -Compress)+"`n",[Text.UTF8Encoding]::new($false))}
Write-Report;$failed=$false
try{
  foreach($case in @(@('ZERO','TESTS','TESTS_FAILED'),@('PACKAGE','TESTS','TESTS_FAILED'),@('NONJSON','TESTS','TESTS_FAILED'),@('KNOWN','TESTS','FIXTURE_INSTALL_PATH'),@('COMPILE','COMPILE','COMPILE_FAILED'))){
    $mode=$case[0];$caseRoot=Join-Path $work $mode;New-Item -ItemType Directory -Path $caseRoot|Out-Null
    $env:KSESSION_FAKE_GO_MODE=$mode;$entry=Join-Path $caseRoot 'entry.log';$diagnostic=Join-Path $caseRoot 'diagnostic.json'
    & pwsh -NoLogo -NoProfile -File (Join-Path $repo 'tools/windows-firewall/build.ps1') -OutputDir (Join-Path $caseRoot 'output') -SourceCommit ('a'*40) -RuntimeManifestSha256 ('b'*64) -NodeSha256 'ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32' -InstallerVersion '1.1.0-beta.4' -GoExe $fake -DiagnosticReport $diagnostic *> $entry
    if($LASTEXITCODE-ne71){throw 'DRIVER_EXIT'}
    $d=Get-Content -Raw $diagnostic|ConvertFrom-Json
    if($d.status-ne'FAIL'-or$d.stage-ne$case[1]-or$d.reason-ne$case[2]-or$d.qualification-ne'TEST_BUILD_ONLY'){throw 'DRIVER_REASON'}
    $visible=(Get-Content -Raw $entry).Trim();if($visible-ne('FIREWALL_BUILD_FAILED stage='+$case[1]+' reason='+$case[2])){throw 'DRIVER_PRIVACY'}
    $result.checksPass++
  }
  $result.status='PASS';$result.stage='COMPLETE';$result.reason='PASS';Write-Report
}catch{$reason=[string]$_.Exception.Message;if($reason-notin@('DRIVER_EXIT','DRIVER_REASON','DRIVER_PRIVACY')){$reason='INTERNAL'};$result.status='FAIL';$result.reason=$reason;Write-Report;$failed=$true}
Remove-Item Env:KSESSION_FAKE_GO_MODE -ErrorAction SilentlyContinue
if($failed){Write-Output ('FIREWALL_BUILD_DRIVER_FAILED reason='+$result.reason);exit 71}
Write-Output 'FIREWALL_BUILD_DRIVER_PASS'
