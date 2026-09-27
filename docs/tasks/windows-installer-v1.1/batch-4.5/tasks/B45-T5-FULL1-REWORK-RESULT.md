# B45-T5-FULL1-REWORK 结果

## 结论

**PASS（本地工程修复完成，待 Master 独立 Review；未运行 Hosted）**。

Full #1 的 PORTABLE 失败可由测试环境路径表示解释：原 37 项 LAN Node 测试在物理目录为 37/37，通过同一目录的 junction 运行则为 31/37、6 项 `LAN_CONFIG_PATH_INVALID`。现有生产路径拒绝逻辑工作正常，本任务没有放宽 `public-lan-config.js` 或 Firewall 生产接受条件。

## 身份与范围

- TASK：`B45-T5-FULL1-REWORK`
- baseline：`b67cbb6e4bb2ddadd92ddf6ee12885198979ed19`
- 实现 commit：`cf4848a173535d746344d89be69d0c0ef3f8d04f`
- 分支：`codex/b45-t5-integration`
- Full #1：Run `36292822541` / job `108546037365` / Artifact `10922344270`
- Hosted 预算：本任务未消费；保持 D5 `1/2`、Full `1/2`、QA `0/2`

## 完成内容

1. 新增共用测试环境帮助器，选择受控、物理、规范化目录，并对 `TEMP`、`TMP`、`GOTMPDIR`、`GOCACHE`、`NODE_PATH` 等进程环境执行快照、恢复和恢复断言。
2. `ci-lan.ps1` 隔离 Launcher build 的环境副作用；37 项 LAN Node 测试在嵌套物理目录中串行运行，并严格要求 `37/37/fail0/skip0`。
3. beta.3 candidate 从 PORTABLE 到 frozen regression 使用同一外层物理环境；workflow 的 742 项回归另建物理测试目录并在 `finally` 中恢复。
4. 新增两份固定字段、非敏感 JSON 诊断；成功 Artifact 与失败上传白名单、构建和最终校验同步收紧。
5. compatibility 现有测试内加入环境顺序、固定计数、恢复失败闭合及 Artifact 路径断言，包装总数保持 45。

## 本地证据

| 检查 | 结果 |
| --- | --- |
| Node 环境合约 | PASS；7 checks；物理 37/37；junction 31/37、fail 6、skip 0；最终环境恢复为 true |
| compatibility + transaction wrapper | PASS；45/45；fail 0；skip 0；C01—C15 全 PASS |
| 独立 transaction 反例（修复前定位证据） | 物理 25/25；junction 2/25、fail 23 |
| PowerShell AST | 4 个受改/新增脚本无解析错误 |
| Node 语法 | `build-beta3.cjs`、`verify-artifact-beta3.cjs`、`compatibility.test.cjs` PASS |
| workflow | 受改内嵌 PowerShell 已由 AST/测试覆盖；当前环境无 PyYAML，因此未执行额外第三方 YAML parse；未安装依赖 |
| diff | `git diff --check` PASS；实现 commit 后仅保留既有未跟踪 `.test-work/` |
| 生产冻结 | 相对 baseline，`public-lan-config.js`、`config.test.cjs`、Firewall 五个生产文件均零差异 |
| 隐私 | 新报告只含 schema/kind/qualification/status/stage/reason、路径类别、计数、commit 和恢复布尔值；不写原始路径或测试日志 |

测试在提交前的已暂存树上执行；commit `cf4848a173535d746344d89be69d0c0ef3f8d04f` 由该已验证暂存树直接生成，提交后没有跟踪文件变化。未因仅生成 commit 而无修改重复运行 37/45。

## 已确认事实、推测与风险

- 已确认：物理目录通过、junction 反例稳定失败，失败点来自既有路径安全校验；修复仅改变测试/CI 环境和固定诊断。
- 基于证据的推测：Full #1 的六项失败与 Launcher build 后遗留的别名环境链一致；历史 Hosted 的精确底层路径表示未被唯一取证，因此不声称这是唯一原因。
- 风险：尚未运行 Full #2，真实 Setup/U22/U23/Registry/Firewall 与最终 Artifact 仍未由本任务证明通过。
- YAML 额外解析器缺失不改变上述脚本、测试和生产冻结结论；Master 仍需独立核验 workflow 小范围缩进与分支位置。

## 需要 Master 处理

1. 独立 Review `cf4848a173535d746344d89be69d0c0ef3f8d04f`，核验 workflow、恢复链、固定报告白名单和生产冻结。
2. Review 通过后按已批准预算决定是否整合并运行 Full #2；本任务不自行触发 Hosted。
3. Full #2 若失败，按批准边界停止并回网页版，不挪用 QA 或新增诊断预算。
