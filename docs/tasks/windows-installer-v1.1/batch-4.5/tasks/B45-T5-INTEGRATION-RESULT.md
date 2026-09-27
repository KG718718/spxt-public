# B45-T5-INTEGRATION 阶段结果

## 身份与状态

- TASK ID：B45-T5-INTEGRATION
- ROLE：Execution Thread，不是项目主控
- PARENT BATCH：Windows Installer v1.1 Batch 4.5
- 状态：RUNNING — 阶段实现已冻结；等待 T3 统一接线 HEAD 后做最终整合复测
- 基线：`08973837e5a34a2ed1d9d97748966f93fc97ea1a`
- local branch：`codex/b45-t5-integration`
- 阶段提交：`fe7cb3c7167acdb82743104352d1d54ab3725997`
- R1 修复提交：`f053b907e08be75c75aed734a78fb4c39671d3b6`

## 已完成

- 新建隔离的 beta.2→beta.3 精确兼容路由、固定 F3 身份、事务、Setup、LAN Portable 和 CI；未修改旧 beta.1→beta.2 实现。
- 事务严格校验真实 beta.2 `install-state.json`，允许唯一两种合法来源（fresh、beta.1 upgrade），拒绝重复键、尾随 JSON、未知字段和任一固定身份漂移。
- U22 在旧 program swap 前拒绝错误 manifest hash；U23 在事务开始后验证精确回滚；故障保持 program、installer metadata、registration、binding、shortcuts 和业务 instance。
- 专项 Hosted 设计只构建 candidate、fault-payload-hash、fault-post-copy，要求 U22、U23 和一次成功 F3 beta.2→beta.3；完整故障矩阵留给 Full。未由本线程调度 Hosted。
- Hosted LAN 证据覆盖 runner 私网双 bind、生产发现拒绝虚拟网卡、两个不同身份、权限边界、单会话注销隔离、同一 Host 附件落盘，以及实际 NetSecurity 规则 API 与清理。
- R1：LAN 测试子进程只读使用已构建 Runtime 的 `app/node_modules`，并恢复原 `NODE_PATH`；兼容报告改为 TAP 已通过子测试名的固定 C01—C15 映射；workflow 在 checkout 前初始化安全 stage，并覆盖 ENV/SOURCE/DOWNLOAD/VERIFY 的早失败报告。

## 本地测试与检查

- beta3 compatibility-report wrapper：33 tests，33 pass，fail 0，skip 0；C01—C15 全部由固定已通过子测试映射得出 PASS。
- LAN config/network/server/runtime：28 tests，28 pass，fail 0，skip 0。此轮本地仅为验证旧工作树依赖缺口，使用 Primary `node_modules` 只读 `NODE_PATH`；正式 CI 已改用构建产物 Runtime 依赖，不依赖 Primary。
- 冻结 beta.1→beta.2 回归：111 tests，109 pass，fail 0，skip 2；skip 原因为本机不可用 8.3 alias 与 Windows 文件 symlink 权限，不代表 Hosted 允许 skip。
- PowerShell AST、Node syntax、YAML 解析、`git diff --check`：PASS。
- 派生 Go harness：已静态生成并核对 beta.2→beta.3、LAN config、U22/U23 与 package-lan 接线；当前机器无 Go，尚未编译，须在 T3 统一 HEAD 后由固定 Go 工具链验证。

## 未完成与风险

- T3 Launcher/build 最终接口尚未并入本工作树；当前代码引用已约定但尚未在本基线存在的 `tools/lan-host/launcher-cli.cjs` 与 `-FirewallHelperSha256`。不能据此宣称 Runtime/Launcher/Portable/Setup 完整构建 PASS。
- 实际 F3 安装升级、断网生命周期、实际防火墙、完整 742/26、Artifact privacy 和独立 QA 均未运行；只能由主控按剩余专项/Full/QA 预算调度。
- 实际物理 LAN、双设备、Windows 10 UAC/防火墙提示仍属 HUMAN PENDING。
- `.test-work/` 是进入任务前已有未跟踪目录，未读取、未修改、未提交。

## 主控下一步

1. 提供已 Review 的 T3 统一接线 HEAD；本任务据此同步并复核接口、生成 Go harness 编译、LAN 与 beta3 本地回归。
2. Review 上述两个 local commit 的范围和安全边界；存在工程问题时退回本线程修复。
3. 只有代码 Review 通过后，主控才可按预算依次调度专项、Full 和独立 QA；本结果不授权 push、Hosted、main、tag 或 Release。
