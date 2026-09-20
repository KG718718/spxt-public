# TEST-FLAKE — archive.updatedAt second-boundary stability

状态：**OPEN / BACKLOG**。登记：2026-09-18，依据用户 Batch 2B 验收结论。
性质：独立测试稳定性任务；本轮只登记，不修复，不新建 Agent/对话/worktree/GitHub Issue。
优先级边界：不作为 Batch 3 开发准入阻塞，不豁免其完整 CI 门禁。

## 可复核事实

- 受测源码 cfc329fb405b1c5e4881e96eb8f2b4f78e8af552。
- Portable Actions 35294691905 attempt1：staging/解包各27项通过；公共 workflow-http 失败，完整回归25/26，因此不能称完整通过。
- tools/tests/public-workflow-http.test.js 第47行保存完整批准项目 JSON，第56行在服务费配置变化后要求项目 JSON 不变。
- 原失败记录唯一差异为 archive.updatedAt 的 09:20:03 → 09:20:04；既有 server.js 归档路径使用墙钟时间。业务字段在该次记录中一致；这不是对全部归档更新语义无害的证明。
- 同 commit 独立 35294691886 及 Portable attempt2 均26套742项 fail0 skip0。原样重跑通过不等于修复。
- 原始证据入口：https://github.com/KG718718/spxt-public/actions/runs/35294691905 。

## 后续定位问题（尚无修复结论）

1. 配置修改调用链为何更新已批准项目 archive.updatedAt；该时间字段的正式语义是什么？
2. 完整快照断言的保护范围与技术元数据更新是否冲突？
3. 使用可控时间边界/明确同步条件怎样稳定复现秒前与秒后路径，且不掩盖真实业务变更？

## 必须保留

- 不删除现有断言，不简单添加 sleep；不因一次重跑成功关闭任务。
- 不未经论证排除 archive.updatedAt，不把任何随机失败统一归为本 flake。
- 保留原失败和成功证据、代码 SHA、Actions attempt。
- 若根因要求业务归档语义变化，先单独报告范围和批准，不搭载 Batch 3 安装实现。

## Batch 3 复现记录（2026-09-20，仍未修复）

- ba0fa921629aeecaac599d52291510ea806f5b52，Runtime run35504220442 attempt1，public-workflow-http.test.js:91。
- 本次触发点是发票确认后的批准项目快照不变断言，不冒称与上次服务费配置触发点完全相同。
- 首次Artifact10603651574（runtime-r5a-gate）已原样下载到项目E盘Batch3 evidence/runtime-35504220442-attempt1。
- 实际比较stderr中的完整actual/expected JSON，替换archive.updatedAt后逐字符相等；
  唯一差异18:09:29→18:09:30，匹配已登记的跨秒字段模式。未发现本次其他业务字段差异。
- 依用户Task23仅正常重跑一次，attempt2成功；未改测试、未删断言、未加sleep，仍保持OPEN。
- 后续最终源码须独立全回归，不能用此重跑结果代替。首次失败不能因重跑成功被隐藏。

## 将来关闭标准（继续生效）

根因明确；原失败确定性复现；修改前失败/修改后跨秒及同秒稳定通过；原业务快照保护不降级；记录元数据语义与验证；相关测试及全回归通过。任务完成生成独立 RESULT/CHATGPT-HANDOFF，等待验收。本轮以上均未执行。
