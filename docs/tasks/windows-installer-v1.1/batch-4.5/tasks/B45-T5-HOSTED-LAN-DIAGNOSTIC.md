# B45-T5 — HOSTED_LAN 有界返工卡

你是执行任务，不是项目主控。ROLE=Execution；PARENT=Batch 4.5；TASK=B45-T5 原任务续行。唯一主控及准确回单目标：`01a0db0e-c950-79e0-8e11-07155e0742f2`。公开仓库 `KG718718/spxt-public`；只在原工作树 `E:\CodexWorkspace\CodexWorktrees\b4-qa\public-source`、原本地分支 `codex/b45-t5-integration` 工作。当前冻结 local HEAD `8e99b4d9895c05fe6454d3bb20b32378c7516685`；集成基线 `08afb306e5e30206b0696f755e12c6f4fbcfed2f`。先独立核对 Git 身份和工作树；不要覆盖未提交内容。阅读该工作树的 AGENTS.md、PROJECT.md、本 Batch SPEC/PLAN/ACCEPTANCE、`HOSTED-LAN-CONTINUATION-APPROVAL.md`、Full2 止损证据及本卡。

目标仅修复 `tools/tests/lan-host/hosted-gate.cjs` 的固定、安全诊断与最小隔离测试，及必要的专用测试和 CI 手动诊断入口。不得改生产 adapter discovery、server、Launcher、Firewall、身份/升级逻辑或业务代码；不得重开 TEMP/Firewall fixture。不得 push/dispatch Hosted、操作 main/tag/Release、创建新线程或工作树。可在任务专属测试根使用合成数据和隔离端口；不得接触开发机真实 NIC/Firewall/注册表或业务数据。

固定阶段至少区分 HOSTED_CONTEXT、OUTPUT_PRECHECK、PRODUCTION_DISCOVERY_REJECT、SYNTHETIC_DISCOVERY、RUNNER_ADDRESS_ENUMERATION、RUNNER_ADDRESS_CARDINALITY、SUBNET_DERIVATION、CONTROLLER_CREATE、LOOPBACK_BIND、LAN_BIND、PORT_SELECTION、LAN_HTTP_PROBE、CONTROLLER_HEALTH、CONTROLLER_CLOSE、REPORT_WRITE、INTERNAL。每阶段及 reason 必须单义。失败报告只能含 schema/status/stage/reason/sourceCommit 及固定 bool/count；禁止 IP、网卡/GUID、路径、route/subnet、原始异常/stack/stdout/stderr/secret，也不能用 hash/长度重编码。报告写入失败本身仍要固定安全终态；未知错误 INTERNAL。不要预断 `runnerOwnedPrivateAddress` 数量是根因；0/1/多候选须可区分。Hosted harness 若有证据证明多地址假设不稳，才允许在测试内确定性选 runner-owned、实际可 bind 候选，不改变生产筛选。

双 listener 必须是 `127.0.0.1:<port>` 与测试自有 private IPv4 同端口，绝不 `0.0.0.0`/单 listener；仅声称 HOSTED ISOLATED DUAL-BIND PASS。8080–8099 均真实 bind，部分启动失败须完全 close 后再尝试下一端口，固定阶段证明 cleanup；close 失败绝不得 PASS。新增窄入口 `setup-v3.yml` 的 LAN 分支手动 `lan-hosted-diagnostic` 模式（若必要），只执行此 gate 并上传严格白名单 JSON，read-only permissions；不得自动触发 Full。

H1 前必须完成 14 项本地/合成正反例并在 RESULT 逐项列证据：生产拒虚拟、合成物理通过、0候选、1候选、2+候选、坏 subnet、loopback bind失败清理、LAN bind失败清理、health失败清理、HTTP失败清理、close失败不得PASS、仅全成功最终PASS、未知→INTERNAL、隐私无地址路径网卡。测试用固定闭合 mock，不能把本机实际网络当企业 LAN。运行对应 Node/工作流静态测试，验证失败报告 schema/source 和 JSON 上传 allowlist。保留本地失败反例及通过记录，形成独立 local commit，不 amend 已公布冻结提交；只改授权文件。若确需生产/安全/产品行为变化，标记 BLOCKED / NEED PARENT DECISION 并停止依赖修改。

完成前把 RESULT 写入任务目录；以 `send_message_to_thread` 主动发准确主控 ID，核验返回目标。回单字段：【TASK ID】【状态 PASS/FAIL/BLOCKED】【完成内容】【修改文件】【测试结果】【local commit】【已知风险】【需要主控处理】。发送失败则按 AGENTS.md 标记 BLOCKED — RETURN DELIVERY FAILED，保留 worktree/commit，不能宣称已送达。主控 Review 后才允许 H1；H1/H2 和新增 Full 预算由主控唯一调度。
