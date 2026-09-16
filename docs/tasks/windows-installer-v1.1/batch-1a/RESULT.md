# Batch 1A — Architecture Decision 设计交付

日期：2026-09-16。结论：设计资料已完成、自检通过；**架构仍待上级评审，不是 Build 或安装验收 PASS**。

## 推荐结论

采用私有 Node x64 + 原样应用 + 构建时准备的生产 node_modules，保留现有浏览器页面和 Node 后端。单个 Setup.exe 负责统一安装多个运行文件，不要求将应用改成单运行 EXE。

完整方案与证据见 [spec.md](spec.md)；授权与边界见 [intent.md](intent.md)；后续门禁见 [plan.md](plan.md) 和 [acceptance.md](acceptance.md)。

## 重点风险

1. 锁文件包含 PDF 原生 canvas 组件，必须核对 DLL、资源和第三方声明；npm ci 成功不足以证明闭包完整。
2. 原安装器限制 32 文件、运行时与 Launcher 一致性，新分发包不能直接冒充旧格式；旧版升级须另行设计，不覆盖 v1.0.0。
3. SMTP 使用 CurrentUser DPAPI，不能未经设计改变运行账号或迁移为系统服务。
4. Launcher、锁/日志/数据目录、环境注入、端口与就绪判断需共同设计；Program Files 只读安装不能照搬当前根目录写入方式。
5. 原生 DLL 完整性、离线核心、Windows 具体版本支持与旧版升级均未实测，不能宣称已独立运行。

## 文件变更

新增本目录五份 Markdown：intent.md、spec.md、plan.md、acceptance.md、RESULT.md。

增量修改三份 Markdown：公开根 PROJECT.md、上层 MASTER-PLAN.md、上层 DECISIONS.md。

没有修改 JS、HTML、CSS、CMD、JSON、YAML、Python 或测试文件；没有安装依赖、下载运行包、生成包、启动服务、调用安装器、运行业务/兼容性测试。

## 核验

- 读取公开版相关源码/锁文件和官方 Node/npm 文档；未访问其他用途版本、运行实例、真实业务数据或凭据。
- 仅修改允许范围的 Markdown；原有非 Markdown 跟踪文件与 HEAD 相同。
- 文档本地链接检查通过；首次核对 25 处本地链接，新增本结果页后再次核对。
- 设计新文档未发现本机绝对路径、业务网络地址或凭据赋值模式；此为范围内文本核验，不冒称完整安全审计。
- git diff --check 通过；新文档另检查行尾空白。只有既有 LF/CRLF 提示，没有修改行尾配置。
- 仅设计，无业务、Runtime、安装、DLL或干净机器测试结论；没有用历史 CI 补填本轮结果。

## Git 与外部状态

- 仓库：KG718718/spxt-public。
- 分支：codex/windows-installer-v1.1。
- HEAD：49b3e35c68468b3c61e3ad19ed379ce057d17886，未创建新 commit。
- 远端分支核验仍为同一 HEAD；main 和 v1.0.0 tag 仍为 84cbb324a4f63bef094d2c21d70eba841205a7a7。
- Git 状态：三份已跟踪 Markdown 修改、五份新 Markdown 未跟踪，均未暂存/提交；不是 clean，设计草案完整保留。
- git diff --stat（仅跟踪文件）：3 files changed, 14 insertions(+), 3 deletions(-)。新增文件不包含在该命令的统计中。
- 本轮未 push、创建 PR、触发 CI、修改 tag/Release、合并、部署或更改任何安装实例。

## 等待评审

请上级评审推荐架构 A 及其边界。即使架构通过，也须另行批准后续 Runtime 实施 Plan；本轮停止，不自动开始实现。

尚未决定的技术选择包括：最终 Node 安全补丁、构建 npm、Launcher 与安装器工具、安装身份/路径、系统 DLL 处置、Windows 10 版本矩阵、升级/回退和签名方案。
