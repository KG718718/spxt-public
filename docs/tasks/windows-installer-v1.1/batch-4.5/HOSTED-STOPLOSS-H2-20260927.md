# Batch 4.5 — HOSTED_LAN H2 止损与网页版决策卡

## 当前结论

**BLOCKED — HOSTED_LAN DIAGNOSTIC BUDGET EXHAUSTED**。网页版批准的 H1/H2 专项2/2均已使用；H2 FAIL，必须停止。新增 Full0/1、原QA Hosted0/2均未使用，不能挪作诊断。尚无beta.3最终Setup Artifact；未到 AUTOMATION PASS / QA PASS / LAN HUMAN PENDING。

## 已确认事实

- H1 Run36301442048 / source f026131e9d397e6910ad41f84fa238af49d409a4 / Artifact10925263790，固定 `PRODUCTION_DISCOVERY_REJECT / PRODUCTION_DISCOVERY_INVALID`。旧码混合发现抛错与返回结构无效，不能确定根因。
- 原T5在原thread `01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9`、原b4-qa工作树只修改测试harness，细分四个既有固定生产错误码、无效shape和未知异常；Master Review并复验LAN62/62、兼容事务45/45 fail0skip0。生产发现/Server/Firewall/升级/业务代码无变化。
- H2 Run36301876304 / source 80ee1a88275a0ef631cef17d68ace8a69ceaacfa / job108570884334 / Artifact10925513024（461字节，ZIP SHA256 `1aca7cd4d285e1eb8ed2e63193ff1a4f9b2e81b72c6773d92b0bb13597fbd0b4`）固定 `PRODUCTION_DISCOVERY_REJECT / DISCOVERY_COMMAND_FAILED`。这对应生产 `NETWORK_DISCOVERY_FAILED`，仍不是底层唯一根因。Master仅内存解包，严格单JSON、schema、受测SHA、字段白名单和privacy均PASS。
- H2在 runner private地址枚举、subnet、loopback/LAN双绑定、健康/HTTP probe之前停止；没有证明这些门禁通过，也没有证明真实企业LAN可达。Full2以前的Portable、LAN37/37、兼容45/45及候选/故障构建证据仅是历史到达阶段，真实Setup/U22/U23/Registry/Firewall/26套742项/最终QA尚未完成。
- 生产 `runWindowsDiscovery` 可因固定系统PowerShell运行时确认失败、子进程启动/超时/非零/信号、非空stderr或JSON解析失败而给出不同固定错误码；H2只锁定 `NETWORK_DISCOVERY_FAILED`，没有安全证据区分其中的子原因。不能据此放宽生产网卡筛选或把Hosted虚拟网卡判成物理LAN。不得读取或传播原始stdout/stderr、路径或网卡信息来绕过隐私约束。
- 旧额外8.3 alias回归仍110PASS/1SKIP，未取得真实别名证据；核心26套742项仍未在本Batch最终候选运行。此项独立于HOSTED_LAN止损，不能记PASS或自行豁免。

## 止损现场

历史专项4/4、D5 1/2、旧Full2/2；本次H2/2、**新增Full0/1、QA0/2**。唯一Master `01a0db0e-c950-79e0-8e11-07155e0742f2`；旧Master永久只读。Primary public-source，集成 `codex/lan-host-v1.1`。原T5已收到STOP，工作树冻结 local HEAD `b8e3440358af1ca5f2d46455d052d77c211a4a46`；T1—T4/QA维持冻结，不清理工作树、未跟踪测试根或历史Artifact。无main/tag/Release/force push。

## 网页版需决定

**A（建议重新设定独立上限；当前未授权）**：是否给予新的、仅限HOSTED_LAN `NETWORK_DISCOVERY_FAILED` 的有界诊断额度。先在原T5本地为生产命令入口添加安全固定子分类反例；仅输出闭合布尔/枚举，区分子进程未启动/超时/非零或信号/非空stderr/解析失败，不记录原文、路径、IP、网卡或其hash/长度；Master Review后才考虑新增Hosted。若证明只是Hosted环境问题，需另行决定如何保持生产虚拟网卡拒绝证据；不得默认绕过。新增额度、是否允许后续Full及QA仍由网页版明确设定。

**B**：维持冻结，等待受控Windows环境或其他非敏感证据。现有Full/QA额度保持未用，当前不能推进最终候选。

任何方案都不自动允许生产发现/Firewall/身份安全放宽、同版本/未知升级、业务schema/权限改变、进入Batch5/OCR/main/tag/Release。原H1/H2证据见 `evidence/h1-run-36301442048.json`、`evidence/h2-run-36301876304.json`、`ORCHESTRATION.md`、`RESULT.md` 与T5原结果。
