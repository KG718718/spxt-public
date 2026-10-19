param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot '../supervisor-entry.ps1')
Wait-FreshCiAssignment $env:KSESSION_FAST_JOB_GATE 5
if(Test-Path -LiteralPath $Root){throw 'NEW_OWNED_ROOT_REQUIRED'}
New-Item -ItemType Directory $Root|Out-Null
$pass=0
foreach($mode in @('normal','registry','rules','compiler','compiler-present','binding','desktop','productRegistration','programFiles','programs','startup','missing-product')){
 $registry=@{known=$true};$rules=@{known=$true};$compiler=@{known=$true;absent=$true};$products=@{};foreach($k in @('binding','desktop','productRegistration','programFiles','programs','startup')){$products[$k]=@{known=$true}}
 switch($mode){'registry'{$registry.known=$false}'rules'{$rules.known=$false}'compiler'{$compiler.known=$false}'compiler-present'{$compiler.absent=$false}'missing-product'{$products.Remove('startup')}default{if($products.ContainsKey($mode)){$products[$mode].known=$false}}}
 $accepted=$true;try{Assert-FreshEnvPrecheck $registry $rules $compiler $products}catch{$accepted=$false}
 if($accepted -ne ($mode -eq 'normal')){throw 'CURRENT_PRESTATE_UNKNOWN_ACCEPTED'};$pass++
}
[IO.File]::WriteAllText((Join-Path $Root 'result.json'),(@{schema=1;kind='FC2_CURRENT_PRESTATE_COUNTERS';pass=$pass;fail=0;skipped=0;controlledInputs=$true;hostedIdentitySpoofed=$false;productInstalled=$false;realRegistryWritten=$false;realRulesWritten=$false;rawOutputStored=$false}|ConvertTo-Json -Compress))
Write-Output 'FC2_CURRENT_PRESTATE_12_PASS'
