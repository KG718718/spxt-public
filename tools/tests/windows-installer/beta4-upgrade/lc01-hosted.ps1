param([Parameter(Mandatory=$true)][string]$TestedCommit,[switch]$ContractStub,[string]$StubNode,[string]$StubScript,[string]$StubOutput,[string]$TrustFixture)
$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue'
function Confirm-LC01TrustedMetadata([string]$Candidate,[string]$Expected,[bool]$HasReparse,[string]$SignatureStatus,[string]$Signer){
 $full=[IO.Path]::GetFullPath($Candidate)
 if(!$full.Equals([IO.Path]::GetFullPath($Expected),[StringComparison]::OrdinalIgnoreCase) -or $HasReparse -or $SignatureStatus-cne 'Valid' -or $Signer-cnotmatch '(^|,\s*)O=Microsoft Corporation(,|$)'){throw 'POWERSHELL_TRUST_REJECTED'}
}
function Invoke-LC01Process([string]$File,[string[]]$Arguments,[int]$TimeoutMilliseconds,[string]$Stdout,[string]$Stderr,[object]$StartedFlag=$null){
 $info=[Diagnostics.ProcessStartInfo]::new();$info.FileName=$File;$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $info.StandardOutputEncoding=[Text.UTF8Encoding]::new($false);$info.StandardErrorEncoding=[Text.UTF8Encoding]::new($false)
 foreach($argument in $Arguments){[void]$info.ArgumentList.Add($argument)}
 $process=[Diagnostics.Process]::new();$process.StartInfo=$info
 try{if(!$process.Start()){throw 'CHILD_START_FAILED'};if($null-ne$StartedFlag){$StartedFlag.Value=$true};$stdoutTask=$process.StandardOutput.ReadToEndAsync();$stderrTask=$process.StandardError.ReadToEndAsync();if(!$process.WaitForExit($TimeoutMilliseconds)){$process.Kill($true);[void]$process.WaitForExit(3000);throw 'CHILD_TIMEOUT'};$stdoutText=$stdoutTask.GetAwaiter().GetResult();$stderrText=$stderrTask.GetAwaiter().GetResult();if($stdoutText.Length-gt 1048576 -or $stderrText.Length-gt 1048576){throw 'CHILD_OUTPUT_LIMIT'};[IO.File]::WriteAllText($Stdout,$stdoutText,[Text.UTF8Encoding]::new($false));[IO.File]::WriteAllText($Stderr,$stderrText,[Text.UTF8Encoding]::new($false));$process.ExitCode}finally{$process.Dispose()}
}
function Confirm-LC01ProbeOutput([string]$Stdout,[string]$Stderr){
 $probeText=[IO.File]::ReadAllText($Stdout,[Text.UTF8Encoding]::new($false));$probeError=[IO.File]::ReadAllText($Stderr,[Text.UTF8Encoding]::new($false))
 if($probeText-cnotmatch '^LC01_CORE_API_UTF8_K⁺\|([7-9]|[1-9][0-9]+)$' -or $probeError-cne ''){throw 'POWERSHELL_CAPABILITY_REJECTED'}
 [int]$Matches[1]
}
function Resolve-LC01PowerShell7{
 $programFiles=[Environment]::GetFolderPath('ProgramFiles');if([string]::IsNullOrWhiteSpace($programFiles)){throw 'POWERSHELL_TRUST_REJECTED'}
 $scope=[IO.Path]::GetFullPath($programFiles).TrimEnd('\');$root=[IO.Path]::GetFullPath((Join-Path $scope 'PowerShell\7'));$candidate=[IO.Path]::GetFullPath((Join-Path $root 'pwsh.exe'))
 if(!(Test-Path -LiteralPath $candidate -PathType Leaf)){throw 'POWERSHELL_TRUST_REJECTED'}
 $hasReparse=$false;$cursor=$candidate
 while($true){$item=Get-Item -LiteralPath $cursor -Force;if(($item.Attributes-band [IO.FileAttributes]::ReparsePoint)-ne 0){$hasReparse=$true};if($cursor.Equals($scope,[StringComparison]::OrdinalIgnoreCase)){break};$parent=[IO.Path]::GetDirectoryName($cursor);if([string]::IsNullOrWhiteSpace($parent)-or (!$parent.Equals($scope,[StringComparison]::OrdinalIgnoreCase)-and !$parent.StartsWith(($scope+'\'),[StringComparison]::OrdinalIgnoreCase))){throw 'POWERSHELL_TRUST_REJECTED'};$cursor=$parent}
 $signature=Get-AuthenticodeSignature -LiteralPath $candidate;Confirm-LC01TrustedMetadata $candidate (Join-Path $programFiles 'PowerShell\7\pwsh.exe') $hasReparse ([string]$signature.Status) ([string]$signature.SignerCertificate.Subject)
 $candidate
}
if($ContractStub){
 if($env:GITHUB_ACTIONS-eq 'true' -or @($StubNode,$StubScript,$StubOutput,$TrustFixture)|Where-Object{[string]::IsNullOrWhiteSpace($_)}){throw 'CONTRACT_STUB_REJECTED'}
 $fixture=Get-Content -LiteralPath $TrustFixture -Raw|ConvertFrom-Json;Confirm-LC01TrustedMetadata ([string]$fixture.candidate) ([string]$fixture.expected) ([bool]$fixture.hasReparse) ([string]$fixture.signatureStatus) ([string]$fixture.signer)
 $args=@($StubScript,'-NoProfile','-NonInteractive','-File','C:\K⁺-SESSION\invoke-lc01.ps1','-RepositoryRoot','C:\repo','-OutputDirectory','C:\out','-TestedCommit',$TestedCommit,'-LifecycleExe','C:\build\lc01.test.exe')
 $exit=Invoke-LC01Process $StubNode $args 30000 $StubOutput ($StubOutput+'.err');if($exit-ne 0){throw 'CONTRACT_STUB_FAILED'}
 $probeTest=$StubOutput+'.probe';$probeTestError=$probeTest+'.err';[IO.File]::WriteAllText($probeTest,'LC01_CORE_API_UTF8_K⁺|7',[Text.UTF8Encoding]::new($false));[IO.File]::WriteAllBytes($probeTestError,[byte[]]@());if((Confirm-LC01ProbeOutput $probeTest $probeTestError)-ne 7){throw 'CONTRACT_STUB_FAILED'}
 [IO.File]::WriteAllText($probeTestError,'NONEMPTY',[Text.UTF8Encoding]::new($false));$rejected=$false;try{[void](Confirm-LC01ProbeOutput $probeTest $probeTestError)}catch{$rejected=$true};if(!$rejected){throw 'CONTRACT_STUB_FAILED'};exit 0
}
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$out=Join-Path $env:RUNNER_TEMP 'lc01-evidence'
$build=Join-Path $env:RUNNER_TEMP 'lc01-build'
$reportCli=Join-Path $PSScriptRoot 'lc01-hosted-report.cjs'
$stage='ENV';$failed=$true;$childState='NOT_STARTED';$innerStarted=$false;$parentReason='CHILD_NOT_STARTED'
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
 try{$pwsh=Resolve-LC01PowerShell7}catch{$parentReason='POWERSHELL_TRUST_REJECTED';throw}
 $probeOut=Join-Path $build 'pwsh-probe.stdout';$probeErr=Join-Path $build 'pwsh-probe.stderr'
 $probe="if(`$PSVersionTable.PSEdition -cne 'Core' -or `$PSVersionTable.PSVersion.Major -lt 7 -or ![IO.Path]::IsPathFullyQualified('C:\KSESSION-LC01-HOSTED-WORK')){exit 41};[Console]::OutputEncoding=[Text.UTF8Encoding]::new(`$false);[Console]::Write(('LC01_CORE_API_UTF8_K⁺|'+`$PSVersionTable.PSVersion.Major))"
 $probeExit=Invoke-LC01Process $pwsh @('-NoProfile','-NonInteractive','-Command',$probe) 30000 $probeOut $probeErr
 try{if($probeExit-ne 0){throw 'POWERSHELL_CAPABILITY_REJECTED'};$version=Confirm-LC01ProbeOutput $probeOut $probeErr}catch{$parentReason='POWERSHELL_CAPABILITY_REJECTED';throw}
 $proof=[ordered]@{schema=1;kind='lc01-powershell-proof';status='PASS';testedCommit=$TestedCommit;source=[ordered]@{repository='KG718718/spxt-public';runId=[Int64]36246132535;artifactId=[Int64]10907910968;headSha='c8886e6b6d413c2fd73d6716621d07a80b337e58'};edition='Core';versionMajor=[int]$version;api='PASS';utf8='PASS';signature='PASS';reparse=$false}
 $proofDraft=Join-Path $build 'powershell-proof.json';[IO.File]::WriteAllText($proofDraft,($proof|ConvertTo-Json -Depth 4 -Compress)+"`n",[Text.UTF8Encoding]::new($false));& $node $reportCli interpreter $proofDraft $TestedCommit (Join-Path $out 'LC01-POWERSHELL-PROOF.json');if($LASTEXITCODE-ne 0){$parentReason='POWERSHELL_PROOF_REJECTED';throw 'POWERSHELL_PROOF_REJECTED'}
 $childExit=Invoke-LC01Process $pwsh @('-NoProfile','-NonInteractive','-File',(Join-Path $generated 'invoke-lc01.ps1'),'-RepositoryRoot',$repo,'-OutputDirectory',$identityOutput,'-TestedCommit',$TestedCommit,'-LifecycleExe',$exe) 600000 (Join-Path $build 'runner.stdout') (Join-Path $build 'runner.stderr') ([ref]$innerStarted)
 if($childExit-ne 0){throw 'RUNNER_FAILED'}
 $failed=$false
}catch{[Console]::Error.WriteLine('LC01_HOSTED_FAILED_'+$stage)}finally{
 if($innerStarted){$childState='STARTED'}
 if(Test-Path -LiteralPath (Join-Path $build 'identity-output')) {
  foreach($name in @('identity-fixed.json','lifecycle-fixed.json','beta2-identity-evidence.json','BETA2-IDENTITY-REPORT.json','LC01-INNER-PROGRESS.json')){
   $file=Join-Path $build ('identity-output/'+$name)
   if(Test-Path -LiteralPath $file){Copy-Item -LiteralPath $file -Destination (Join-Path $out $name)}
  }
 }
 if($node){$outcome=if($failed){'FAIL'}else{'SUCCESS'};& $node $reportCli publish $out $TestedCommit $stage $outcome $childState $parentReason;if($LASTEXITCODE-ne 0){$failed=$true}}
 $env:GITHUB_TOKEN=$null;$env:GH_TOKEN=$null
}
if($failed){exit 1}
