# 2026-10-26 唯一 A/B Candidate 结果

**STOP — A FAILED / B SKIPPED；没有合格用户安装包。**

- Run [40286717015](https://github.com/KG718718/spxt-public/actions/runs/40286717015)，attempt 1。A Job `121451986698` failure；B Job `121454427441` skipped。同 control 只观察到一条 Run，原生精确审批 1 次且审批历史核验通过。
- 受测 Source `d1c6756327a25974604d904ddb317b8f86a64b61`；授权/治理 `2b5184a57c82e3ecf546a089e52fd12a20f193cc`；trigger-only control `931dd0cf30245f319d5b2a9f0aee0c25d9432a5f`。原3条取消历史与预算保持。仅必要授权/治理变化，产品、验收代码和 workflow 未修改。
- SOURCE 通过，BUILD COMPLETE/PASS。Hosted 报告中的 EXE SHA256 `fbc9344f0eb7ddf3c93a84131a815942290fd0a2b366ba7e7c177e4ebdb86394`；与本地参考 SHA 分开记录。失败 Artifact 只有安全 JSON，没有 EXE，故未独立核验 Hosted EXE 字节，不提供用户安装包。
- 报告首个固定失败为 `F01 / INSTALL_ADMISSION_NOT_OBSERVED`；`installAdmission=null`、Setup diagnostics 为空，未得到实际 FRESH_ACCEPT 调用或安装通过证明。后续 F02—F09、安装后浏览器业务及26/742未到达。B五拒绝及原生失败恢复未执行，不能聚合为 Candidate PASS。
- 恢复必须分层保留：外层10项状态为 ABSENT_UNCHANGED / SNAPSHOT_UNCHANGED / OWNED_REMOVED，cleanup10项true；内层 productRegistration/binding 为 OBSERVATION_FAILED，uninstallParent 为 OWNERSHIP_UNKNOWN。Supervisor CHILD_EXIT_FAILED；scope.jobEmpty=true、handles/pipes关闭、forcedTermination=false，但 naturalExit=false/status FAIL，outer.jobEmpty=false。这些不能合并宣称完整恢复PASS，也不能直接推断存在真实产品残留。
- 现有源码在最终读取不到 admission 时会把 failure 分类设为 INSTALL_ADMISSION_NOT_OBSERVED，可能遮住更早的 core 失败细项；A 的卸载父登记项前态检查在安装准入之前。本次内层精确底层失败未记录，仍 UNKNOWN，不据本地推测回填。下一步最小阻塞是安装前父登记项/结构化观察与首错保留，不是重新研究构建或审批平台。本轮不实施修复。
- Artifact `12635021130`，ZIP SHA256 `0e7c7b41d60d335d54335a8c6dd6ad8221498ffc708d551b601a3bf9239e04f4`；来源、大小、单 JSON 白名单、Schema、内部固定字段独立核验PASS。原报告保存为 AB-20261026-A-SAFE-REPORT.json。
- 新 Candidate 1/1 已消耗，原独立QA 0/1 UNUSED—FROZEN；不retry、不补Run、不借QA。另已静态确认旧 FQ1 入口不能直接接受 A/B aggregate，未伪称QAready；本次A/B失败因此未接线或调度QA。

原FRESH-T2/工作树冻结并保留，历史FAIL/UNKNOWN不改。只完成治理非force同步后STOP，不main/tag/Release/内部SPXT/未知清理/普通sub-agent。
