param([string]$Root,[string]$Source,[string]$Node,[string]$GoRoot,[string]$Compiler)
$ErrorActionPreference='Stop'
$taskDeadline=[DateTime]::UtcNow.AddSeconds(30)
while(!(Test-Path -LiteralPath (Join-Path $Root 'job-ready'))){if([DateTime]::UtcNow -gt $taskDeadline){throw 'P0 job gate unavailable'};Start-Sleep -Milliseconds 20}
. (Join-Path $PSScriptRoot '../../tests/lan-host/node-test-environment.ps1')
. (Join-Path $PSScriptRoot '../../tests/fresh-lan-trial/memory-process.ps1')
$taskNames=@('GOOS','GOARCH','CGO_ENABLED','GOTOOLCHAIN','GOPROXY','GOSUMDB','GOENV','GOWORK','GOFLAGS','GOEXPERIMENT','TEMP','TMP','GOTMPDIR','GOCACHE','NODE_PATH','NODE_OPTIONS','KSESSION_FRESH_BUILD_NODE','KSESSION_FIREWALL_TEST_ROOT')
$taskBefore=Save-KSessionProcessEnvironment $taskNames
$taskState=@{schema=1;sourceCommit=$Source;stage='PAYLOAD';status='FAIL';environmentRestored=$false}
try{
  $env:NODE_OPTIONS='';$env:NODE_PATH=''
  $taskPortable=Join-Path $Root 'portable'
  & (Join-Path $PSScriptRoot 'build-payload.ps1') -Work $taskPortable -Commit $Source -NodeDir (Split-Path $Node) -GoRoot $GoRoot -BuildDiagnostic (Join-Path $Root 'build-diagnostic.json')
  $taskState.stage='SETUP'
  $taskCompile=Invoke-KSessionMemoryNode $Node @((Join-Path $PSScriptRoot 'build.cjs'),$taskPortable,$Compiler,(Join-Path $Root 'setup'),$Source)
  if($taskCompile.ExitCode -ne 0){throw 'P0 ISCC compilation failed'}
  $taskInfo=Get-Content -Raw -LiteralPath (Join-Path $Root 'setup/artifact/build-info.json')|ConvertFrom-Json
  $taskExe=Join-Path $Root 'setup/artifact/K-SESSION-Fresh-Trial-1.1.0-beta.4.exe'
  if($taskInfo.sourceCommit -cne $Source -or $taskInfo.mode -cne 'fresh-trial' -or $taskInfo.setupSha256 -cne (Get-FileHash -LiteralPath $taskExe -Algorithm SHA256).Hash.ToLowerInvariant()){throw 'P0 output identity rejected'}
  $taskState.stage='FINAL';$taskState.status='PASS'
}finally{
  Restore-KSessionProcessEnvironment $taskBefore
  $taskState.environmentRestored=Test-KSessionProcessEnvironmentRestored $taskBefore
  if(!$taskState.environmentRestored){$taskState.status='FAIL'}
  [IO.File]::WriteAllText((Join-Path $Root 'worker-state.json'),($taskState|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
}
if($taskState.status -ne 'PASS'){exit 1}
