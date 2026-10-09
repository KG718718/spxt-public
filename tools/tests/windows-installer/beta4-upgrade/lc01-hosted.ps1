param([Parameter(Mandatory=$true)][string]$TestedCommit)
$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$out=Join-Path $env:RUNNER_TEMP 'lc01-evidence'
$build=Join-Path $env:RUNNER_TEMP 'lc01-build'
$reportCli=Join-Path $PSScriptRoot 'lc01-hosted-report.cjs'
$stage='ENV';$failed=$true
try {
 if($env:GITHUB_ACTIONS-ne 'true' -or $env:RUNNER_ENVIRONMENT-ne 'github-hosted' -or $env:GITHUB_REPOSITORY-ne 'KG718718/spxt-public' -or $env:GITHUB_REF-ne 'refs/heads/codex/lan2-manual-host-v1.1' -or $env:GITHUB_RUN_ATTEMPT-ne '1'){throw 'HOSTED_REQUIRED'}
 if($TestedCommit-cnotmatch '^[a-f0-9]{40}$' -or (git -C $repo rev-parse HEAD)-cne $TestedCommit -or (Test-Path -LiteralPath $build)){throw 'SOURCE_OR_FRESH_REJECTED'}
 [void][IO.Directory]::CreateDirectory($out)
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 & $node $reportCli initialize (Join-Path $out 'LC01-HOSTED-REPORT.json') $TestedCommit
 if($LASTEXITCODE-ne 0){throw 'REPORT_INITIALIZATION_FAILED'}
 $stage='TOOLCHAIN'
 [void][IO.Directory]::CreateDirectory($build)
 $pin=Get-Content (Join-Path $repo 'tools/windows-launcher/toolchain.json') -Raw|ConvertFrom-Json
 if($pin.goVersion-ne '1.27.1' -or $pin.goWindowsZip-ne 'https://go.dev/dl/go1.27.1.windows-amd64.zip' -or $pin.sha256-ne 'a3911b5e0e1b1053f25ed0675f4c1c6aad1e2bfcf253df2b9be4caabd2edd95d'){throw 'GO_PIN_FAILED'}
 $zip=Join-Path $build 'go.zip'
 Invoke-WebRequest -Uri $pin.goWindowsZip -OutFile $zip -TimeoutSec 240
 if((Get-FileHash -LiteralPath $zip).Hash.ToLowerInvariant()-cne $pin.sha256){throw 'GO_ARCHIVE_IDENTITY_FAILED'}
 Expand-Archive -LiteralPath $zip -DestinationPath $build
 $go=Join-Path $build 'go/bin/go.exe';$generated=Join-Path $build 'generated'
 & $node (Join-Path $PSScriptRoot 'prepare-lc01-hosted.cjs') $generated
 if($LASTEXITCODE-ne 0){throw 'GENERATOR_FAILED'}
 $env:GOTOOLCHAIN='local';$env:GOPROXY='off';$env:GOSUMDB='off';$env:GOENV='off';$env:GOWORK='off';$env:CGO_ENABLED='0'
 $env:GOCACHE=Join-Path $build 'cache';$env:GOMODCACHE=Join-Path $build 'modcache';$env:GOOS='windows';$env:GOARCH='amd64'
 $exe=Join-Path $build 'lc01.test.exe'
 Push-Location $generated
 try{& $go test -c -o $exe;if($LASTEXITCODE-ne 0){throw 'OVERLAY_COMPILE_FAILED'}}finally{Pop-Location}
 $stage='IDENTITY'
 & $node (Join-Path $repo 'tools/windows-installer/beta2-identity/cli.cjs') report --status BLOCKED --stage HOSTED_PREFLIGHT --tested-commit $TestedCommit --output (Join-Path $out 'BETA2-IDENTITY-REPORT.json')
 if($LASTEXITCODE-ne 0){throw 'IDENTITY_INITIALIZATION_FAILED'}
 # Existing identity runner accepts exactly its initial report; lifecycle reports are created later.
 $identityOutput=Join-Path $build 'identity-output';[void][IO.Directory]::CreateDirectory($identityOutput)
 Move-Item -LiteralPath (Join-Path $out 'BETA2-IDENTITY-REPORT.json') -Destination $identityOutput
 $child=Start-Process -FilePath (Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe') -ArgumentList @('-NoProfile','-NonInteractive','-File',('"'+(Join-Path $generated 'invoke-lc01.ps1')+'"'),'-RepositoryRoot',('"'+$repo+'"'),'-OutputDirectory',('"'+$identityOutput+'"'),'-TestedCommit',$TestedCommit,'-LifecycleExe',('"'+$exe+'"')) -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $build 'runner.stdout') -RedirectStandardError (Join-Path $build 'runner.stderr')
 try{if(!$child.WaitForExit(600000)){$child.Kill();[void]$child.WaitForExit(3000);throw 'RUNNER_TIMEOUT'};if($child.ExitCode-ne 0){throw 'RUNNER_FAILED'}}finally{$child.Dispose()}
 $failed=$false
}catch{[Console]::Error.WriteLine('LC01_HOSTED_FAILED_'+$stage)}finally{
 if(Test-Path -LiteralPath (Join-Path $build 'identity-output')) {
  foreach($name in @('identity-fixed.json','lifecycle-fixed.json','beta2-identity-evidence.json','BETA2-IDENTITY-REPORT.json')){
   $file=Join-Path $build ('identity-output/'+$name)
   if(Test-Path -LiteralPath $file){Copy-Item -LiteralPath $file -Destination (Join-Path $out $name)}
  }
 }
 if($node){$outcome=if($failed){'FAIL'}else{'SUCCESS'};& $node $reportCli publish $out $TestedCommit $stage $outcome;if($LASTEXITCODE-ne 0){$failed=$true}}
 $env:GITHUB_TOKEN=$null;$env:GH_TOKEN=$null
}
if($failed){exit 1}
