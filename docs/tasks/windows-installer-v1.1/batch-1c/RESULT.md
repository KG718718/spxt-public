# Batch 1C — Runtime Build Prototype 结果

## Batch 1C-R3 当前结论｜2026-09-16

**PASS — viable text-only PDF alternative found。** 仅PDF文本架构Spike通过，不等于Batch1C Runtime整体通过。R2文档检查点`8b177a0026f34067fb66a9ad5fa715a577ff56bc`已仅推送开发分支并回查；R3报告尚未提交/推送。

官方4.8.69 generic入口在Node24.21.0中，不装optional canvas/path2d、禁addon并限制读取目录，8种合成PDF连续3轮24/24通过，无canvas/Skia/原生二进制/DOM补丁警告，文本与坐标同基线。历史版本维护风险及官方安全查询边界明确保留。9配置矩阵包含故意失败候选，并非全矩阵通过。

首轮父级第三方依赖自动解析越界、探针路径/cleanup错误与失效字体样本均披露并作废；有效证据使用fixtures-v2及runs-v3。未读取内部业务源码/数据/配置，未修改正式依赖、业务、构建门禁、Runtime/发行物。最新6.3.289 legacy警告、pdf2json内嵌安全谱系、unpdf高危版本/CMap/部分polyfill均不掩盖。

完整结果：[PDF-ARCHITECTURE-SPIKE.md](PDF-ARCHITECTURE-SPIKE.md)、[PDF-SPIKE-RESULTS.json](PDF-SPIKE-RESULTS.json)、[SECURITY-COMPARISON.md](SECURITY-COMPARISON.md)、[CHATGPT-HANDOFF.md](CHATGPT-HANDOFF.md)。正式迁移需另批，pdf-parse传递原生链/host-smoke及完整锁图仍须联合审查。R1许可、Runtime ZIP及Win11 G1不自动解除，不进入Batch2/3。以下历史报告原样保留。

## Batch 1C-R2 当前结论｜2026-09-16

**BLOCKED — 删除条件D不满足；独立pdfjs-dist → canvas依赖仍存在。** 本批审计完成，不执行依赖清理、不进入Batch2/3。详细分类、引用行、动态调用链和fresh依赖图见[DEPENDENCY-USAGE-AUDIT.md](DEPENDENCY-USAGE-AUDIT.md)。

### 先完成R1检查点

仅审查并暂存原R1的10份文档/工具文件：6份tracked MD、2新增MD、2新增CJS。未纳入node_modules、staging、cache、ZIP、实例、日志、秘密或真实数据。git diff --check通过，仅既有LF/CRLF提示。

- checkpoint/source/当前HEAD：`2aeaa4089520a99829f1b9981b7b5ea2bfa9e295`。
- 提交：`docs(runtime): checkpoint Batch 1C-R1 native license evidence`，10files、+496/-46。
- 已仅普通push到codex/windows-installer-v1.1，远端只读回查同SHA；main与v1.0.0仍为`84cbb324a4f63bef094d2c21d70eba841205a7a7`。
- 不改tag/Release、不force push、不合并main、无PR。R1原证据和旧build-02完整保留。

### 实际审计结果

1. 对该公开commit全部135文件静态搜索并检查动态加载/路径拼接；32应用文件中未发现pdf-parse调用。PDF文本实际直接import pdfjs-dist/legacy/build/pdf.mjs。
2. 原host-smoke调用PDFParse.getText()，不是只核包名；旧在线安装器还会动态require全部根生产依赖。二者不能冒充业务代码使用pdf-parse，但也不能忽略。
3. 在新E盘源码外目录，用原package/lock fresh npm ci，23个Win32 x64生产包与lock逐项一致；npm ls/explain均exit0。没有复用旧node_modules。
4. npm explain及安装实物确认pdfjs-dist的独立optional canvas路径。只导入该pdfjs入口的全新进程实际加载Canvas/Skia，没有加载pdf-parse；用白名单环境复验一致。
5. 因D不满足（B也未满足），未删除任何包、未修改package/lock、未生成dependency变更diff。删除前23包，删除后N/A；当前仍23包。

任务书中“任一失败则pdf-parse仍为实际运行依赖”的固定句不能准确表述此处事实。本轮明确区分“业务未调用pdf-parse”与“当前PDF依赖仍加载canvas”，不编造前者是业务必需。

### 本轮实测与未执行

fresh node_modules共1,131文件/98,604,168字节，**不是Runtime包**。Node24.21.0 x64/npm11.19.0；native与R1同hash。安装前后package/lock不变，trace后依赖文件hash不变；32应用文件对HEAD/冻结main零差异。3个外置审计助手语法、Git空白/范围检查通过，证据文件逐项hash留存。

没有执行删除后完整业务/PDF/上传/导出/初始化/登录/备份/host-smoke回归，没有新Runtime/manifest/ZIP/解包，没有Win11G1；不能将原12项诊断或本次import探针当成本批功能回归。Runtime ZIP与SHA256均N/A。

原R1再分发证据仍有U1/U2/U3三个未关闭工作项；不能标NOT APPLICABLE或license approved。当前Win10开发环境不能替代指定干净Win11G1。

### 文件、Git与边界

- R2新增：本目录DEPENDENCY-USAGE-AUDIT.md。
- R2修改：本目录RESULT、RUNTIME-BUILD-REPORT、VALIDATION-REPORT、NATIVE-LICENSE-CLOSURE、CHATGPT-HANDOFF，公开PROJECT、MASTER-PLAN；共7份tracked MD修改+1新增MD。
- R2报告未额外提交/推送，暂存区为空；HEAD/远端为已推R1检查点。`git diff --stat`只计7份tracked文件，不能遗漏新增审计报告。
- 外置证据：项目output/windows-installer-v1.1/batch-1c/dependency-audit-r2-01；同级3个审计助手不进入Git/Runtime。全新cache/安装材料仅用于依赖审计，无业务实例；没有清理/覆盖旧输出。
- 明确未改：业务源码、package/lock、Install/Start、既有构建/测试/许可门禁、旧Runtime、main/v1.0.0。未访问内部/公司版、真实数据或账号配置、未启动应用服务、未发送邮件、未安装OCR。

下一步必须由上级决定继续R1原生闭包，或另立PDF依赖架构评估；本轮不实施替代方案，停止等待验收。

## 以下为R1历史报告（其HEAD/未提交状态仅代表原交付时点）

## Batch 1C-R1 当前结论｜2026-09-16

**Batch 1C FAIL — native distribution evidence incomplete**。未进入Batch 2/3。

### 检查点已完成

先核对全部已修改/未跟踪文件，允许清单25文件，无依赖、缓存、ZIP、staging、实例、日志、私有配置或真实数据入暂存区。敏感凭据模式与git diff --check通过，按明确授权提交：

- checkpoint / 当前HEAD：`468d62357fe4861a9a3015df23a7b6c1862b858a`。
- commit：`windows-runtime: checkpoint batch 1a-1c prototype`。
- 25 files changed, 1613 insertions(+), 4 deletions(-)。检查点后工作树clean。
- 已普通快进push到`codex/windows-installer-v1.1`，远端回读同SHA；未推main、未force push、无PR/Release。
- 远端main与v1.0.0仍为`84cbb324a4f63bef094d2c21d70eba841205a7a7`。本轮未对Release执行写操作。

### 原生闭包调查与停止点

新增[NATIVE-LICENSE-CLOSURE.md](NATIVE-LICENSE-CLOSURE.md)，收集54份官方npm/GitHub/Gitiles原文和逐文件来源/SHA，确认精确Canvas/Skia提交、包内native、ICU资源及公开发布证明。仍有U1 Rust解析依赖、U2 Skia实际链接输入与组件图、U3最终适用声明3个未关闭分发工作项；具体证据及最短续行路径见报告。

不是简单“查不到MIT”：已取得多份原始声明，但该提交没有Cargo.lock，公开Windows CI artifact过期，发布证明没有原生组件全表。未绕过或改写现有license gate，未修改package-lock，未升级/重编native。

由于许可未PASS，本轮**没有**fresh Runtime构建、Runtime ZIP、ZIP解包复验。旧build-02未改；其source commit仍为49b3e35c68468b3c61e3ad19ed379ce057d17886，不能冒称由检查点commit重新构建。

当前Windows10开发机不符合G1。新增[G1-ENVIRONMENT-REQUIREMENTS.md](G1-ENVIRONMENT-REQUIREMENTS.md)，包含准入、环境记录、同一ZIP hash、只读包/包外实例、22项用例与真实浏览器证据要求。未创建VM、改防火墙、启动业务服务或伪报G1。

### 本轮验证与改动

- 29项既有守卫、14项新合成完整性反例复跑通过。
- 新证据测试75项通过，覆盖54份原文hash、来源边界、精确提交、attestation摘要对应及native/ICU实际字节；没有进行Sigstore验签，不能称许可批准。
- 旧build-02：1199文件完整性复验PASS、distribution仍BLOCKED-native-license；manifest hash不变。
- 原12项功能诊断为前轮结果，本轮不复跑、不升级为G1。无实际浏览器/截图、无离线或非管理员新结论。
- 新增：本目录NATIVE-LICENSE-CLOSURE.md、G1-ENVIRONMENT-REQUIREMENTS.md，tools/windows-runtime/collect-native-evidence.cjs、tools/tests/windows-runtime/native-evidence.test.cjs。
- 修改：本目录RESULT、RUNTIME-BUILD-REPORT、VALIDATION-REPORT、CHATGPT-HANDOFF，公开PROJECT与MASTER-PLAN。
- 未修改业务源码、锁文件、Install/Start、原构建门禁、既有Runtime、v1.0.0。未访问其他用途版本/真实数据、未发送邮件。

本轮续行资料保留在工作树，未额外提交/推送；**当前HEAD和远端仍为已完成的检查点468d623**。Git状态非clean（6份已跟踪Markdown修改+4新增文件），暂存区为空；不要将检查点已推送理解为本轮续行报告也已推送。停止等待上级验收，不自动进入新阶段。

原始证据在源码外`output/windows-installer-v1.1/batch-1c/native-license-r1-02/`：sources.json SHA256 `01f10823fadb4573c352e99fc3b0545e934c89b22fda1c79fb9d928f1a8f6e6c`；native-review-check.json SHA256 `ef99ec68d29cdb1c28c3493b928809bd9ad60bd84f547a16c3ef654f3d7bdee6`。初次收集目录及所有旧失败现场保留，不进入Git/Runtime。

## 以下为初次1C历史报告（保留原时点事实）

日期：2026-09-16。**Batch 1C FAIL，未达到验收条件，不能进入 Batch 2。**

已完成构建/验证脚本和一份可运行的 Runtime 暂存目录；没有生成要求的 Runtime ZIP。不是 Setup、Launcher、Release 或 v1.1.0。

## 1. 实际结果

| 项目 | 结果 |
| --- | --- |
| 公开仓库 | KG718718/spxt-public |
| 分支 | codex/windows-installer-v1.1 |
| 应用取件 commit / 当前 HEAD | 49b3e35c68468b3c61e3ad19ed379ce057d17886 |
| Git source tree | 9b970023010879e366ac8e68e9dfdf4e739c8bf4 |
| 应用版本 | 原 package.json 的 1.0.0，未伪改为 1.1.0 |
| Node / npm | 官方 Node 24.21.0 x64 / 其自带 npm 11.19.0 |
| 生产依赖 | 23 个，新的 npm ci 安装；未复制开发机 node_modules |
| 暂存目录 | E 盘项目输出区 `output/windows-installer-v1.1/batch-1c/build-02/KSESSION-RUNTIME/`，在公开源码副本外 |
| 暂存规模 | 1,199 文件，194,275,955 字节（约 185.28 MiB） |
| Runtime artifact | **未生成**；ZIP 大小/ZIP SHA256 均不适用 |
| Manifest SHA256 | `0c9967b54b219a26d484beb16f2b194c1f8659875c2f76dbc7a8e5076e8b101c` |
| Git blob package-lock SHA256 | `c4050d95db6d40702a222ee9da9e43d74c5d36a8e5be73583e1dc2f08d9a5bf5` |
| 构建机器 | Windows 10 专业版 x64，10.0.19045；有开发环境，不是干净 Windows 11 |
| 防护测试 | 29 项路径/依赖/环境/许可守卫 + 14 项合成文件完整性反例通过 |
| 开发机功能诊断 | 12 项通过；不等于离线/浏览器/G1 验收 |
| 正式 G1 | 未满足；干净 Windows 11、外网隔离、真实浏览器尚缺 |

两个 Node 哈希均已重新对照官方 SHASUMS256.txt，且对实际下载归档/解压 exe 计算一致：

- ZIP：`158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541`。
- node.exe：`ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32`。

本地工作副本 CRLF 哈希不是上述 Git blob 哈希；本次从指定 commit 逐文件原样取件，不把行尾差异误报为业务修改。

## 2. 阻塞与停止理由

1. **原生许可仍未闭合。** Canvas 平台包原始 MIT 可由已核准的同版本父包映射；但实际 `.node` 中 Skia 及其嵌入组件的完整许可/声明未建立文件级来源关系。构建器按 Batch 1B P6/L 门禁保留检查材料、返回失败、不输出 ZIP；没有把原生许可直接改成 complete。不是已经确认侵权，而是没有足够证据证明完整分发声明。
2. **指定验收环境尚未具备。** 当前运行的是 Windows 10 开发机。只清理子进程 PATH 不能证明干净 Windows 11 无开发依赖；本轮也未阻断开发机外网，不改其防火墙/系统组件。需要单独提供或批准准备干净 Windows 11 x64 测试环境，再执行全部 G1。
3. ZIP 分支未实际执行、解包复验未执行；中文/多页/嵌入字体/CMap复杂 PDF、真实浏览器、只读程序目录及非管理员权限、动态 DLL 来源跟踪、完整副本恢复均不能标记通过。

继续条件：补齐原生组件许可证据并实现其精确校验，重新构建并实际生成 ZIP；在符合条件的目标机完成 G1。仍属于 Batch 1C，不先进入 Launcher/Setup。

## 3. 文件与范围

新增 8 个脚本：

- `tools/windows-runtime/build.ps1`：官方 Node 获取/哈希及隔离执行入口。
- `tools/windows-runtime/build.cjs`：Git blob 取件、生产闭包、许可证、PE/PDF检查、manifest/hash、许可门禁及归档分支。
- `tools/windows-runtime/common.cjs`：路径、环境、依赖、PE 与文件清单防护。
- `tools/windows-runtime/verify.cjs`：完整文件集/哈希/零实例污染验证。
- `tools/tests/windows-runtime/guards.test.cjs`。
- `tools/tests/windows-runtime/integrity.test.cjs`。
- `tools/tests/windows-runtime/modules.cjs`。
- `tools/tests/windows-runtime/host-smoke.cjs`。

新增本目录三份报告；仅增量修改公开 `PROJECT.md` 的当前阶段说明。既有 Batch 1A/1B 未提交资料保留，没有覆盖或清理。

没有修改业务源码、package.json、package-lock.json、Install/Start；没有实现 OCR、Launcher 或 Setup。未访问其他用途版本、真实数据或业务主机；所有诊断身份/记录是包外明确合成数据。没有真实邮件。

没有提交、push、PR、CI、Release、main 合并或部署。main/v1.0.0 本地引用均保持 `84cbb324a4f63bef094d2c21d70eba841205a7a7`，没有发起远端写操作。本轮不重写任何历史发行物。

## 4. Git 快照

当前 HEAD 仍为上述 49b3e35，无新提交。工作区非 clean，暂存区为空：

```text
 M PROJECT.md
 M docs/tasks/windows-installer-v1.1/DECISIONS.md
 M docs/tasks/windows-installer-v1.1/MASTER-PLAN.md
?? docs/tasks/windows-installer-v1.1/batch-1a/
?? docs/tasks/windows-installer-v1.1/batch-1b/
?? docs/tasks/windows-installer-v1.1/batch-1c/
?? tools/tests/windows-runtime/
?? tools/windows-runtime/
```

`git diff --stat` 不统计上述未跟踪文件；本轮真实增量为 8 脚本 + 3 报告 + PROJECT 当前阶段索引，不能以 tracked diff 的文件数冒充全部变更。最终语法及 diff 检查见验证报告。

最终 tracked diff（含原有1A/1B文档差异）：3 files changed, 34 insertions(+), 4 deletions(-)。其中 PROJECT.md +24行，DECISIONS.md +6/-2，MASTER-PLAN.md +4/-2；本轮只在 PROJECT.md 增加8行，其余为原有增量。暂存区无差异。新增11文件逐项执行 git diff --no-index --check 通过；本轮诊断端口49745/49759/49762均已无监听。

证据索引：[构建报告](RUNTIME-BUILD-REPORT.md)、[验证报告](VALIDATION-REPORT.md)。本轮停止，等待上级处理阻塞和验收，不进入 Batch 2/3。
