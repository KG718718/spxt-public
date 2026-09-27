# B45-T5-INTEGRATION 结果

## 身份与结论

- TASK ID：B45-T5-INTEGRATION
- ROLE：Execution Thread，不是项目主控
- PARENT BATCH：Windows Installer v1.1 Batch 4.5
- 结论：PASS（仅限统一集成本地实现、静态门禁与合成验证）；Hosted、真实 Setup/注册表/Firewall、Artifact、独立 QA 和 LAN 人工验收仍 PENDING
- 基线：`08973837e5a34a2ed1d9d97748966f93fc97ea1a`
- local branch：`codex/b45-t5-integration`
- 最终代码 HEAD：`ae92ed6b660dea514f35725e7ecd0a64d8a2ff92`
- 未 push；未操作 main、tag、Release；未由本线程调度 Hosted

## 已完成

- 集成经主控 Review 的 T1/T2/T3/T4 接口，建立隔离 beta.2→beta.3 路由、固定 F3 身份、LAN Runtime/Launcher/Firewall helper/Portable/Setup/CI；旧 beta.1→beta.2 实现保持冻结。
- U22 在旧 program swap 前拒绝错误 manifest hash；U23 文件回滚后才恢复完整 32/64 位 registration/binding 快照。快照在任何删除/导入前检查存在、普通非 reparse 文件及 SHA-256。
- COMMITTED 与 ROLLED_BACK 均使用 installRoot 外置严格 marker；recovery 改名、递归删除或内部 journal 部分丢失后，可区分“已提交仅待清理”和“文件已回滚、注册表/清理待完成”，避免恢复混合状态。
- 固定 Go 测试策略闭合 Launcher 27 项及 Firewall 13 项；JSON reporter 对缺失、额外、fail、skip、package 未通过均拒绝。build 和 Artifact verifier 核对完整名字数组，不以单一数字代替测试身份。
- `integration.json` 固定核对 23 个 Launcher EXE 检查 ID、顺序、PASS 和非零计数，并把闭合摘要写入 portable report；实际 EXE 运行仍由 Hosted 产生。
- 已注册的 `setup-v3.yml` 仅新增 `lan-diagnostic`、`lan-full`、`lan-qa` 手动入口，并在 `codex/lan-host-v1.1` 上调用本地 reusable workflow；映射为 diagnostic/full/qa，权限仅 contents/actions read。旧 job 条件未修改，无 push 触发用于注册。
- T3 最终增量绑定复制 URL 到 fresh discovery 状态、隐藏 stale endpoint，并对 owner 校验通过但暂时 busy 的 stop 做总计 15 秒有界重试；open 拒绝不重试，不扩大 kill/取消范围。

## 精确提交

- 初始与 R1/R2：`fe7cb3c7167acdb82743104352d1d54ab3725997`、`f053b907e08be75c75aed734a78fb4c39671d3b6`、`e894881b283f283501071ebf8f01fd4eed36ad11`
- 事务/注册表闭合：`b2471bbabeac6b3983768bfdb7a7439dce5f6ec8`
- 精确 Go 报告：`dbd758af8a025d4bf4c932facf04a1febcd703d9`
- 已注册 workflow 入口及 integration 摘要：`7cbe124abd921628b2bab33119b1048e5b032c1f`
- T3 fresh URL 增量：`fa924be2d425865543c6b8d78aa540c16d963ddc`、`51d4f7f420628b2fe69f535baff828e140519a9e`；stop 增量：`6c9987203a7689bec79b04a9fd47fc9a6b3e1dae`
- 最终 expected list 同步：`ae92ed6b660dea514f35725e7ecd0a64d8a2ff92`

## 本地证据

- 最终 HEAD、固定 Go 1.27.1 Windows amd64、四文件派生 overlay：Launcher 精确 27/27 PASS，fail 0，skip 0；Launcher `go vet ./...` PASS。
- Firewall 精确 13/13 PASS，fail 0，skip 0；Firewall `go vet ./...` PASS。该实跑早于最终 T3-only 增量，Firewall 源码与策略身份未改变。
- 最终 HEAD beta3 compatibility：19/19 PASS；transaction 最近实际 25/25 PASS。主控在整合 `eaebaf6` 上实际运行合并 wrapper 44/44 PASS、fail 0、skip 0；随后只接入 T3 stop 与 expected-list 同步，未修改事务代码。
- LAN Node 套件首次直接运行因工作树没有 `multer` 出现 2 项环境失败；按正式依赖前提只读使用 Primary `node_modules` 复跑为 37/37 PASS。此结果不代替构建后 Runtime 依赖闭环。
- 冻结旧 Windows Installer 测试以 dot reporter 实际退出 0；未从 dot 输出推造总数。较早 R1 留存证据为 111 tests、109 pass、fail 0、skip 2（本机无可用 8.3 alias、symlink 权限），不冒充本轮重新取得同一计数。
- PowerShell AST、Node syntax、PyYAML 两份 workflow、`git diff --check`：PASS。

## 未完成与风险

- 未运行实际 ISCC、构建后 Runtime、Launcher EXE 23 项 integration、Portable、beta.3 Setup、真实 F3 升级/回滚、真实注册表 restore、Firewall/UAC、完整 742/26、Artifact privacy 或独立 QA。
- 注册表故障目前有静态顺序反例与 Node 事务反例；真实 `reg.exe export/import /reg:32|64` 和 Setup Pascal 路径仍须 Full/QA 证明。
- 实际物理 LAN、第二设备、Windows 10 Firewall/UAC、L23/L25/L27 仍属 HUMAN PENDING；不能声称 LAN READY 或可公网部署。
- `.test-work/` 是进入任务前已有未跟踪目录，未读取、未修改、未提交。

## 主控下一步

1. Review 最终增量与本 RESULT，核对精确提交身份后整合到 `codex/lan-host-v1.1`。
2. 仅主控可按预算通过已注册 `setup-v3.yml` 入口调度 diagnostic、Full 和独立 QA；失败后不得无修改 retry。
3. 自动工程通过后停在 LAN HUMAN PENDING；不得自动进入 main、tag、Release、Batch 5 或 OCR。
