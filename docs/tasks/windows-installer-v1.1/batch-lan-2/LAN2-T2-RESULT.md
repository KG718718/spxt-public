# LAN2-T2 — Launcher / Firewall / Portable 接线回单

- 状态：本地实现和验证已完成，待主动回单与 Master 独立 Review；本提交不代表 Batch LAN-2 验收。
- 基线：`43914744c0b74031fb2d20c849c7500408e0a85a`；任务分支：`codex/lan2-t2-launcher-firewall`。
- 范围：仅本任务获准的 Windows Launcher、Firewall、Portable 及 LAN 测试驱动文件。T1 Node、Setup、beta.4 upgrade、workflow、历史证据均未修改。

## 完成内容

- Launcher 对接 schema 2 的 `enabled/interfaceName/port`；候选由 Node CLI 返回，单候选也只展示，必须先明确选择及可信网络确认，再点击开启。仅开启动作可调用 Firewall UAC。拒绝时恢复 disabled 配置与 Local 子进程，显示 `FIREWALL BLOCKED`。
- 保存端口只尝试原端口；Launcher 核对双明确监听、实际 PID socket、Host 自测、所选接口和 Firewall 状态，并使失效的 LAN URL 不可复制。
- Firewall helper 校验 schema 2、选定接口、精确端口、受信安装身份及规则；保留 Private/精确 program/精确 subnet/Inbound TCP 约束。版本锚更新为 beta.4。Portable 和驱动跟随 beta.4。
- 独立审查发现 Launcher 固定测试名单包含不存在的 `TestUACRejectionDoesNotStopLocalChildOrRetry`，会漏测真正的 UAC 回滚测试；已改为两个实际存在的测试名：`TestFirewallInterfaceNameArgumentIsQuoted` 与 `TestEnableRejectionRestoresDisabledPreferenceAndLocalChild`。

## 验证

- 环境：Windows 10；Go 1.27.1 windows/amd64；Node v24.14.0；PowerShell 7.6.5。
- Launcher 固定 Go 名单 28/28，fail 0、skip 0；`go vet ./...`、`go build ./...` 通过。
- Firewall 固定 Go 名单 13/13，fail 0、skip 0；`go vet ./...`、`go build ./...` 通过。首次直接运行因 `FIXTURE_TEST_ROOT_INVALID` 被夹具拒绝；按仓库 `test-environment.ps1` 建立物理测试目录后通过，不把首次拒绝计为 PASS。
- Firewall build driver 合成反例 5/5 PASS，覆盖零测试、仅 package、非 JSON、已知 fixture 失败和编译失败；`git diff --check` 通过。
- 未运行 Hosted、真实 UAC 或真实 Firewall 写入；未将 Batch 4/4.5 历史测试或本次局部测试记为最终验收。

## 风险与主控待办

- T1 schema 2 Node 草稿尚未正式提交和整合；本任务 Go/CLI 跨模块端到端及 Portable/Setup 候选仍待 Master 整合后验证。
- 当前开发机真实 Firewall/UAC、第二设备访问和用户人工门禁未验证；Firewall 状态复核在启用时使用系统接口并 fail closed。
- 本任务测试产生的未跟踪 `.test-work/` 与两个 Go build EXE 位于本工作树；自动审批拒绝了删除命令，未将其纳入提交。Master 审查时应忽略这些生成物，并按工作树清理规则处理。
- Master 应独立核对文件范围、Go 固定名单、T1 CLI 契约及整合后的 beta.4 全链门禁。
