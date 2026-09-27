# Batch 4.5 — S01 STARTUP止损记录｜2026-09-27

> 解释更正：此标题及证据中的 STARTUP 是当时分类器的历史标签。S01 使用 ConvertTo-Json，故只能证明网络命令之前已有 stderr，不能证明纯 PowerShell 启动本身产生 stderr。证据原样保留；见 `PRE-NETWORK-STDERR-INTERPRETATION.md`。

**BLOCKED — S01 STARTUP STDERR; SOURCE STILL UNRESOLVED。** 网页版只批准的一次本机S01—S03链已完成，结果在S01即FAIL/STARTUP，S02/S03均NOT_RUN。唯一Master`01a0db0e-c950-79e0-8e11-07155e0742f2`、原T5线程与原工作树保留，原T5已冻结；旧Master只读历史。

## 当前事实

真实Windows10 Pro x64 build19045；未改生产`public-lan-network.js` blob `4e13e944472f845675fe73d176f063c4fe97f6ed`。已批准的一次live入口只执行S01：固定`$ErrorActionPreference='Stop'`及常量JSON序列化，没有Get-Net*/Import-Module/网络查询，也不读取网络身份。最终唯一安全JSON为`{"schema":1,"status":"FAIL","layer":"STARTUP","S01":"FAIL","S02":"NOT_RUN","S03":"NOT_RUN","stderrEmpty":false}`。合成分类器把STARTUP限定为进程正常、exit0、无signal、固定JSON有效且stderr非空；该报告未保存原始进程输出。可以确认**在网络cmdlet/查询之前就出现stderr**；不能凭此再区分PowerShell启动、基础运行环境、常量序列化或外部宿主因素，不能称其为无害警告。

原T5合成local`690e007`/`29ececa`经Master独立28/28、payload只读、安全执行器/隐私Review整合`8d6c3c2`/`9ce5890`。真实结果local`150ef216f91708f2af0041d832edabf94b6442f3`经Master七字段白名单、唯一调用、生产blob和diff Review整合`ebd214527df7742b623ad396819735bdb0b85193`。原始stderr/stdout、异常、网络身份、实际路径及hash/长度未保存。生产P02仍FAIL，P03—P08仍NOT_REACHED。

## 额度与停止

历史Hosted H1/H2 2/2，禁止H3/H4及等价诊断；Final Full0/1、Final QA0/1未动。S01—S03本机链已用，不重复；S02/S03未运行不是PASS。无最终beta.3 Candidate Artifact，无真实双设备LAN人工验收。8.3额外历史110PASS/1SKIP维持，只有双环境能力确实不可用才另记环境不可用，不算PASS；核心26/742仍须fail0skip0。按正式批准第12节情况A，禁止修network discovery查询逻辑、忽略stderr、擅改PowerShell安全环境或再跑探针；仅整理决策并交网页版。
