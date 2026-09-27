# B45-T5-WIN10-DISCOVERY-LIVE RESULT

## 结论

**BLOCKED — 固定只读诊断已完成，底层 stderr 来源未唯一定位。** 当前真实 Win10 上，生产 discovery 首次分类和批准的唯一复核均为 `STDERR_NONEMPTY`。P02 仍 FAIL，P03—P08 仍 NOT REACHED；不得据此放宽生产 stderr 拒绝条件或宣称 Proof PASS。

## 已确认事实

- 执行环境为 Win10 x64 build19045；原生产 `public-lan-network.js` blob 保持 `4e13e944472f845675fe73d176f063c4fe97f6ed`，无生产改动。
- 首次真实生产 spawn 分类：`processResultPresent=true`、`spawnError=false`、`timedOut=false`、`exitZero=true`、`signalPresent=false`、`stderrEmpty=false`、`stdoutPresent=true`、`jsonParseable=true`，固定 reason `STDERR_NONEMPTY`。
- 按条件执行 N01—N05 各一次，只读固定探针均为 `FAIL/STDERR_NONEMPTY`。探针使用生产安全系统 PowerShell 解析及相同参数、工作目录、环境、超时和缓冲上限；各自仅执行批准的查询并丢弃原始结果，随后输出固定 JSON 状态。
- 分段后完整当前生产脚本仅复核一次，结果与首次完全一致，仍为 `STDERR_NONEMPTY`。
- 即时拒绝原因已唯一确认：生产校验拒绝非空 stderr。**但 stderr 的底层来源不能仅凭固定布尔值唯一判断。** 最小未消除候选集合是共用调用/环境/模块加载层的诊断输出，或这些只读查询各自产生的诊断输出；不能把其中任一项当作已证实根因。
- 原始 stdout、stderr、异常、网络身份和路径均未打印或写入证据；仅有闭合字段证据 `evidence/discovery-spawn-live.json`（按首次、复核顺序）和 `evidence/discovery-probes-live.json`（按 N01—N05 顺序）。

## 工程核验与边界

- 合成 R01—R10、固定调用契约及新探针分类测试：14/14 PASS，fail0、skip0；新增 JS `node --check` PASS；`git diff --check` PASS。
- 未修改网络、Firewall、Policy、Registry、Service、模块或生产代码；未创建 listener；未执行 Hosted、Final Full 或 QA。历史 H1/H2 2/2、Final Full 0/1、Final QA 0/1 不变。
- 本地 `.test-work/` 未清理或提交。未 push、未操作 main/tag/Release。
- 继续冻结原 T5，等待唯一 Master Review。若要判明 stderr 的具体来源，需要新获批且仍遵守隐私/安全边界的诊断办法；若任何修复须放宽 stderr 接受条件或产品/架构安全门禁，先返回批准层决策。
