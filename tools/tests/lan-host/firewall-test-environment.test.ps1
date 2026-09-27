param([Parameter(Mandatory=$true)][string]$RepositoryRoot,[Parameter(Mandatory=$true)][string]$Work,[Parameter(Mandatory=$true)][string]$Report)
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$repo=(Resolve-Path -LiteralPath $RepositoryRoot).Path;$work=[IO.Path]::GetFullPath($Work);$reportPath=[IO.Path]::GetFullPath($Report)
if(Test-Path -LiteralPath $work){throw 'TEST_WORK_EXISTS'}
if(Test-Path -LiteralPath $reportPath){throw 'TEST_REPORT_EXISTS'}
New-Item -ItemType Directory -Path $work|Out-Null
. (Join-Path $repo 'tools/windows-firewall/test-environment.ps1')
$result=[ordered]@{schema=1;kind='k-session-firewall-test-environment';status='RUNNING';stage='SUBST';reason='RUNNING';shortPathEvidence='PENDING';checksPass=0}
function Write-Report(){[IO.File]::WriteAllText($reportPath,($result|ConvertTo-Json -Compress)+"`n",[Text.UTF8Encoding]::new($false))}
function Require($condition,[string]$code){if(!$condition){throw $code};$result.checksPass++}
Write-Report
$failed=$false
try{
  $target='\??\C:\owned\mapped';$targetSlash='\??\C:\owned\mapped\'
  Require ((Join-KSessionSubstTarget $target 'E:\') -eq 'C:\owned\mapped') 'SUBST_ROOT_JOIN'
  Require ((Join-KSessionSubstTarget $target 'E:\nested\child') -eq 'C:\owned\mapped\nested\child') 'SUBST_NESTED_JOIN'
  Require ((Join-KSessionSubstTarget $targetSlash 'E:\nested') -eq 'C:\owned\mapped\nested') 'SUBST_SEPARATOR_JOIN'
  $result.stage='PATH_CLASS';Write-Report
  Require ((Get-KSessionFirewallTestPathClass $work) -eq 'CANONICAL') 'PHYSICAL_ROOT_CLASS'
  $lexical=Join-Path $work 'child\..';Require ((Get-KSessionFirewallTestPathClass $lexical) -eq 'NONCANONICAL') 'LEXICAL_CLASS'
  $targetDir=Join-Path $work 'junction-target';New-Item -ItemType Directory -Path $targetDir|Out-Null
  $junction=Join-Path $work 'junction';New-Item -ItemType Junction -Path $junction -Target $targetDir|Out-Null
  Require ((Get-KSessionFirewallTestPathClass $junction) -eq 'REPARSE') 'REPARSE_CLASS'
  $short=[Text.StringBuilder]::new(32768);$shortCount=[KSessionFirewallPathNative]::GetShortPathName($work,$short,$short.Capacity)
  Require ($shortCount -gt 0) 'SHORT_PATH_QUERY'
  $result.shortPathEvidence=if($short.ToString() -ieq $work){'UNAVAILABLE'}else{'EXPANDED'}
  $result.stage='EVENT_PARSE';Write-Report
  $empty=Join-Path $work 'empty.jsonl';[IO.File]::WriteAllText($empty,'',[Text.UTF8Encoding]::new($false))
  $one=Join-Path $work 'one.jsonl';[IO.File]::WriteAllText($one,"{`"Action`":`"pass`"}`n",[Text.UTF8Encoding]::new($false))
  $many=Join-Path $work 'many.jsonl';[IO.File]::WriteAllText($many,(@('{"Action":"pass","Test":"TestOne"}','{"Action":"fail","Test":"TestTwo"}','{"Action":"skip","Test":"TestThree"}','{"Action":"fail"}')-join"`n")+"`n",[Text.UTF8Encoding]::new($false))
  $invalid=Join-Path $work 'invalid.jsonl';[IO.File]::WriteAllText($invalid,"not-json`n",[Text.UTF8Encoding]::new($false))
  $s0=Read-KSessionGoTestSummary $empty;Require (!$s0.JSONInvalid -and @($s0.Passed).Count -eq 0 -and $s0.PackagePass -eq 0) 'ZERO_EVENT_PARSE'
  $s1=Read-KSessionGoTestSummary $one;Require (!$s1.JSONInvalid -and @($s1.Passed).Count -eq 0 -and $s1.PackagePass -eq 1) 'PACKAGE_EVENT_PARSE'
  $sm=Read-KSessionGoTestSummary $many;Require (@($sm.Passed).Count -eq 1 -and @($sm.FailedNames).Count -eq 1 -and @($sm.SkippedNames).Count -eq 1) 'MULTI_EVENT_PARSE'
  $si=Read-KSessionGoTestSummary $invalid;Require $si.JSONInvalid 'INVALID_EVENT_PARSE'
  $result.stage='ENVIRONMENT';Write-Report
  $oldTemp=$env:TEMP;$oldTmp=$env:TMP;$oldGoTmp=$env:GOTMPDIR;$oldGoCache=$env:GOCACHE;$oldFixture=$env:KSESSION_FIREWALL_TEST_ROOT
  $state=Enter-KSessionFirewallTestEnvironment $work 'firewall-contract-env'
  try{Require ((Get-KSessionFirewallTestPathClass $state.Root) -eq 'CANONICAL') 'SELECTED_ROOT_CLASS'}finally{Exit-KSessionFirewallTestEnvironment $state}
  Require ($env:TEMP -eq $oldTemp -and $env:TMP -eq $oldTmp -and $env:GOTMPDIR -eq $oldGoTmp -and $env:GOCACHE -eq $oldGoCache -and $env:KSESSION_FIREWALL_TEST_ROOT -eq $oldFixture) 'ENV_RESTORE'
  $result.status='PASS';$result.stage='COMPLETE';$result.reason='PASS';Write-Report
}catch{
  $allowed=@('SUBST_ROOT_JOIN','SUBST_NESTED_JOIN','SUBST_SEPARATOR_JOIN','PHYSICAL_ROOT_CLASS','LEXICAL_CLASS','REPARSE_CLASS','SHORT_PATH_QUERY','ZERO_EVENT_PARSE','PACKAGE_EVENT_PARSE','MULTI_EVENT_PARSE','INVALID_EVENT_PARSE','SELECTED_ROOT_CLASS','ENV_RESTORE')
  $reason=[string]$_.Exception.Message;if($reason -notin $allowed){$reason='INTERNAL'}
  $result.status='FAIL';$result.reason=$reason;Write-Report;$failed=$true
}
if($failed){Write-Output ('FIREWALL_TEST_ENVIRONMENT_FAILED stage='+$result.stage+' reason='+$result.reason);exit 71}
Write-Output ('FIREWALL_TEST_ENVIRONMENT_PASS shortPath='+$result.shortPathEvidence)
