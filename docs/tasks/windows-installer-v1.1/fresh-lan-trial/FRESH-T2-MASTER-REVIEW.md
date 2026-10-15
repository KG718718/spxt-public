# FRESH-T2 — Master 独立 Review

日期：2026-10-14。结论：REVIEW PASS / CANDIDATE BUILD AND VALIDATION READY；不是 Hosted PASS 或客户交付批准。

原长期 Execution `01a13948-7433-7571-8330-a09bfd12a0dc` 已主动向唯一 Master 正式 RETURN，目标已核验。工作树 bea7、任务分支 codex/fresh-t2-installer-ci；最终受审提交 `a767d1013de2296aa4e0c76f716749202ada3e0c`。仅整合其自有 `008e87c`、`a84953b`、`a767d10`；T1 映射依赖不重复整合。原工作树及 .test-work 保留。

## 范围及安全结论

- Fresh 构建入口、只读安装前拒绝、per-user 登录启动项、编译 profile、安装态测试和独立 workflow 属获批范围。appVersion=1.0.0、dataContract=1、原业务 schema 和旧身份/事务/rollback 文件未改。
- 标准 ISS 预处理与 0eee621 的历史源码逐字相同（只规范 CRLF）；旧 F3 接受规则不用于 fresh 构建。新增 fresh 模式不接受已有登记/Binding/instance/非空或未知目标及 user/common 同名快捷方式，不能覆盖或迁移原数据。common namespace 的新增拒绝只有源码合同证据，不称真实安装实测。
- 原 38 项 Runtime 源闭包保持；现有模块 marker 在哈希前精确派生，manifest 保存可逆来源锚，Launcher/helper linker profile 三方核对。原 13/28 和新增 tagged overlay 分开执行；没有以 GUI 静态检查冒充第二 Launcher 真机证明。
- F05 使用实际安装的 Runtime、Launcher 和 Node，先验证 image/TCP/parent/唯一后台，再进行 Admin 配置 UI、两个独立登录、员工项目及正式关联附件；重启后由同员工验证数据和附件。无仓库 server 或 discovery 注入。
- 两阶段报告严格区分实际失败与待外层清理；全部 F01—F09、固定 Setup 诊断、COMPLETE/PASS 工具状态、真实 source/execution outcome 和所有 owned cleanup 全部确认才生成最终 PASS。未知字段、敏感字段、失败、占位和未知清理不可转换为 PASS。
- Firewall 的 Persistent/Active/cleanup 共用精确字段及 filters 检验，未知或变更规则不删除。Compiler 固定 hash/验签、原生 portable 私有目录与完整 owned inventory；前后登记/关联/快捷方式快照相等。SUBST 仅撤销已证明本轮创建且仍相同的映射，Artifact 先转存物理路径，失败只发布白名单 JSON。
- 独立 QA 下载并核验 Candidate 同一个 EXE，source 与控制提交分开，不重新构建客户程序。push-only 独立路径、C1/C2/C3/QA1 单次槽位、attempt=1、45 分钟 job 与 35 分钟执行 step；旧工作流不触发。

## Master 实际独立复验

在最终受审 a767d10 工作树执行 Fresh 112 + 原 beta.4 compatibility 20，共 132/132，fail0skip0；包含实际 mock PS filters、固定中文 UTF16/UTF8 协议、未知清理/敏感字段/失败不得复活反例。Go1.27.1 离线执行日志编码纯测试与两项 fresh Launcher 测试 PASS；完整安装态 overlay 仅 test-c 编译与 vet PASS，未执行安装态或产品 EXE。全部 fresh CJS syntax、PowerShell AST parse、diff-check PASS。固定 yaml2.8.1 在主控私有 .test-work 严格 uniqueKeys 机器解析及 push/branch/单 job/45min/always 图核对 PASS；工具不进入 payload。

T1 生产部署改动的独立复验和授权前 bind 返工见 FRESH-T1-MASTER-REVIEW.md。原本地 core 的 Hosted-only SKIP 与既存文档标签 FAIL 不改写为 26/742 PASS；文档标签仅治理概括修复，文档 8/8 PASS。旧 beta.3 静态 regex 基线 FAIL 保留。

## 未验证与后续准入

本地无受验 ISCC，真实 ISS 编译/API/ABI及全部实际安装行为 NOT_RUN；只在获批 Candidate BUILD/F01—F09 内验证。完整 26/742、Artifact privacy 和独立 QA 未运行。GUI/UAC、物理 Private 网卡、真实 Firewall 授权、双物理设备、实际 Windows 登录及第二 Launcher GUI 均 HUMAN_PENDING。

整合后核验对应文件及本地/origin/GitHub HEAD 一致，仅触发新 Candidate C1。账本当前 Candidate0/3、FinalQA0/1；旧 Full/U27/LC01/Diagnostic0。任一 Hosted 失败先核验固定证据；Runner 隔离/收尾无法证明即依 STOP5 停止，不能因剩余预算自动重跑。原历史 FAIL/DEFERRED、正式 F3 beta.2 单机基线、旧分支/工作树及 main/tag/Release 均保持。
