# FINAL A/B ACCEPTANCE COMPLETION — Master 独立 Review

结论：**本地工程准入 PASS；Hosted 冻结；实际安装与 LAN 未验。** 原 Execution 正式 RETURN 5983cf89c5820ebee5feeec5fd4fc988dd97e89e，受审及完整构建 Source d8222780953bed685ccd0f4f5a3e82571b9e5bf2。

1. **B 已具备真实中途失败验证入口，真实 Setup 尚未执行。** 同一正式 EXE 在原生安装开始、创建 uninstall 子目录时，由精确 owned 空目录的非继承拒绝权限触发失败；文件探针仍须通过。实际验收必须同时取得严格原生阶段、错误 5、退出 4、回滚、自然退出、句柄关闭和独立恢复回读。私有 Windows 机制及反例通过，不冒充真实 Setup，也不覆盖复制或 Startup 创建后的任意深层失败。

2. **A/B 工作流、来源合同、CI/Supervisor/schema3、外层恢复与最终聚合已接齐。** A 首个 Setup 为 FRESH_ACCEPT，承担 F01—F09、安装后浏览器业务与核心 26/742；B 保留五项拒绝及原生失败恢复。恰好两个标准 Windows Job，B 不重建。Master 只在当前 Run 与两个 Job 全部 completed/success 后校验不可变证据并聚合；无第三个 Windows 聚合作业。以上实际 Hosted 行为本轮均未运行。

3. **同 EXE 已做完整本地字节传递验证。** 本次实际构建 EXE、Source、Tree、Manifest 和所有传递文件经 A→transfer→B 复核；错误 Source、A Job、Manifest、额外文件及 EXE 篡改均拒绝，原 build 未改变。传输身份使用合成元数据；不是实际 GitHub A/B 下载证明。未来 B 必须按 A 的确切 Artifact ID、同 Run/control/source 与 ZIP digest 核验。

4. **原安全门禁保持。** 生产、旧合同、历史 FC1/2/3 和账本未改。Master 独立 CJS 115/115、Root 146/146、聚合 20 个拒绝、日志 9 个拒绝、私有目录 10 项均 PASS；Execution 全 Fresh 302/302、Go 11 父/43 子、vet、PS7/实际 PS5 各 52 PASS。适用 Job 自然退出、管道/句柄关闭、empty、无强杀，Master 环境及 P0 环境恢复通过。A 仅对缺失的最小父结构预持有创建回执，产品/Binding 叶仍缺失；预存或未知内容不接管。原对象句柄删除防止路径替换，不宣称任意并发内容比较与删除原子化；适用隔离 Job 内已停止的受控写者。原 301/302 失败、未采集 Job、文件 symlink 创建 EPERM 和旧历史 UNKNOWN 全部保留；junction 与 ZIP 元数据反例单列，未伪造 symlink PASS。

5. **完整本地 EXE 构建 PASS，仅 BUILD 资格。**

   - Source：`d8222780953bed685ccd0f4f5a3e82571b9e5bf2`
   - Tree：`9f4bfdf8a7ba936f7708f1ec01dc0c1987742e67`
   - EXE：33,567,058 bytes；SHA256：`c781aa2712ef749d4a4572581db52ddb4fba9825b7dc63365cbd8abd34bc7ede`
   - Payload：1049 文件 / 147,923,786 bytes / 20 生产依赖，全部字节、Manifest、生成 ISS 与 sidecar 独立一致。
   - Node 24.21.0 / Go 1.27.1 / Inno 6.7.3；appVersion 1.0.0 / dataContractVersion 1 不变。

6. **可提交下一次完整 A/B Candidate 的预算申请，尚不能执行。** 当前新增 Hosted 0，旧 Candidate 耗尽，原独立 QA 0/1 冻结；没有新 trigger、Hosted 授权文件、运行预留或用户安装包。下一次需用户另行批准 1 次完整 A/B Candidate（同一 Run、2 个 Windows Jobs），绑定本次 Source 与 Review，并在新 Runner 实时完成来源、隔离、所有权和恢复前检。实际 Setup/B 原生恢复、安装后业务 26/742、物理 LAN、用户授权及 QA 尚未验证，不称 PASS，不 main/tag/Release。

本轮仅非 force 同步开发分支后 STOP。

原生机制依据固定 Inno 6.7.3 的 [安装顺序与回滚实现](https://github.com/jrsoftware/issrc/blob/is-6_7_3/Projects/Src/Setup.Install.pas)及[日志记录格式](https://github.com/jrsoftware/issrc/blob/is-6_7_3/Projects/Src/Setup.LoggingFunc.pas)；Job 隔离依据 [GitHub 标准 Hosted Runner 合同](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)。上述源码与平台规则不替代本次尚未运行的实际安装证据。
