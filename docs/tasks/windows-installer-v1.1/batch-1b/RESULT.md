# Batch 1B — RESULT

日期：2026-09-16。

**Batch 1B PASS — 等待架构验收。** PASS 仅指实施设计完整且本轮文档自检通过，不代表 Runtime 已实现或运行验收通过。

## 1. 本轮交付

- [RUNTIME-PLAN.md](RUNTIME-PLAN.md)：未来包结构、各目录来源、10阶段构建输入/输出/失败条件、Manifest/哈希无循环、消费接口、容量预算、实施文件边界。
- [DEPENDENCY-CLOSURE.md](DEPENDENCY-CLOSURE.md)：23项Windows x64生产依赖候选、Node来源、排除清单、Native Dependency Checklist、PDF资源和许可门禁。
- [VALIDATION-PLAN.md](VALIDATION-PLAN.md)：干净Windows 11 x64、无开发环境、禁止外部网络但保留回环、G1 Runtime/G2 Launcher分层、核心流程、失败反例和Batch 2准入。
- 本文件 RESULT.md。

状态来源：用户正式 Batch 1B 任务书已经确认 Batch 1A 的架构方向；具体 Node补丁/npm、Launcher/Setup工具、最终安装路径/身份等并未因此自动确定。

## 2. 文件变更

本轮新增：上述 batch-1b/ 下四份 Markdown。

本轮增量修改：公开根 PROJECT.md、docs/tasks/windows-installer-v1.1/MASTER-PLAN.md、docs/tasks/windows-installer-v1.1/DECISIONS.md；登记 Batch 1A 架构方向已批准、当前仅 Batch 1B 设计。

本轮开始前已有：三份上述跟踪文档的 Batch 1A 修改、batch-1a/ 下五份未跟踪文档。本轮保留这些内容；Batch 1A 五份文件的 SHA256 前后完全一致，没有回填旧交付的验收勾选。

## 3. 禁止事项核对

| 项目 | 实际结果 |
| --- | --- |
| 是否修改业务代码/server.js/HTML/CSS/JS | 否 |
| 是否修改 package.json/package-lock/Install.cmd/Start.cmd | 否 |
| 是否下载生产依赖或提交 node_modules | 否 |
| 是否生成 Runtime | 否 |
| 是否生成安装包/Setup/Launcher | 否 |
| 是否运行测试 | 未运行 Runtime、业务、安装、离线、原生DLL或浏览器测试；只做只读依赖核对与文档静态检查 |
| 是否修改 v1.0.0/创建Release/合并main | 否 |
| 是否创建任务/Agent/工作树/克隆 | 否，复用既有公开副本 |
| 是否提交/push/触发CI/PR/部署 | 否 |
| 是否读取其他用途版本/真实数据/凭据 | 否 |

## 4. 检查与设计闭环

- 23项候选名称和版本与当前锁文件静态Windows x64筛选逐项一致；不是实际安装结果。
- 包布局、来源和排除规则完整；Launcher 明确不在当前 Runtime 包，OCR仅保留既有源码、不含引擎。
- Pipeline 每一步给出输入、输出、失败条件；新manifest独立格式，不修改旧32文件验证器掩盖协议变化。
- 原生 .node/DLL、PDF动态导入/worker/WASM/cMap/fonts、Node来源哈希、License均纳入检查表。
- Manifest不自哈希；ZIP哈希在包外；文件集完整性与可信发行身份分开。
- 离线只阻断外部网络、保留本机回环；G1用外置测试harness，不伪装成正式Launcher；G2后续实现后再验。
- 备份恢复区分原有结构化数据备份与停机完整副本恢复，不添加不存在的UI按钮或业务规则。
- 包体积仅给容量预算：压缩约50–180 MiB、展开约150–400 MiB，未实际测量，不承诺上限，也不通过在线下载回退压缩数字。
- Markdown链接/行尾/范围检查通过，git diff --check通过；未发现新文档的本机路径、业务网络地址或凭据赋值模式。Git仅提示既有LF/CRLF转换。
- 当前已有非Markdown跟踪文件与HEAD一致，暂存区为空。

## 5. 当前阻塞与 Batch 2 判断

本轮设计任务无环境阻塞；但 **不能进入 Batch 2**：

1. 本轮设计尚待上级验收，Runtime实施未授权也未执行。
2. Node精确安全版本与构建npm版本尚待实施前核定；未改现有24.21.0记录。
3. 原生图形二进制的完整适用许可/声明在既有公开记录中仍为待核验，父包MIT来源映射不等于全部再分发审查通过。
4. 生产依赖、原生DLL与PDF资源没有实际闭包验证结果。
5. Runtime离线启动和Windows 11 x64干净环境G1均未运行。

以上问题不因“设计PASS”消失。后续必须先获准实施Runtime并通过G1/许可等门禁，再经明确授权进入Batch 2；不得直接跳到Launcher或Setup。

## 6. Git 交付快照

仓库：KG718718/spxt-public。

分支：codex/windows-installer-v1.1。

当前 HEAD：49b3e35c68468b3c61e3ad19ed379ce057d17886（无新提交）。

本轮只读核对的远端：该开发分支仍为同一HEAD；main与v1.0.0 tag均为84cbb324a4f63bef094d2c21d70eba841205a7a7。

git status --short：

```text
 M PROJECT.md
 M docs/tasks/windows-installer-v1.1/DECISIONS.md
 M docs/tasks/windows-installer-v1.1/MASTER-PLAN.md
?? docs/tasks/windows-installer-v1.1/batch-1a/
?? docs/tasks/windows-installer-v1.1/batch-1b/
```

git diff --stat（相对HEAD，包含原有Batch 1A增量，不含未跟踪文档）：

```text
PROJECT.md                                       | 16 ++++++++++++++++
docs/tasks/windows-installer-v1.1/DECISIONS.md   |  8 ++++++--
docs/tasks/windows-installer-v1.1/MASTER-PLAN.md |  6 ++++--
3 files changed, 26 insertions(+), 4 deletions(-)
```

另有未跟踪设计文档9份：原有Batch 1A五份 + 本轮Batch 1B四份。工作区不是clean，全部为有意保留的设计资料，没有暂存/提交或混入运行资产。

已停止，等待架构验收；不进入Batch 2。
