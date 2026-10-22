# Final A/B Candidate — SOURCE 拒绝并停止

结论：**STOP — CURRENT_API_REJECTED / DUPLICATE_RUNS / RECOVERY_NOT_OBSERVED**。无合格 Candidate，无可交付安装包，QA0/1继续冻结。

## 已确认

- 本地最后准入通过：固定 Source `d8222780953bed685ccd0f4f5a3e82571b9e5bf2`，完整本地 EXE SHA256 `c781aa2712ef749d4a4572581db52ddb4fba9825b7dc63365cbd8abd34bc7ede`，代码指纹、Review、九项拒绝反例和实际 producer 接线均核验。实际 Runner 前检从未提前声称 PASS。
- 用户授权已登记于 `d55589e4ea2aef78b26f6fc91a666970024522f1`；唯一 trigger-only 控制提交 `482144f20c2720a351e65f5e7c23ddc3b12d610b`。本任务只调用一次触发 push，没有 workflow dispatch 或 rerun。
- GitHub 同时出现两个 event=push、attempt1、相同 workflow/control 的 Run：`39732016119` 与 `39732017789`。发现时为 queued/pending，立即请求取消；两者最终均 completed/cancelled。公开事件列表目前只见一个相符 PushEvent，其完整性未知，不能由此证明 GitHub 内部重复原因。
- Run39732016119 的 A 已完成隔离入口与 checkout；SOURCE 失败、安全报告分类 `CURRENT_API_REJECTED`。BUILD 执行步骤 skipped，真实 Setup/F01—F09/浏览器/26-742均未进入。B无执行步骤。Run39732017789无Job。
- 第一 Run 的 `Always verify complete recovery before unqualified transfer` 步骤 failure，但安全 Artifact 上传成功。Artifact12405800885，ZIP528bytes/API SHA256 `1f92708f1b4a661caac2e5387ccf6283ee4cec03f32968de0c474f40501a6878`，仅fresh-report.json，Schema/控制/Run/白名单独立核验通过；不含EXE。
- `driveRestored=true`；ProductRegistration、Binding、Startup、Desktop、Programs、ProgramFiles、工具链、GlobalRegistry、规则共10项均NOT_OBSERVED，Supervisor=null。不能推断真实残留，也不能认定完整恢复PASS。`privateSetupLogsMayExist=true`为保守未知，不是已证明运行Setup或生成日志。

## 失败解释与限制

现有 `ab/contract.cjs` 的 request 明确要求历史 Run 数量严格等于1；目前真实历史数量2已足以导致该合同拒绝。Artifact 的 CURRENT_API_REJECTED 覆盖 API读取、历史及Job验证，未记录首个具体断言；因此不将重复数量追认为唯一实际首因。双Run生成的底层原因仍UNKNOWN。未删除历史、未重置计数、未放宽唯一Run合同、未创建第三次运行。

## 预算与后续最小阻塞

用户授权1次Candidate，唯一触发额度1/1已用；实际2条Run作为异常如实登记，不隐去或将取消解释为退回额度。原QA0/1 UNUSED—FROZEN，其他Hosted0。停止本地工程与全部Hosted，保留工作树、原T2冻结和全部历史FAIL/UNKNOWN，仅治理非force同步。

后续最小阻塞是查明一次触发为何对应两个Run，并决定如何在保留这两条历史的前提下重新授权来源准入；这不是已证的安装器或LAN产品缺陷。本次不实施该后续修复、不申请或自动追加预算。
