function Test-KSessionFixedEPath {
  param([Parameter(Mandatory=$true)][string]$Value)
  try {
    if([string]::IsNullOrWhiteSpace($Value) -or ![IO.Path]::IsPathFullyQualified($Value)){return $false}
    $taskFull=[IO.Path]::GetFullPath($Value)
    return [StringComparer]::OrdinalIgnoreCase.Equals([IO.Path]::GetPathRoot($taskFull),'E:\')
  }catch{return $false}
}
