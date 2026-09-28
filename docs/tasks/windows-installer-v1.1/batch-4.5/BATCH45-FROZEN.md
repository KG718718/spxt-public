# Batch 4.5 — LAN Host 冻结决定

日期：2026-09-28。网页版正式选择 Route C，Batch 4.5 状态为 **`FROZEN — LAN HOST DEFERRED`**。这不是整个 K⁺-SESSION 项目失败，也不撤销 Batch 4 的验收。

## 已完成与证据边界

- T1—T5 的 LAN 网络发现、监听/首 Admin/子网守卫、Launcher、防火墙、beta.2→beta.3 独立升级事务及对应局部门禁已实施/Review；T6 的原生网络发现有界研究已交付。所有源码、research、回单、Actions、失败运行和证据原样保留；历史 FAIL 不改称 PASS。
- PowerShell Route A：真实 Win10 P01 PASS，P02 FAIL/`DISCOVERY_COMMAND_FAILED`，P03—P08 NOT_REACHED。M00/M01 PASS、M02 FAIL、M03 PASS。显式导入 Utility 的最小生产修改合成 F01—F12 12/12 PASS，但真实完整 production discovery 仍在 P02 FAIL。现有 Utility 行是未解决问题的实验性修改，明确 **`NOT APPROVED FOR RELEASE`**；当前 `codex/lan-host-v1.1` 不能交付用户。
- Native Route B：固定 Go 1.27.1、CGO=0、离线、零第三方依赖；合成 F01—F15 15/15，go vet/build PASS。但研究 EXE 未在真实 Win10 运行，GetAdaptersAddresses/GetIfEntry2/GetIpInterfaceEntry、route/interface metric、NLM COM、adapter→Private 关联与普通用户权限均未证明。本轮小 PoC 门槛为 `FAIL — NATIVE ROUTE NOT ACCEPTABLE`，不代表原生路线永不可行。

## 未完成及不得宣称

生产 LAN discovery P02 未通过，后续 P03—P08 未到达；真实双设备 LAN、完整 Setup/防火墙/升级回滚最终矩阵、Final Full 与独立 Final QA 均未闭合。Final Full `0/1`、Final QA `0/1` 记 **`UNUSED — BATCH FROZEN`**，不为耗额度而运行。没有 beta.3 最终 Artifact；所有 beta.3 构建不得称 final candidate、LAN ready 或 release candidate，也不得交普通用户。LAN **`NOT RELEASED / NOT CERTIFIED`**；Win11 **`NOT PHYSICAL-MACHINE CERTIFIED`**。

## 正式产品基线

Batch 4 独立为 **`PASS — Windows 10 x64 Beta Upgrade Track`**。受验 F3：`1.1.0-beta.2`，source `c8886e6b6d413c2fd73d6716621d07a80b337e58`，Run `36246132535`，Artifact `10907910968`。历史验收含 beta.1→beta.2、instance/账号/附件保持、卸载保留数据、fresh 重装恢复 instance，以及用户 Win10 人工 1—10 PASS。这是历史受验身份，不承诺 Artifact 永久在线。当前正式用户产品仅为 **`K⁺-SESSION 1.1.0-beta.2 / Single-machine Beta Track`**。

## 冻结与未来恢复

B45-T1—T6、B4.5-QA 全部冻结；原任务线程、工作树、分支、研究及证据保留，不删除、不改写、不清理。本次只更新治理文档，commit 并非 force push `codex/lan-host-v1.1`；不改生产，不操作 main/tag/Release，不启动 Batch5/OCR。

未来若重启 LAN Host，另立独立 Batch（如 `Batch LAN-2`）。GPT Planner 先以本 Batch 证据重新比较 PowerShell 封闭成功协议、Windows 原生 helper 或另获批准路线，定义技术路线、成本、真实 Win10/Win11 范围、Hosted 用途与止损；不能直接延续 T5 的无限诊断。若选 Native，可复用固定 Go 工具链、CGO0、System32 DLL 加载研究、F01—F15、API mapping、NLM 与打包/身份风险，不从零重复。下一项独立工作重点是 GPT Planner ↔ GitHub ↔ Codex Executor 工作流优化，以减少人工复制交接/决定；本次冻结收尾不启动该工作。

历史依据：`batch-4/RESULT.md`、`batch-4/HUMAN-ACCEPTANCE.md`、本目录 `RESULT.md`、`ORCHESTRATION.md`、`UTILITY-FIX-P02-STOP-20260927.md`、`NATIVE-DISCOVERY-FEASIBILITY-DECISION.md`。
