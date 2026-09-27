# S01历史结果解释更正｜2026-09-27

历史真实证据`evidence/stderr-layer-live.json`及其固定`layer=STARTUP`字段**原样保留**；它记录当时分类器的输出，不可改写。更准确的工程解释为`PRE_NETWORK_UTILITY_SERIALIZATION_STAGE`：S01没有调用Get-Net*或执行网络查询，但payload使用`[pscustomobject]@{ok=$true} | ConvertTo-Json -Compress`，因此证明的仅是**网络命令之前已有stderr**，并未隔离纯PowerShell启动。

[Microsoft Windows PowerShell 5.1的ConvertTo-Json文档](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertto-json?view=powershell-5.1)将该命令列于`Microsoft.PowerShell.Utility`模块；[Microsoft的模块说明](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_modules?view=powershell-7.5)说明默认首次使用模块命令会自动加载该模块。这使Utility模块加载或序列化成为**可能的混淆因素**，但不是已证实stderr来源。前次止损报告、七字段证据和生产P02失败结论均保持历史原貌；任何将`STARTUP`读成“powershell.exe启动本身已证实报错”的文字，均由本更正限制其含义。

网页版最新只额外批准当前Win10本地一次M00→条件M01→条件M02只读链，先合成门禁与Master Review；生产、Windows网络和stderr fail-closed不改，无Hosted/Final Full/QA额度增加。完整边界见`CORRECTED-PRE-NETWORK-STDERR-APPROVAL.md`。在新真实链完成前，当前状态为`BLOCKED — PRE-NETWORK STDERR SOURCE UNRESOLVED`。
