# Batch 4.5 — Git Recovery + Single M03 Serialization Control

## 已批准顺序与范围｜2026-09-27

网页版批准先恢复公共主控仓库的 Git 元数据写入与 GitHub 认证，Review 并整合原 T5 的 `a9abd822`、`69cd3d18`、`2a362770` 及公共根未提交治理文件，只推送 `codex/lan-host-v1.1`。**只有本地整合与远端同步完成后**，才允许原 T5 在原线程、原工作树执行唯一一次真实 Win10 M03 对照。不得新增线程、工作树、Hosted H3/H4、Final Full、Final QA，不使用 Astra，不修改生产 stderr fail-closed 或网络安全策略。

M03 必须在同一个系统 PowerShell 进程中先显式加载 `Microsoft.PowerShell.Utility`，确认加载阶段无 stderr，再执行与 M02 等价的 `ConvertTo-Json` 并仅分类序列化阶段 stderr。先完成 M03-T01—T08 合成反例、syntax、diff-check、fail0/skip0，Master Review 后才可执行真实一次。只允许 `EXPLICIT_IMPORT_SERIALIZATION_PASS`、`EXPLICIT_IMPORT_SERIALIZATION_FAIL`、`UNRESOLVED` 三种终态；证据仅保存固定白名单布尔/枚举，不保存任何原始输出、异常、路径、环境、网络身份或其 hash/长度。结束后冻结 T5，Master Review、记录、整合/推送并返回网页版，不直接改生产。

当前产品状态仍是 `BLOCKED — UTILITY SERIALIZATION PATH STDERR; ROOT CAUSE NOT UNIQUE`；M00 PASS、M01 PASS、M02 FAIL 由**独立** PowerShell 进程得到，不能唯一归因。P02 FAIL，P03—P08 NOT_REACHED；H1/H2 2/2、Final Full 0/1、Final QA 0/1 未变。任何后续生产最小修复及 P01—P08 proof 需网页版另行决定，之后才可能恢复 Final Full/QA。

## Git 恢复现场｜2026-09-27

- 公共根本地 `codex/lan-host-v1.1` HEAD 与远端 ref 均为 `73952c1f9b9ac85e7eb3051cec157a187e1ad77e`，origin 为 `KG718718/spxt-public`；无 detached HEAD、活动 Git 进程或 `index.lock`。
- 原执行身份 `CodexSandboxOnline` 时，本会话权限策略将公共根 `.git` 限为只读，不是 stale lock。用户调整本会话权限后已恢复 Windows 本机身份 `PC`；本地 Git 元数据写入可按获批范围继续。不得删除 `.git/index`、修改 ACL 或重建 clone。
- 原本机 `gh` 默认 token 失效、直接 API 写入 401。权限环境切换后 `gh auth status` 已显示账号登录，已认证 `gh api` 确认远端开发 ref 仍为 `73952c1`。普通 Git HTTPS `ls-remote/fetch` 因空响应或连接失败未完成；这是传输故障，不可误记为 fetch PASS。远端写入只可通过已认证 API 对已核验 ref 做非 force fast-forward，且须保持本地/远端 HEAD 一致。
- 原 T5 工作树在 `codex/b45-t5-integration` 的三笔 local commit 保留；该分支历史与公共根不同，整合时只能针对这三笔提交，不能将整个 T5 分支合并或把历史文件删除带入公共分支。
- Master 已复核三笔提交的文件列表、diff-check、固定 live 六字段与生产 `public-lan-network.js` blob `4e13e944472f845675fe73d176f063c4fe97f6ed` 不变。公共根未提交治理文件及原有 `.test-work/`、`node_modules/` 均保留。尚未 commit/push，M03 未开始。

下一动作是完成精确整合，使用可用的已认证传输方式做非 force 远端 fast-forward，并核验本地/远端 HEAD。若远端意外变化，停止且不 force push。Git 同步前不得做 M03。
