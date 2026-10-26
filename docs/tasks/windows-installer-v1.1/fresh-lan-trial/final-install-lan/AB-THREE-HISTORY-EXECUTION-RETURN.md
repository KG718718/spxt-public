# Three Historical Runs & Final Source Build — Execution RETURN

本轮本地准备完成：三条真实历史逐 Run 精确接线、最终源码正式准入回归 **72/72 PASS**、完整同源 EXE 构建及逐字节核验、同一新 EXE 四阶段离线回放均 PASS。Master 已报告独立离线 33 项、完整字节与同 EXE 传递 Review PASS。**仅有本地源码/BUILD 资格，不构成真实安装、Hosted Candidate 或交付准入。**

## 固定来源与产物

- 唯一完整构建 source：`d1c6756327a25974604d904ddb317b8f86a64b61`；tree：`831ea155b30fc53baad0f1f8edd70a8afa1acc74`。
- code fingerprint：`dc291751f61bd09efbbe9fd8c3c93417324b02dad1e408103d963ba8f5d9d69e`。
- EXE：33,557,974 字节；SHA256：`3030b06a1403bd088810625db4040d93b5ca6cde628d34d5a3fcc59e84f9fd38`。
- 原始 P0 报告 SHA256：`9003eae2014e5173af49f1f954c151d7a83b2d32fe2abf563c4c571be67b2ea9`。
- Manifest SHA256：`04f37c2ffcbb3131aab7ece8a6aaaf8f86a8a465d4bcdbf11605bee7801a76c9`。
- 1049 个实际 payload 文件、147,923,786 字节、20 项依赖；Manifest/Sidecar/生成脚本/实际文件清单逐字节核验通过。新产物没有复用旧 d822/3d 构建身份。

## 精确历史与测试

前两 Run `39732016119` / `39732017789` 分别固定 check suite `107677983813` / `107677988314`、number 1/2，source `d8222780953bed685ccd0f4f5a3e82571b9e5bf2`、control `482144f20c2720a351e65f5e7c23ddc3b12d610b`。第三 Run `39747285185` 独立固定 source `3d256a019f99126ac25298955a7ef9bb229eeb07`、control `7c9aa11cdc9205186b5321a31c487a0cb17f7401`、check suite `107719476281`、number 3。每条都绑定 workflow/path/repo/headRepo/branch/event/attempt 及 completed/cancelled 终态；历史例外只允许精确记录，不授予重新执行许可。

新增反例使用独立固定真实锚，并从真实 control 的历史 trigger 及标题核对 source：前两是 `ab-acceptance-trigger.json`，第三是 `ab-exact-run-trigger.json`。明确合成的新 Run 为 900、number 4、control 为 40 个 f。身份/source/control/attempt 替换、历史替换/缺失/重复、额外未知 Run、缺页、缺审批均拒绝；合法状态推进和跨页乱序保留 918 修复。外部 Master 等待准备、A 执行、B 执行、最终 completed 聚合均通过实际现有模块离线回放。

正式结果为 AB 全套及 split 共 72/72、fail0/skip0/sourceBound=true；7 个 CJS 语法、diff-check 通过。期间旧测试曾因工作区 CRLF 与 Git LF 直接比较而产生 49 PASS/1 FAIL，原因和后续修正保留在固定证据中。现在同时核验历史 Git blob、实际磁盘规范化基线，以及 bootstrap 未 mock 的真实读取前后字节一致；没有仅凭 HEAD 掩盖磁盘改写。生产、workflow、实际 trigger/授权/Review、旧结果及账本均未改。

## 真实构建与离线证明边界

固定 Node24.21.0、Go1.27.1、Inno6.7.3，沿用现有 owned Job 流程真实完成 Runtime/payload、Helper、Launcher、ISCC。Go 归档与 15,639 个工具链文件、Inno 归档与 119 个文件、Node EXE 前后摘要一致；父环境和内部 worker 环境恢复通过。构建、准入回归及实际新 EXE 离线回放的受控进程均自然退出、stderr 空、pipes/handles 关闭、Job empty，无强制终止。

另一次完整离线回放实际消费本 source 的新 P0 报告摘要和新 EXE/Manifest/Sidecar/许可等六个真实构建文件，经 pack/receive 后逐字节一致，再经过四阶段实际模块及 7 个拒绝反例。审批、Runner、初始报告与安装观察明确为合成输入，未写真实授权/trigger/账本，未伪装实际 GitHub 执行，也未运行 Setup 或产品。离线聚合接受只证明接线，不把合成安装报告当实装证据。私有脚本换行疑点已以实际字节核验排除：双转义 newline 字面量 0 处，生成 JSON 可解析且末字节 10，无对应失败或重复回放。

Master 的实际字节 Review 和同 EXE 传递及 5 个拒绝反例已独立 PASS；其正式结果由独立 `AB-NEXT-PREFLIGHT-MASTER-REVIEW` 文档维护，本回单不代写。

## 后续必要绑定与停止

本轮未观察到剩余确定代码阻塞，但现有真实 trigger 仍指向旧 3d 构建，不能授权新 source。必须先有新用户预算，再固定新 source 的真实构建证明、Master Review、授权与 control；看到实际唯一新 Run 后才能绑定 Run/attempt、实时保护环境、原生外部 Master 审批及实际 Job。已有真实 Environment 的只读配置记录不能代替新 Runner 的权限、隔离、所有权及恢复证明。

Hosted 0、真实审批 0、Environment 写入 0、新实际 trigger 0、无 push。历史三条的 FAIL/UNKNOWN、预算耗用与重复根因 UNKNOWN 保留；QA 继续 UNUSED—FROZEN。实际 A/B Setup、安装后 26 suites / 742 checks、QA 与物理 LAN 本轮均 NOT_VERIFIED，无合格用户包。新 EXE 仍为 BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE。

实际输出根路径及私人脚本只通过本机回单交原 Master，公开证据不含用户绝对路径或原始 API/收集器日志。本 RETURN 仅新增两份独立文档；原线程、原工作树、未跟踪证据保留。Execution 发出正式 RETURN 后冻结，由原 Master 统一治理与非 force 同步。
