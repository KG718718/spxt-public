# B4-T1A — Historical beta.1 identity evidence
## 共同边界
你是执行任务，不是项目主控。TASK ID B4-T1A；父Batch4；来源/回单主控019fa7e9-f46b-7192-9052-cd0aac7c2cc5。困难/L2，公开发行物身份与升级安全，高风险；gpt-5.6-sol/medium。用户批准Execution thread、managed worktree和开发分支Actions；主控批准本工程拆分。
首项只回报git toplevel/origin/HEAD，必须在E:/CodexWorkspace/CodexWorktrees、KG718718/spxt-public、派单精确baseline；不符立即BLOCKED且不写。核验后使用codex/b4-t1a-historical-identity本地分支。
读取E:/CodexWorkspace/AGENTS.md、自己公开worktree AGENTS/PROJECT、Batch4 intent/SPEC/PLAN/ACCEPTANCE/ORCHESTRATION、B4-T1/T1-RESULT及upgrade-detection实现、现有Setup workflow/build/test。禁止读取或比较其他仓库/版本/真实数据。
只改本任务明确授权的新脚本、专项测试、独立workflow和B4-T1A-RESULT；不改setup.iss/build.cjs/Launcher/Runtime/业务/package/lock/T1/T2 helper。只local commit，不push/merge/main/tag/Release，不建thread/agent/worktree。
产品/架构冲突返回BLOCKED/NEED PARENT DECISION。完成回单固定字段；内部任务不写CHATGPT-HANDOFF。

## 单一目标
建立一次性但可复核的GitHub Windows身份取证能力：在Artifact10606870944过期前，于GitHub托管Windows隔离runner下载并验证历史Run35514357007的原始公开Artifact，实际安装beta.1，提取安装后非敏感精确identity anchors，验证T1单policy对实际安装PASS，并输出仅JSON/hash报告。不得在开发机下载或保存发行包。

## 允许修改
- 新增 tools/windows-installer/historical-identity/**（提取/校验脚本；Node/PowerShell沿用现有工具，不引新npm依赖）
- 新增 tools/tests/windows-installer/historical-identity/**（静态/合成测试）
- 新增 .github/workflows/setup-b4-historical-identity.yml（独立workflow_dispatch，不改现有Setup workflow）
- 新增 docs/tasks/windows-installer-v1.1/batch-4/tasks/B4-T1A-RESULT.md
禁止写其他报告/PROJECT/ORCHESTRATION。

## 必须验证
1. API元数据严格匹配repo、Run35514357007、Artifact10606870944、名称、head SHA e9417f0、run success、未过期；workflow permissions最小contents:read/actions:read。
2. 下载只在runner E盘临时目录；外层artifact解包后定位唯一Setup；SHA256必须49d28d4dbd131b0dd0890e44aea358d75a8406803ff10df808f073d5c2a72af8，否则停止。
3. 使用现有beta.1支持的静默参数，在runner隔离的程序/instance路径真实安装；无真实账号/项目/附件，不启动业务服务、不发邮件。安装路径、registry和instance均为runner临时合成环境。
4. 从真实安装后磁盘提取：installer-manifest bytes hash、payloadInventorySha256、runtime-manifest bytes hash、Launcher hash、uninstall build-info bytes hash，以及固定commit/tree/version/DC映射。不得仅使用Artifact外层final build-info代替安装内build-info。
5. 使用真实HKCU登记/binding读取生成最小snapshot；处理32/64视图并证明唯一；用当前T1 validate(snapshot,historical policy)对真实安装PASS。不得伪造registry替代安装。
6. 输出严格schema的historical profile/evidence，只有非敏感IDs/版本/hash/计数；不得含路径、用户名、registry值、环境变量、token、密码、业务/附件正文。日志同样脱敏。
7. 结束卸载并证明程序登记/快捷方式/临时instance按测试预期清理；即使失败也清理runner临时内容。不可把Artifact/Setup/安装目录上传或提交。
8. 上传仅小型JSON evidence Artifact，建议保留30天；Job Summary只放非敏感身份和结论。Actions执行由主控整合push后触发，本任务本地只实现和做静态/合成测试，不声称云端通过。
9. 身份证据脚本支持主控后续把实际JSON作为beta.2 bundle historical profile输入；如果Artifact API/安装参数/真实post-install anchors无法安全获得，云端将BLOCKED，不能放宽T1。
10. 测试覆盖metadata/SHA/schema/脱敏/唯一文件/外层final build-info误用拒绝/缺registry或多view拒绝/输出无路径secret；保留现有43项T1、T2专项及contract。不得修改断言来变绿。

## 停止条件
本地提交仅代表“取证能力候选”，不是历史identity已取得。主控Review后才push/运行workflow。不得接续T3/T4。
