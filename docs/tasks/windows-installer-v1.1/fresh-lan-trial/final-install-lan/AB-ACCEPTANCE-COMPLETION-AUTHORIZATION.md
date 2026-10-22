# Final A/B Acceptance Completion — Local authorization

用户明确批准于 2026-10-22 在原 Master / 原 FRESH-T2 / bea7 工作树内，补齐现有 A/B 验收链；不新建研究 Batch、普通 sub-agent、后代 Thread 或额外后台 Codex 会话。

本地、origin、实际公开远端已核验为 `0a36894c2e5326525ace58eef12ccbb517c90f77`，原 T2 为 `54f4da7c40327fa05948acc6fcd6a34ef3cbe770`，均 tracked clean，未跟踪现场保留。受审实现 `461c75886bc16bcc1c493e1678f32e90f5643bca` 保留为来源，不从旧 SHA 覆盖当前治理提交。

## 本轮唯一范围

A 使用独立干净标准 Windows Hosted Job：可信来源/完整构建及 SHA 核验；第一个 Setup 调用为 FRESH_ACCEPT；真实安装与 Startup、Launcher/Node/Admin、双会话浏览器权限/保存/附件、重启/配置持久化、F01—F09 适用门禁及严格收尾。不依赖 B 的破坏性前置。

B 使用另一独立干净标准 Windows Hosted Job，保留五项拒绝和原安全条件。优先复用现有生产者归属及恢复检查，设计同一正式 Setup EXE 的真实、可复现中途失败。创建任何测试资源前记录可信前态；每项资源须有本次生产者归属；失败后逐项验证恢复。外部、未知、替换、并发变化或缺观察一律拒绝清理并 FAIL/UNKNOWN。不得专门编译放宽身份验证的 EXE，不得解除 Fresh 对 fault/sequence 构建的禁止。

复用 install-split.cjs 完成最小双 Job、不可变同 EXE/Source/Manifest 传递、各自安全报告和外层恢复。B 不得重建。两边任何必需 FAIL/UNKNOWN 都使 Candidate FAIL；两个 Job completed 后由 Master 核验固定证据并聚合，不新增第三个 Windows Job，不提前发布合格 Candidate。保留历史 schema2、旧 FC1/2/3 合同、失败、账本及源码记录。

原线程自主实现、反例、本地受控验证、最小修复及 Master 独立 Review，不逐次申请普通工程许可。不重新研究旧 FC3 首因，不扩大到升级/U27/LC01/内部 SPXT 或业务功能。

## 本地安全、预算与结束

日常 Win10 仅允许归属明确的私有合成对象和测试资源；不擅自执行产品 Setup、修改真实 Startup/产品登记/网络或业务数据。不得删除未知资源。真实中途失败无法在原安全契约内可靠触发时，说明技术原因及替代证据范围，不以更多框架或替身 PASS 掩盖缺口。

新增 Hosted **0**；旧 Candidate 耗尽、原 QA 0/1 冻结。不触发 FC4/Full/Smoke/诊断/QA，不创建运行预留或可被当前提交意外触发的入口。允许完成未触发的双 Job 工作流与来源合同接线；未来执行必须另有用户明确预算和绑定，不放宽旧来源合同。全部提交 [skip ci]；Execution 仅 local commit/RETURN，Master 独立 Review、整合及非 force 同步开发分支。不 main/tag/Release，不清理历史工作树。

最终仅六项：B 真实中途失败恢复是否可验证；双 Job 接线是否完整；同一 EXE 是否证明；安全/恢复门禁是否保持；最新完整 EXE Source/SHA；是否具备真实 Candidate 全部准入。完成本地闭环后统一返回网页版，未实际执行的安装/物理 LAN/Hosted/QA 均不得宣称 PASS。
