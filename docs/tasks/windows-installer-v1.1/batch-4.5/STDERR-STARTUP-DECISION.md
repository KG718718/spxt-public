# Batch 4.5 — S01 STARTUP决策摘要｜2026-09-27

## 【当前事实】

真实Win10上P01安全系统PowerShell PASS，但生产P02仍`NETWORK_DISCOVERY_FAILED`。前轮两次完整脚本与N01—N05均exit0/可解析stdout/非空stderr。本轮唯一S01常量payload在**没有任何网络cmdlet或网络查询**时也产生stderr，S02/S03依批准未运行；固定证据见`evidence/stderr-layer-live.json`。因此网络查询不是触发本次stderr的必要条件，但不能证明它不含其他独立问题。生产blob未改，原T5再次冻结，Final Full/QA仍0/1。

## 【PowerShell启动环境约束】

生产`resolveSystemPowerShell()`验证Windows目录及系统PowerShell文件均为非符号链接、真实路径一致；只使用该exe。子进程固定`-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand`，`cwd=System32`，15秒超时、1MiB缓冲；环境只包含可信SystemRoot、WINDIR、System32 PATH及系统PSModulePath。S01沿用这些条件，仅payload为固定错误策略与常量JSON输出。安全模型要求stderr非空时fail closed。未记录原始stderr；现有证据不足以判断内容或产生组件。

## 【可能的最小环境修复】

目前**没有已证实可实施的修复**。静态候选仅供网页版选择后续取证方向：核对安全环境白名单是否缺少PowerShell基础运行所需系统变量；核对常量序列化/宿主输出是否触发stderr；核对仅在当前主机出现的PowerShell启动异常。三者均未由现有固定JSON区分。增加环境变量、变更PowerShell调用参数或改变stderr拒绝条件都会改变生产安全执行器；不能由Master现在自行改。若网页版希望继续，可另批一次严格本机、只读、固定类别的更窄诊断；应先确定次数、隐私白名单、合成门禁和明确停止条件，不使用Hosted额度。否则维持BLOCKED。

## 【是否影响安全模型】

当前没有改动安全模型。任何“exit0所以忽略stderr”都会掩盖潜在权限、部分失败或宿主错误，不获批准；更换任意PATH里的powershell、放宽Private/virtual/VPN/Public/selected-subnet、使用管理员/新模块/服务/Registry路线亦不获批准。若未来证据指向仅补充可信系统环境变量，也要先Review变量来源、子进程搜索路径/模块加载影响、Win10/Win11兼容与fail-closed反例；不能预先当作普通修复。

## 【需要网页版决定】

按本次第12节情况A，当前应停止。请决定：保持冻结，或另行明确授权一次针对S01内部来源的有界本机只读诊断；当前授权**不包含**下一次真实探针或任何生产修复。H1/H2 2/2、Final Full0/1、Final QA0/1保留；只有未来真实P01—P08全PASS且privateCandidatePresent=true才可恢复Final Full。
