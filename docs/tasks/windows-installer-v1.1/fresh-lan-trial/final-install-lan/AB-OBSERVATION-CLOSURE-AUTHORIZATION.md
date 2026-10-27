# 安装前观察与首错保留收口 — 2026-10-27

用户批准本地自主工程；Hosted 0，原 QA 0/1 冻结。沿用 FRESH-T2，不新增 Batch、Thread 或普通 sub-agent。历史 Run40286717015 的 FAIL、UNKNOWN、Candidate 1/1 消耗与全部历史证据保持。

- Master：`01a0db0e-c950-79e0-8e11-07155e0742f2`。
- Execution：`01a13948-7433-7571-8330-a09bfd12a0dc`，原 `bea7/public-source`，本地分支 `codex/fresh-t2-installer-ci`。
- 已核验公开基线：`a824e100d9c07a8e7f88a3a9e06734ebb046971e`，origin 与本地相同；原未跟踪现场保留。
- 主控负责独立 Review、整合和开发分支非 force 同步；Execution local commit 后主动向准确 Master 返回，不 push、不创建后代。

## 范围

1. 在原 installed-hosted、ab-parents、installed-recovery Go 模板及 install-split.cjs 内，立即记录父登记准备及原始观察的固定首错。后续 admission 未到达/拒绝、报告读取及 cleanup 结果分别保留，不覆盖先发生的错误；缺失或矛盾仍 FAIL，审批不得跳过。保持旧 Schema 兼容，优先复用字段及现有验证器，不重建报告框架。
2. 对 freshObserveRegistration / freshCaptureRegistration / freshParseRegistration / freshPrepareAbParent 使用实际解释器、参数和窄环境验证。区分启动、超时、非零退出、stderr、序列化、JSON/类型、拒绝读取及真实差异。内外观察同一私有对象逐层对照。原始内容只在内存，输出固定枚举/布尔；不扩大环境、不忽略 stderr、不增加超时、不放宽解析。
3. 固定 Node24.21.0 对原模块端到端复验：父观察失败→admission未到达；真实 admission 拒绝；Setup 返回失败；各自再叠加 cleanup 失败；缺失/矛盾拒绝。函数提取仅定位，不能替代原模块证明。无真实 Setup 的合成输入不得宣称安装通过。
4. 本地补齐旧 FQ1 与 A/B aggregate 的必要同 EXE / Source / Artifact / 报告接线，保留独立 QA 和旧合同严格性。不得触发 QA、创建真实授权或增加预算。
5. 实现稳定后仅作必要的一次完整同源构建、字节身份及 Master Review；普通本地失败继续返工，不逐次请求许可。真实安装/LAN未执行则明确 NOT VERIFIED。

## 边界及返回

仅已授权只读观察和私有受控夹具；不在日常机执行 Setup，不创建/删除真实产品登记，不访问内部 SPXT，不清理未知文件/登记，不改变生产安全、业务、权限、LAN/Firewall契约。无 Actions、retry、真实 trigger、main/tag/Release。原环境/句柄/进程及受控资源恢复须有证据。

回单只需：已复现观察失败与最小修复、仍未知的历史事实、原模块首错贯通、QA接线就绪状态、最终受审 Source/构建身份。若须改变上述边界或无法证明恢复，则保留证据返回。
