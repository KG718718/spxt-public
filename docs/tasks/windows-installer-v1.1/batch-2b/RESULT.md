# Batch 2B — Launcher + Runtime Portable Candidate

## 当前结论

**PASS — 2026-09-18 用户已补齐最终 Actions 整包的 1–8 步人工验收并正式批准。Batch 3 先提交范围方案，待再次审批后实施。**

本次仅更新验收文档：没有重编译、重打包、重跑自动化或改变原 Artifact。以下自动化结果来自原受测 commit，不属于文档归档 commit 的新测试。

受测源码 `cfc329fb405b1c5e4881e96eb8f2b4f78e8af552`；分支 `codex/windows-installer-v1.1`。正式对象是 GitHub Actions 整包，不是本地构建包。

## GitHub 证据

- [Portable run 35294691905 attempt2](https://github.com/KG718718/spxt-public/actions/runs/35294691905/attempts/2)：PASS。同 commit fresh Runtime→加入许可/manifest→编译配对 Launcher→整包27项→ZIP→全新中文空格目录解包27项→全回归26套742项，失败0、跳过0。
- [Launcher run 35294691939](https://github.com/KG718718/spxt-public/actions/runs/35294691939)：PASS，L01—L17 + 6反例。
- [独立回归 run 35294691886](https://github.com/KG718718/spxt-public/actions/runs/35294691886)：PASS，26套742项，失败0、跳过0。
- Artifact：`K-SESSION-portable-win-x64-cfc329fb405b1c5e4881e96eb8f2b4f78e8af552`，ID `10527372359`，外层 Actions Archive 50,903,984 bytes，SHA256 `96a1154d0f8d3e994dabdce477ed8b43e818b79533a3cb63c1daf5fe290e527f`。此哈希不是内部 Portable ZIP 的哈希。
- Artifact 30天保留，当前到期2026-10-18；未创建 Release，不是永久下载发布渠道。
- 内层 `K-SESSION-portable-beta-win-x64.zip`：51,285,232 bytes（约48.91 MiB）；SHA256 `35bda7ac54150622be6673570f065f753d2a6b3665ecd8619678abd771c6db44`。
- 原始Artifact已通过GitHub API分段下载到E隔离输出，Range/长度逐段核对，外层SHA与GitHub digest一致；不是重打包。解出原始内层ZIP，SHA再核对一致；再解包到全新中文空格目录，1042文件完整性复核PASS，未运行本地编译EXE替换。该目录交用户人工测试。

## Build identity

- Node 24.21.0 x64；Go 1.27.1、windows/amd64、CGO_ENABLED=0。
- sourceTree：`9a0d6ffec6f3dbafa109f3850cff668dc2191c5a`；package-lock SHA256：`7e650d8d4141d888ab7cc81da25fa094f0e36ffaa0f2152d5066346633e8b2b5`。
- Launcher EXE SHA256：`3f59920ad1558c1387470367c92b6f7786ac5468076c68555561ebcdcf84d587`。
- Runtime manifest SHA256：`e7e6db666176a542da20433ac6da720d0f69ebf5d925dff0b233bebd448714ae`。
- 生产依赖20；整个程序1042文件、143,766,301 bytes（未压缩）。不含Canvas、Skia、npm原生addon、业务实例或用户数据。
- Artifact内保留build-info、manifest、许可、ZIP hash、两轮Portable报告、Launcher报告、全回归JSON。程序只有包内Node和根Launcher，不依赖系统Node/npm。
- `zip-identity.json` 在ZIP生成时的 `extractedRecheck: REQUIRED` 是当时门禁要求；最终解包结论在 `portable-test-report.json.extracted.status=PASS`，不能把前者当最终未测结果。其 humanWin10=PENDING 也不冒充人工确认。

## 已完成 / 范围

根 K-SESSION.exe；私有Runtime配对校验；外置Beta实例和独立Launcher日志；只读程序目录、复制到新路径复用实例、端口冲突回退、自己的Node异常退出后重启、精确整包清单；同commit Actions一体化构建和解包验证。

仅改Launcher/Portable构建/测试/workflow/文档；相对2A基线f4da811，server.js、业务页面、package.json、package-lock.json无差异。没有Setup、安装注册、快捷方式、卸载、升级、OCR实施、签名、Release、main合并或v1.0.0操作。没有创建Agent/新任务/工作树，没有访问其他用途版本。

## 必须保留的风险与未完成项

1. Win10 当前开发机、本次 Actions 整包的人工验收已由用户完整确认：启动/浏览器/原账号、只关浏览器、退出停止、停止后不可访问、重新启动、原账号与数据保留及无影响使用异常均正常。不是沿用 2A 反馈；不等于干净机器认证，Win11 未实测。
2. 停止使用Job进程级终止，仅验证空闲及无提交的页面打开场景；先保存再停止，不承诺在途业务无损。Batch4负责正式数据/升级/退出策略。
3. Portable attempt1 的既有公共测试因 archive.updatedAt 跨秒失败，attempt2原样通过；没有修改业务或公共测试，也没有声称该时间敏感断言已修复。用户批准单独立项 TEST-FLAKE — archive.updatedAt second-boundary stability，不作为 Batch 3 阻塞，不删除断言、不使用简单 sleep。见 ../test-flake-archive-updated-at/TASK.md。另 cb661bf 历史浏览器超时见测试报告。保留全部失败记录。
4. unsigned开发Artifact可能触发Windows安全提示；本轮不签名、不发布正式版。
5. 默认外置目录是LOCALAPPDATA/K-SESSION/Beta/instance，不是Batch4最终目录契约；邮件/OCR关闭。PDF文本、上传、Excel、备份核心路径不需要外部开发工具。

## Git安全和传输记录

最初提交23dab7e、cb661bf使用git push；cfc329f在Git443连接反复重置时，通过GitHub Git Data API上传相同blob/tree/commit，逐一核对SHA完全一致后，仅force:false快进开发分支。没有变更凭据、代理或安全设置，没有force push。

main和v1.0.0重新读取均为 `84cbb324a4f63bef094d2c21d70eba841205a7a7`。后续报告提交不代表重新编译，受测身份以上述cfc329f及Actions ZIP为准。

## 后续

Batch 2B 已正式批准。Batch 3 目标、范围、排除项、验收、风险、回滚见 ../batch-3/PROPOSAL.md；只提交方案，不自动开始安装器实现，也不进入 Batch 4。安装技术、目录和最小卸载范围须随方案再次审批。
