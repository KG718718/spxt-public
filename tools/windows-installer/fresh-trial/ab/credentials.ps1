# Owned execution processes only; never write machine/user environment state.
function Clear-FreshExecutionCredentials {
 foreach($taskName in @([Environment]::GetEnvironmentVariables().Keys)){
  if([string]$taskName -match '^(GH_TOKEN|GITHUB_TOKEN|ACTIONS_RUNTIME_TOKEN|ACTIONS_ID_TOKEN_REQUEST_TOKEN)$|(_TOKEN|_SECRET|_PASSWORD|_PRIVATE_KEY|_CREDENTIAL|_API_KEY)$'){
   [Environment]::SetEnvironmentVariable([string]$taskName,$null,'Process')
  }
 }
}
