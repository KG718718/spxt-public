# FC3 Recovery & Install Closure — Local authorization

用户于 2026-10-20 明确批准本地自主工程闭环，唯一 Master 为 `01a0db0e-c950-79e0-8e11-07155e0742f2`。继续原 FRESH-T2 长期 Thread / bea7 工作树；禁止普通 sub-agent、后代 Thread 或额外后台 Codex 会话。

核验基线：开发分支 `codex/lan-fresh-trial-v1.1`，本地、origin 与 GitHub 为 `acaf56293eca82c2575f9e6b1e8094b2f73ce089`；原 T2 为 `b6e443d38038b07ac5c98e0a4ca5d637792b9a47`，tracked clean，未跟踪现场保留。

## 本次范围

定位 OLD_BINDING 的真实登记变化、文本差异、32/64 位视图差异、精确 owned fixture 删除失败和删除后观察/GlobalRegistry 差异。现有 FC3 仅能确定 OLD_BINDING 预期拒绝之后、FRESH_ACCEPT 之前失败，具体首因仍 UNKNOWN。不得把预期安装拒绝当作实际首因。

允许结构化登记观察、固定差异分类、严格 owned 恢复与对应反例；本机仅可使用预态缺失、归属明确的独立合成对象，不创建/删除真实产品登记，不碰真实 Startup、业务、防火墙或网络。未知登记、额外值、外部修改必须拒绝，不忽略 BINDING_CHANGED，不跳过所有权检查。

实施并本地验证两个独立干净环境的必要验收接线：A 正常 Fresh 安装优先（构建身份、安装、Startup/Launcher/Admin、浏览器、数据和配置持久化、收尾）；B 保留全部 NONEMPTY_TARGET / EXISTING_INSTANCE / DESKTOP_SHORTCUT / STARTUP_SHORTCUT / OLD_BINDING 及失败恢复。环境不得共享可能污染的登记或文件。所有既有必需安全门禁仍需全部通过，A 不得掩盖 B 的失败；仅不同目录不证明系统登记隔离。

优先复用现有测试与封装，不开发新框架或微型 Batch。发现已证明的产品缺陷可在原安全契约内最小修复并独立 Review。保持完整 EXE 构建能力，执行本地反例、真实受控 Windows 验证和 Master 独立 Review；未执行的真实安装/LAN/浏览器业务继续 NOT VERIFIED。

## 预算与停点

本轮 Hosted **0**；Candidate 耗尽，原 QA 0/1 冻结。不创建 FC4、不重跑 FC3、不挪 QA、不触发任何 Actions。FC1/FC2/FC3 的历史 FAIL/UNKNOWN 永久保留，历史 trigger/来源/报告不得重写。不改 main/tag/Release、不访问内部 SPXT、不清未知资源。

仅 Master Review、集成和非 force 同步开发分支；Execution 仅 local commit/RETURN，不 push。每次普通工程返工自主闭环；无法证明所有权或安全恢复时保留证据停止，不扩大删除范围。

## 最终回单

仅报告：OLD_BINDING 确切原因及证据边界；测试误判或真实变化；Binding/GlobalRegistry 恢复是否已证；A/B 正常安装优先接线是否准备完成；完整 EXE 构建结果；下一次真实 Candidate 的最小准入及预算需求。当前授权不包含该后续预算。
