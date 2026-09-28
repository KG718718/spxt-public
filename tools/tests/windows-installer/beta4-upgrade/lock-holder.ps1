param([Parameter(Mandatory=$true)][string]$LockFile)
$ErrorActionPreference='Stop'
$handle=[IO.File]::Open($LockFile,[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
try{
  [Console]::Out.WriteLine('LOCKED')
  [Console]::Out.Flush()
  while($null-ne($line=[Console]::ReadLine())){
    if($line -ceq 'release'){break}
  }
}finally{
  $handle.Dispose()
}
