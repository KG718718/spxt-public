//go:build windows

package main

import (
	"bytes"
	"errors"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
	"unsafe"
)

var getSystemDirectoryW = syscall.NewLazyDLL("kernel32.dll").NewProc("GetSystemDirectoryW")

const firewallScript = `$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
function Stop-With([int]$exit,[string]$code){[Console]::Error.WriteLine($code);exit $exit}
try {
  $action=$env:KSESSION_FW_ACTION;$interfaceName=$env:KSESSION_FW_INTERFACE_NAME;$portText=$env:KSESSION_FW_PORT
  $program=$env:KSESSION_FW_PROGRAM
  $managedRuleMutationStarted=$false
  $managedRule=$null
  if($action -notin @('status','enable')){Stop-With 20 'INVALID_INVOCATION'}
  if([string]::IsNullOrWhiteSpace($interfaceName) -or $interfaceName.Length -gt 128 -or $interfaceName.Trim() -cne $interfaceName -or $interfaceName -match '[\x00-\x1f\x7f]' -or $interfaceName -match '(?i)(\b(vpn|tunnel|tap|tun|wireguard|docker|wsl|virtual|vmware|virtualbox|loopback|bluetooth|teredo|isatap|6to4)\b|hyper[- ]?v|vethernet)'){Stop-With 20 'INVALID_ADAPTER'}
  [int]$port=0;if(-not [int]::TryParse($portText,[ref]$port) -or $port -lt 8080 -or $port -gt 8099){Stop-With 20 'INVALID_PORT'}
  $moduleRoot=$env:SystemRoot+'\System32\WindowsPowerShell\v1.0\Modules'
  Import-Module ($moduleRoot+'\NetAdapter\NetAdapter.psd1') -Force -ErrorAction Stop
  Import-Module ($moduleRoot+'\NetConnection\NetConnection.psd1') -Force -ErrorAction Stop
  Import-Module ($moduleRoot+'\NetTCPIP\NetTCPIP.psd1') -Force -ErrorAction Stop
  Import-Module ($moduleRoot+'\NetSecurity\NetSecurity.psd1') -Force -ErrorAction Stop
  $adapters=@(Get-NetAdapter -IncludeHidden -ErrorAction Stop | Where-Object {[string]$_.Name -ceq $interfaceName})
  if($adapters.Count -ne 1){Stop-With 23 'ADAPTER_NOT_FOUND'}
  $adapter=$adapters[0]
  if($adapter.Status -ne 'Up' -or $adapter.HardwareInterface -ne $true -or $adapter.Virtual -eq $true -or $adapter.Hidden -eq $true -or $adapter.InterfaceType -notin @(6,71)){Stop-With 23 'ADAPTER_UNSAFE'}
  if(([string]$adapter.Name+' '+[string]$adapter.InterfaceDescription) -match '(?i)(vpn|virtual|hyper-v|wsl|docker|tunnel|loopback|vethernet|(^|[^a-z])(tap|tun)([^a-z]|$))'){Stop-With 23 'ADAPTER_UNSAFE'}
  $profiles=@(Get-NetConnectionProfile -InterfaceIndex $adapter.InterfaceIndex -ErrorAction Stop)
  if($profiles.Count -ne 1 -or $profiles[0].NetworkCategory -ne 'Private'){Stop-With 23 'NETWORK_NOT_PRIVATE'}
  $addresses=@(Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -ErrorAction Stop | Where-Object {$_.AddressState -eq 'Preferred' -and $_.SkipAsSource -eq $false})
  $addresses=@($addresses | Where-Object { $b=[Net.IPAddress]::Parse($_.IPAddress).GetAddressBytes(); ($b[0]-eq 10) -or ($b[0]-eq 172 -and $b[1]-ge 16 -and $b[1]-le 31) -or ($b[0]-eq 192 -and $b[1]-eq 168) })
  if($addresses.Count -ne 1){Stop-With 23 'PRIVATE_ADDRESS_AMBIGUOUS'}
  $address=$addresses[0]
  $bytes=[Net.IPAddress]::Parse($address.IPAddress).GetAddressBytes()
  [int]$minimumPrefix=0
  if($bytes[0] -eq 10){$minimumPrefix=8}
  elseif($bytes[0] -eq 172 -and $bytes[1] -ge 16 -and $bytes[1] -le 31){$minimumPrefix=12}
  elseif($bytes[0] -eq 192 -and $bytes[1] -eq 168){$minimumPrefix=16}
  else{Stop-With 23 'SUBNET_UNSAFE'}
  [int]$prefix=$address.PrefixLength;if($prefix -lt $minimumPrefix -or $prefix -gt 30){Stop-With 23 'SUBNET_UNSAFE'}
  [uint32]$ip=([uint32]$bytes[0] -shl 24) -bor ([uint32]$bytes[1] -shl 16) -bor ([uint32]$bytes[2] -shl 8) -bor [uint32]$bytes[3]
  [uint32]$mask=[uint32]::MaxValue -shl (32-$prefix);[uint32]$network=$ip -band $mask
  $subnet=('{0}.{1}.{2}.{3}/{4}' -f (($network -shr 24) -band 255),(($network -shr 16) -band 255),(($network -shr 8) -band 255),($network -band 255),$prefix)
  $routes=@(Get-NetRoute -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -ErrorAction Stop | Where-Object {$_.DestinationPrefix -eq $subnet})
  if($routes.Count -lt 1){Stop-With 23 'SUBNET_ROUTE_MISSING'}
  $ruleName='KSESSION-LAN-Host-v1';$displayName='K⁺-SESSION LAN Host (Private)';$group='K⁺-SESSION';$description='KSESSION_MANAGED_LAN_RULE_V1'
  function Test-RuleOwned($candidate){
    return ($null -ne $candidate -and $candidate.DisplayName -eq $displayName -and $candidate.Group -eq $group -and $candidate.Description -eq $description)
  }
  function Test-RuleExact($candidate,[bool]$expectedEnabled){
    if(-not (Test-RuleOwned $candidate)){return $false}
    $pf=@($candidate|Get-NetFirewallPortFilter -ErrorAction Stop);$af=@($candidate|Get-NetFirewallApplicationFilter -ErrorAction Stop)
    $rf=@($candidate|Get-NetFirewallAddressFilter -ErrorAction Stop);$if=@($candidate|Get-NetFirewallInterfaceFilter -ErrorAction Stop)
    if($pf.Count -ne 1 -or $af.Count -ne 1 -or $rf.Count -ne 1 -or $if.Count -ne 1){return $false}
    $enabled=([string]$candidate.Enabled -eq 'True')
    return ($candidate.Direction -eq 'Inbound' -and $candidate.Action -eq 'Allow' -and $enabled -eq $expectedEnabled -and [string]$candidate.Profile -eq 'Private' -and [string]$candidate.EdgeTraversalPolicy -eq 'Block' -and
      [string]$pf[0].Protocol -eq 'TCP' -and [string]$pf[0].LocalPort -eq [string]$port -and [string]$pf[0].RemotePort -eq 'Any' -and
      [IO.Path]::GetFullPath([string]$af[0].Program) -ieq [IO.Path]::GetFullPath($program) -and
      @($rf[0].RemoteAddress).Count -eq 1 -and [string]$rf[0].RemoteAddress -eq $subnet -and
      @($if[0].InterfaceAlias).Count -eq 1 -and [string]$if[0].InterfaceAlias -eq [string]$adapter.Name)
  }
  function Test-ActiveEffective {
    $private=@(Get-NetFirewallProfile -Name Private -PolicyStore ActiveStore -ErrorAction Stop)
    if($private.Count -ne 1 -or [string]$private[0].Enabled -ne 'True' -or [string]$private[0].AllowInboundRules -eq 'False' -or [string]$private[0].AllowLocalFirewallRules -eq 'False'){return $false}
    $active=@(Get-NetFirewallRule -Name $ruleName -PolicyStore ActiveStore -ErrorAction SilentlyContinue)
    return ($active.Count -eq 1 -and (Test-RuleExact $active[0] $true))
  }
  $rules=@(Get-NetFirewallRule -Name $ruleName -PolicyStore PersistentStore -ErrorAction SilentlyContinue)
  if($rules.Count -gt 1){Stop-With 24 'RULE_CONFLICT'}
  if($rules.Count -eq 0){
    if($action -eq 'status'){[Console]::Out.WriteLine('{"schema":1,"status":"MISSING"}');exit 10}
    $managedRule=New-NetFirewallRule -Name $ruleName -DisplayName $displayName -Group $group -Description $description -Direction Inbound -Action Allow -Enabled False -Profile Private -EdgeTraversalPolicy Block -Protocol TCP -LocalPort $port -RemoteAddress $subnet -Program $program -InterfaceAlias $adapter.Name -PolicyStore PersistentStore -ErrorAction Stop
    if($null -eq $managedRule -or -not (Test-RuleOwned $managedRule)){Stop-With 25 'FIREWALL_OPERATION_FAILED'}
    $managedRuleMutationStarted=$true
    $rules=@(Get-NetFirewallRule -Name $ruleName -PolicyStore PersistentStore -ErrorAction Stop)
    if($rules.Count -ne 1){Stop-With 25 'FIREWALL_OPERATION_FAILED'}
  }
  $rule=$rules[0]
  if(-not (Test-RuleOwned $rule)){Stop-With 24 'RULE_CONFLICT'}
  $managedRule=$rule
  if($action -eq 'enable'){$managedRuleMutationStarted=$true}
  if((Test-RuleExact $rule $true) -and (Test-ActiveEffective)){[Console]::Out.WriteLine('{"schema":1,"status":"ALLOWED"}');exit 0}
  if($action -eq 'status'){[Console]::Out.WriteLine('{"schema":1,"status":"STALE"}');exit 10}
  Set-NetFirewallRule -Name $ruleName -Direction Inbound -Action Allow -Enabled False -Profile Private -EdgeTraversalPolicy Block -PolicyStore PersistentStore -ErrorAction Stop | Out-Null
  $rule|Get-NetFirewallPortFilter|Set-NetFirewallPortFilter -Protocol TCP -LocalPort $port -RemotePort Any -ErrorAction Stop|Out-Null
  $rule|Get-NetFirewallApplicationFilter|Set-NetFirewallApplicationFilter -Program $program -ErrorAction Stop|Out-Null
  $rule|Get-NetFirewallAddressFilter|Set-NetFirewallAddressFilter -RemoteAddress $subnet -ErrorAction Stop|Out-Null
  $rule|Get-NetFirewallInterfaceFilter|Set-NetFirewallInterfaceFilter -InterfaceAlias $adapter.Name -ErrorAction Stop|Out-Null
  $disabled=@(Get-NetFirewallRule -Name $ruleName -PolicyStore PersistentStore -ErrorAction Stop)
  if($disabled.Count -ne 1 -or -not (Test-RuleExact $disabled[0] $false)){Stop-With 25 'FIREWALL_OPERATION_FAILED'}
  Set-NetFirewallRule -Name $ruleName -Enabled True -PolicyStore PersistentStore -ErrorAction Stop | Out-Null
  $final=@(Get-NetFirewallRule -Name $ruleName -PolicyStore PersistentStore -ErrorAction Stop)
  if($final.Count -ne 1 -or -not (Test-RuleExact $final[0] $true) -or -not (Test-ActiveEffective)){
    $disableTarget=if($final.Count -eq 1 -and (Test-RuleOwned $final[0])){$final[0]}else{$managedRule}
    if(Test-RuleOwned $disableTarget){$disableTarget|Set-NetFirewallRule -Enabled False -ErrorAction SilentlyContinue|Out-Null}
    Stop-With 25 'FIREWALL_OPERATION_FAILED'
  }
  [Console]::Out.WriteLine('{"schema":1,"status":"ENABLED"}');exit 0
} catch {
  if($action -eq 'enable' -and $managedRuleMutationStarted){
    try {
      if(Test-RuleOwned $managedRule){$managedRule|Set-NetFirewallRule -Enabled False -ErrorAction Stop|Out-Null}
    } catch {}
  }
  Stop-With 25 'FIREWALL_OPERATION_FAILED'
}
`

func systemPowerShell() (string, error) {
	systemDir, err := systemDirectory()
	if err != nil {
		return "", reject(exitBlocked, "SYSTEM_POWERSHELL_UNAVAILABLE")
	}
	path := filepath.Join(systemDir, "WindowsPowerShell", "v1.0", "powershell.exe")
	if noReparse(path) != nil {
		return "", reject(exitBlocked, "SYSTEM_POWERSHELL_UNAVAILABLE")
	}
	return path, nil
}

func systemDirectory() (string, error) {
	buf := make([]uint16, syscall.MAX_PATH+1)
	n, _, callErr := getSystemDirectoryW.Call(uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	if n == 0 || n >= uintptr(len(buf)) {
		return "", callErr
	}
	systemDir := syscall.UTF16ToString(buf[:n])
	if _, err := cleanLocal(systemDir); err != nil {
		return "", err
	}
	if !stringsEqualFold(filepath.Base(systemDir), "System32") {
		return "", errors.New("unexpected system directory")
	}
	return systemDir, nil
}

func stringsEqualFold(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		ca, cb := a[i], b[i]
		if ca >= 'A' && ca <= 'Z' {
			ca += 'a' - 'A'
		}
		if cb >= 'A' && cb <= 'Z' {
			cb += 'a' - 'A'
		}
		if ca != cb {
			return false
		}
	}
	return true
}

func runFirewall(req request, install trustedInstall) (int, []byte, error) {
	powershell, err := systemPowerShell()
	if err != nil {
		return exitBlocked, nil, err
	}
	systemDir, err := systemDirectory()
	if err != nil {
		return exitBlocked, nil, reject(exitBlocked, "SYSTEM_POWERSHELL_UNAVAILABLE")
	}
	cmd := exec.Command(powershell, "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", firewallScript)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	cmd.Env = []string{
		"SystemRoot=" + filepath.Dir(systemDir), "WINDIR=" + filepath.Dir(systemDir),
		"PATH=" + systemDir,
		"PSModulePath=" + filepath.Join(systemDir, "WindowsPowerShell", "v1.0", "Modules"),
		"KSESSION_FW_ACTION=" + req.Action, "KSESSION_FW_INTERFACE_NAME=" + req.InterfaceName,
		"KSESSION_FW_PORT=" + strconv.Itoa(req.Port), "KSESSION_FW_PROGRAM=" + install.NodePath,
	}
	var stdout, stderr bytes.Buffer
	cmd.Stdout, cmd.Stderr = &stdout, &stderr
	err = cmd.Run()
	exit := 0
	if err != nil {
		var ee *exec.ExitError
		if !errors.As(err, &ee) {
			return exitBlocked, nil, reject(exitBlocked, "FIREWALL_OPERATION_FAILED")
		}
		exit = ee.ExitCode()
	}
	if stderr.Len() > 2048 {
		return exitBlocked, nil, reject(exitBlocked, "FIREWALL_OPERATION_FAILED")
	}
	if exit == 10 {
		status, parseErr := validateScriptResult(stdout.Bytes())
		if parseErr != nil || (status != "MISSING" && status != "STALE") {
			return exitBlocked, nil, reject(exitBlocked, "FIREWALL_OPERATION_FAILED")
		}
		return exitBlocked, response("BLOCKED", "FIREWALL_"+status), nil
	}
	if exit != 0 {
		switch exit {
		case exitInvalid:
			return exit, nil, reject(exit, "INVALID_INVOCATION")
		case exitNetwork:
			return exit, nil, reject(exit, "NETWORK_UNSAFE")
		case exitRuleConflict:
			return exit, nil, reject(exit, "RULE_CONFLICT")
		case exitBlocked:
			return exit, nil, reject(exit, "FIREWALL_OPERATION_FAILED")
		default:
			return exitBlocked, nil, reject(exitBlocked, "FIREWALL_OPERATION_FAILED")
		}
	}
	status, err := validateScriptResult(stdout.Bytes())
	if err != nil || (status != "ALLOWED" && status != "ENABLED") {
		return exitBlocked, nil, reject(exitBlocked, "FIREWALL_OPERATION_FAILED")
	}
	return 0, response(status, "FIREWALL_"+status), nil
}
