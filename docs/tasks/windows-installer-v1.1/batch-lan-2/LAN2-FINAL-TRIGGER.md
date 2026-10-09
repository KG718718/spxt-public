# LAN-2 单次验收触发记录

此文件当前仅为未启用说明。唯一 Master 在对应预算门禁全部闭合后，才可更新并推送。只有对唯一开发分支 `codex/lan2-manual-host-v1.1` 的本文件变更，且推送提交信息恰好含一个 `[lan2-candidate]` 或 `[lan2-final-qa]` 标记，第一次运行才会进入新包装 workflow。两个标记不能同时出现。

Master 须在每次推送前登记受测源码 SHA、预算与独立 Review 结论；推送后登记 Run、Artifact、结论。标记过滤不能独立证明“只运行一次”，次数由 Master 的预算台账和触发前核对约束。此文件的创建不授权触发；Launcher 专项未通过时 Candidate 仍冻结，Candidate 未完整通过时 Final QA 仍冻结。历史 Full #4 FAIL 不变。
