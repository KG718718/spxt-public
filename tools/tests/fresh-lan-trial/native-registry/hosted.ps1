$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($env:RUNNER_ENVIRONMENT -cne 'github-hosted' -or $env:RUNNER_OS -cne 'Windows' -or
    $env:GITHUB_JOB -cne 'native_registry' -or $env:GITHUB_RUN_ATTEMPT -cne '1' -or
    $env:KSESSION_NATIVE_SOURCE -cnotmatch '^[0-9a-f]{40}$') { throw 'NATIVE_ENTRY_REJECTED' }

$jobRoot = [IO.Path]::GetFullPath($env:NATIVE_JOB_ROOT)
if ([IO.Path]::GetDirectoryName($jobRoot) -ine [IO.Path]::GetFullPath($env:RUNNER_TEMP) -or
    [IO.Path]::GetFileName($jobRoot) -cnotmatch ('^native-registry-' + $env:GITHUB_RUN_ID + '-[0-9a-f]{32}$') -or
    ((Get-Item -LiteralPath $jobRoot).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'NATIVE_ROOT_REJECTED' }
$resultPath = Join-Path $jobRoot 'result.json'
$state = Get-Content -Raw -LiteralPath $resultPath | ConvertFrom-Json -AsHashtable
if ($state.runId -cne $env:GITHUB_RUN_ID -or $state.control -cne $env:GITHUB_SHA -or
    $state.firstFailure -cne 'SOURCE_NOT_PROVEN') { throw 'NATIVE_INITIAL_REPORT_REJECTED' }
$state.source = $env:KSESSION_NATIVE_SOURCE
$state['environmentRestored'] = $null
$state['buildScope'] = $null
function Save-Stage ([string]$Stage, [string]$Reason) {
    $state.stage = $Stage
    $state.firstFailure = $Reason
    [IO.File]::WriteAllText($resultPath, ($state | ConvertTo-Json -Depth 12 -Compress))
}
Save-Stage 'TOOLS' 'TOOLS_NOT_PROVEN'

$repo = $env:GITHUB_WORKSPACE
. (Join-Path $repo 'tools/tests/fresh-lan-trial/fast-delivery/job-scope.ps1')
. (Join-Path $repo 'tools/tests/lan-host/node-test-environment.ps1')
$pin = Get-Content -Raw -LiteralPath (Join-Path $repo 'tools/windows-launcher/toolchain.json') | ConvertFrom-Json
if ($pin.goVersion -cne '1.27.1' -or $pin.goWindowsZip -cne 'https://go.dev/dl/go1.27.1.windows-amd64.zip' -or
    $pin.sha256 -cne 'a3911b5e0e1b1053f25ed0675f4c1c6aad1e2bfcf253df2b9be4caabd2edd95d') { throw 'NATIVE_GO_PIN_REJECTED' }
$zip = Join-Path $jobRoot 'go.zip'
$goRoot = Join-Path $jobRoot 'go'
if ((Test-Path -LiteralPath $zip) -or (Test-Path -LiteralPath $goRoot)) { throw 'TOOL_DESTINATION_OCCUPIED' }
Invoke-WebRequest -Uri $pin.goWindowsZip -OutFile $zip -TimeoutSec 240
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $zip).Hash.ToLowerInvariant() -cne $pin.sha256) { throw 'NATIVE_GO_ARCHIVE_REJECTED' }
[IO.Compression.ZipFile]::ExtractToDirectory($zip,$jobRoot,$false)
$goExe = Join-Path $goRoot 'bin/go.exe'
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $goExe).Hash.ToLowerInvariant() -cne
    'd3ccdb604eafa6031133aefe1a3db24f0bb7362b857bc2125ac4e4c178b4b490') { throw 'NATIVE_GO_EXE_REJECTED' }
foreach ($leaf in @('tmp','cache','appdata','localappdata')) {
    New-Item -ItemType Directory -Path (Join-Path $jobRoot $leaf) -ErrorAction Stop | Out-Null
}
$settings = @{
    TEMP=(Join-Path $jobRoot 'tmp'); TMP=(Join-Path $jobRoot 'tmp'); GOTMPDIR=(Join-Path $jobRoot 'tmp');
    GOCACHE=(Join-Path $jobRoot 'cache'); APPDATA=(Join-Path $jobRoot 'appdata'); LOCALAPPDATA=(Join-Path $jobRoot 'localappdata');
    GOROOT=$goRoot; GOENV='off'; GOOS='windows'; GOARCH='amd64'; CGO_ENABLED='0'; GOWORK='off';
    GOTOOLCHAIN='local'; GOPROXY='off'; GOSUMDB='off'; GOFLAGS=''; GOEXPERIMENT='';
    KSESSION_NATIVE_REPORT=(Join-Path $jobRoot 'native.json')
}
$savedEnv = Save-KSessionProcessEnvironment @($settings.Keys)
try {
    foreach ($key in $settings.Keys) { [Environment]::SetEnvironmentVariable($key,$settings[$key],'Process') }
    Save-Stage 'COMPILE' 'NATIVE_COMPILE_NOT_PROVEN'
    $overlayRoot = Join-Path $jobRoot 'overlay'
    $overlay = Join-Path $overlayRoot 'overlay.json'
    $output = @(& node (Join-Path $repo 'tools/tests/fresh-lan-trial/prepare-overlay.cjs') $overlayRoot '--native-only' 2>&1)
    if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $overlay -PathType Leaf)) { throw 'NATIVE_OVERLAY_FAILED' }
    $testExe = Join-Path $jobRoot 'native-registry.test.exe'
    Push-Location -LiteralPath (Join-Path $repo 'tools/windows-launcher')
    try {
        $build = Invoke-FastOwnedProcess -Executable $goExe -Arguments @('test','-c','-overlay',$overlay,'-o',$testExe,'.') -Gate (Join-Path $jobRoot 'compile.gate') -TimeoutSeconds 600
    } finally { Pop-Location }
    $state.buildScope = $build
    Save-Stage 'COMPILE' 'NATIVE_COMPILE_NOT_PROVEN'
    if ($build.status -cne 'PASS' -or !(Test-Path -LiteralPath $testExe -PathType Leaf)) { throw 'NATIVE_COMPILE_FAILED' }

    Save-Stage 'NATIVE' 'NATIVE_REPORT_NOT_PROVEN'
    if (Test-Path -LiteralPath $env:KSESSION_NATIVE_REPORT) { throw 'NATIVE_REPORT_ALREADY_PRESENT' }
    $state.scope = Invoke-FastOwnedProcess -Executable $testExe -Arguments @('-test.run=^TestFreshNativeRegistryRecoveryOnly$','-test.count=1','-test.timeout=10m') -Gate (Join-Path $jobRoot 'native.gate') -TimeoutSeconds 660
    Save-Stage 'NATIVE' 'NATIVE_REPORT_NOT_PROVEN'
    # Only a strict, identity-bound report is allowed into the artifact.
    $verified = @(& node (Join-Path $PSScriptRoot 'validate-report.cjs') $env:KSESSION_NATIVE_REPORT 2>&1)
    if ($LASTEXITCODE -ne 0 -or $verified.Count -ne 1) { throw 'NATIVE_REPORT_REJECTED' }
    $native = $verified[0] | ConvertFrom-Json -AsHashtable
    if ($native.kind -cne 'FRESH_NATIVE_REGISTRY_RECOVERY' -or $native.sourceCommit -cne $env:KSESSION_NATIVE_SOURCE -or
        $native.controlCommit -cne $env:GITHUB_SHA -or $native.runId -cne $env:GITHUB_RUN_ID -or
        $native.scenarios.Count -ne 3 -or $native.status -cnotin @('PASS','FAIL')) { throw 'NATIVE_REPORT_CONTRACT_MISMATCH' }
    $state.native = $native
    if ($state.native.status -cne 'PASS') {
        Save-Stage 'NATIVE' $state.native.firstFailure
    } elseif ($state.scope.status -cne 'PASS') {
        Save-Stage 'PROCESS' 'PROCESS_RECOVERY_UNPROVEN'
    } else {
        $state.status = 'PASS'
        Save-Stage 'COMPLETE' 'NONE'
    }
} finally {
    Restore-KSessionProcessEnvironment $savedEnv
    $state.environmentRestored = Test-KSessionProcessEnvironmentRestored $savedEnv
    if (!$state.environmentRestored) {
        if ($state.firstFailure -ceq 'NONE') { $state.firstFailure = 'PROCESS_ENVIRONMENT_UNRESTORED' }
        $state.status = 'FAIL'
    }
    Save-Stage $state.stage $state.firstFailure
}
if ($state.status -cne 'PASS') { throw 'NATIVE_JOB_FAILED' }
