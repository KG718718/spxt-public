# Batch 4.5 — Utility序列化路径决策卡｜2026-09-27

## 【当前事实】

历史S01含`ConvertTo-Json`，不能被称为纯PowerShell启动测试；旧证据不改，解释已更正。新获批且仅一次的本机链结果是M00纯.NET输出PASS、M01显式Utility模块导入PASS、M02旧S01等价`ConvertTo-Json`路径FAIL/非空stderr。三阶段分别启动PowerShell，M01干净**不等于**M02进程的自动加载干净。生产完整发现脚本确有`ConvertTo-Json`，但它同时执行多项网络查询；不能从M02推断完整脚本只有一个故障。生产P02仍FAIL，P03—P08未到达，stderr fail-closed未改。安全证据与提交身份见`PRE-NETWORK-UTILITY-STOP-20260927.md`。Microsoft官方文档确认[ConvertTo-Json属Utility模块](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertto-json?view=powershell-5.1)，[模块命令可触发自动加载](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_modules?view=powershell-7.5)；这只是机制依据，不是本机stderr具体来源的证明。

## 【技术约束】

生产exe经`resolveSystemPowerShell()`真实路径/非链接校验；固定NoLogo/NoProfile/NonInteractive/ExecutionPolicy Bypass/WindowStyle Hidden/EncodedCommand、System32 cwd、四项受限env、15秒timeout/1MiB buffer。生产拒绝任何非空stderr，并要求JSON可安全解析。不得把整个`process.env`交给子进程、从PATH挑任意PowerShell、放宽Private/Public/VPN/virtual/selected-subnet规则。真实探针额度M00—M02已用；H1/H2 2/2，Final Full0/1、QA0/1不能做诊断。当前Git写入及GitHub写认证另受环境阻塞，公开分支尚未同步本轮结果。

## 【可选方案与影响】

A（建议，需新明确授权）：仅在原T5/原工作树先做合成门禁与Master Review，再增加**一次本机只读同进程对照**：显式`Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop`后，在**同一PowerShell进程**执行旧S01等价`ConvertTo-Json`。维持同一安全exe/flags/cwd/env/timeout/maxBuffer，仅记录固定PASS/FAIL、stderr空否、exit0与固定stdout校验，不记录正文、路径、环境或身份。若仍stderr非空，歧义缩至序列化/管道路径；若干净，自动加载路径成为更强候选。两种结果均不自动批准生产修复，完整脚本仍须后续真实P01—P08证明。此选项会新增一次本机诊断，**不在当前授权内**，也不能保证一次就闭合所有根因。

B：保持冻结；不再做诊断或生产修改。等用户提供可批准的取证方式，或明确接受当前无法安全推进Batch4.5。Final Full/QA额度保留，公开Git同步待环境恢复。

## 【需要网页版决定】

是否批准方案A的**一次**同进程本机只读对照？若不批准，执行方案B。当前结果不足以安全决定“加入显式Import-Module”“替换ConvertTo-Json”“忽略stderr”或更改生产输出协议。任何将来最小修复仍须原T5实现、Master Review、真实Win10 P01—P08全部PASS且privateCandidatePresent=true，才可恢复唯一Final Full和独立QA；不进入Batch5/OCR/main/tag/Release。Git权限/认证恢复是独立交付前提，不是Hosted诊断额度。
