# B45-T5-WIN10-DISCOVERY-ROOT-CAUSE 第一阶段 RESULT

## 结论

**PASS — 仅合成分类阶段。** R01—R10 及生产 spawn 固定调用契约的合成测试通过；未运行真实 Windows discovery，未产生新的 P02 结果，不能据此认定根因或恢复 Final Full / QA。现冻结，等待唯一 Master Review 与下一阶段明确派单。

## 身份与范围

- 原 T5 worktree / branch：`codex/b45-t5-integration`；起点 `c39cdaafa9cd8b25468009318cca4dabcd4ecb67`。
- 治理依据：Master 已批准文件与任务卡，治理 SHA `2c32de4c9d8f813a6558cbe18a860eb96ef1b4fe`；未 checkout / cherry-pick 治理提交。
- 唯一回单 Master：`01a0db0e-c950-79e0-8e11-07155e0742f2`。
- 生产 `public-lan-network.js` 未改，blob 仍为 `4e13e944472f845675fe73d176f063c4fe97f6ed`。
- 历史 Hosted H1/H2 仍 2/2；Final Full 0/1、Final QA Hosted 0/1 未启用。

## 实施与证据

- 新增独立 `discovery-spawn-classifier.cjs`：通过原 `runWindowsDiscovery({spawnSync: wrapper})` 调用生产路径；wrapper 原样返回注入的 spawn 结果，仅输出固定 reason 与批准的 8 个布尔值。异常固定为 `INTERNAL`，不输出异常文本。
- 新增 R01—R10 合成反例及生产调用参数契约测试。测试验证 stdout、stderr、异常文本不会进入报告；证据 JSON 逐项与测试生成报告相等，只有批准的字段。无真实系统查询。
- 固定合成证据：`docs/tasks/windows-installer-v1.1/batch-4.5/evidence/discovery-spawn-synthetic.json`。该文件仅为合成测试，**不是**真实 Win10 P02 proof。
- 首次测试因测试文件 `require` 缺少 `.cjs` 扩展名失败；已修正并重新执行，最终 12/12 PASS、fail0、skip0。
- 两个新增 JS 文件 `node --check` PASS；`git diff --cached --check` PASS。未执行 Hosted、Full、QA，未操作 main/tag/Release。
- 实现及合成证据 local commit：`4f77a8eb7dd6bf2f4f9ccd15104e0db79b19d47e`。RESULT 另行提交；未 push。

## 保留风险与下一步

- 真实 Win10 上的 `NETWORK_DISCOVERY_FAILED` 原因仍未知。P01 历史 PASS、P02 历史 FAIL、P03—P08 未到达的既有结论不变。
- 本阶段只完成分类器合成门禁；真实只读 spawn 分类必须等待 Master Review 后另行派单。不得从合成 `COMMAND_PASS` 推出真实 P02 PASS。
- `.test-work/` 是既有未跟踪现场，未清理、未提交。
