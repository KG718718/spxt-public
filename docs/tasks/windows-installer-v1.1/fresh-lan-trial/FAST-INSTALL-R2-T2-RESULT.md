# FAST-INSTALL-R2 / FRESH-T2 正式 RETURN

2026-10-16。本轮本地实现、反例与完整 P0 构建 PASS；实际安装 NOT_RUN，历史 F01 根因 UNKNOWN，真实规则读取 NOT_PROVEN。本回单不构成安装、LAN 或 Hosted 准入。Execution 此后冻结，交 Master 独立 Review 与整合。

## 来源与范围

- 授权：`FAST-INSTALL-R2-AUTHORIZATION.md`；原 bea7 工作树与 `codex/fresh-t2-installer-ci` 分支复用。
- 基线：`1a9b924823d43444ded72914174da832c7f5e2a3`。
- 唯一实现：`4e7f58e8341bc69822570838a1716667fb8e654b`，33 个代码/测试文件；本回单及配套 JSON 为后续报告提交。
- 源码树：`e85f572f2414222deb67dd15d4bb14a32df7cd14`。
- 排除 docs/AGENTS/PROJECT 的代码指纹：`5cbd9328c544deae26d2fa9016824db44bb915361968346a361f8af9dfeb6acb`。
- 全程新增 Hosted/Actions/trigger/push 为 0；未创建 Thread/worktree/sub-agent，未修改 workflow、旧预算、历史证据或历史结论。

## 已完成的实际修改

1. Fresh Setup 增加固定枚举阶段、首个失败与独立 cleanup 诊断。保留原目录/文件属性、非 reparse、完整 hash 与 COM Target/Arguments/WorkingDirectory 谓词及无覆盖写入顺序。生产改动仅诊断，不宣称修复了历史 F01。
2. 在 Setup 前注册逐资源观察与收尾，区分 ProductKey、Binding、Startup/Desktop/Programs、程序文件、编译器文件/设置、全局注册表与两类规则存储。仅可靠前后状态或生产者 receipt 可以证明恢复；无 receipt、部分写入、外来替换与读取失败均保持 UNKNOWN 并保全。没有把未完成安装交给宽泛卸载/删除处理。
3. 测试自建文件使用写入前无占用证明、独占创建、完整写入/关闭与精确内容 receipt；退休 receipt 必须复读，路径被重新占用即拒绝清理。Startup receipt 读取生产者 INI，不能以失败后自算 hash 追认所有权。
4. 当前流水线完整接入 schema 2：早期 ENV 失败、实际 CI finally、Go core、hosted reader、finalize 与 artifact verifier 均拒绝缺失或旧版新报告；历史 schema 1 保留严格读取，不修改历史 FAIL。最终报告分别证明资源，不把一个聚合 false 解读为每项均有残留，也不把无执行默认当恢复 PASS。
5. 新增 owned Inno/COM driver：提取受审真实函数及 Fresh Deinitialize 分支，仅映射六个固定目录常量，在新 owned 输出树运行。无真实 Startup/Desktop/Registry 写入，无产品执行。

## 本地证据

| 项目 | 结果与实际范围 |
| --- | --- |
| Root CJS | 134/134，fail 0 / skip 0，绑定实现 SHA |
| R2 CJS | 28/28，fail 0 / skip 0，包含当前入口拒绝旧 schema 与错误首因/阶段反例 |
| Windows Go overlay | 6 顶层、26 子项 PASS，fail 0 / skip 0；编译实际 installed core，但仅执行选定安全测试 |
| PS 资源恢复 | 22 PASS，fail 0 / skip 0；双规则存储与异常读取使用隔离 stub，不写真实规则/注册表 |
| 实际 CI finally AST | 7 个依赖故障反例 PASS，fail 0 / skip 0；环境恢复，未运行实际安装 |
| LAN / 权限 | LAN 50/50；公开权限策略 47 PASS；不等于已安装浏览器业务验收 |
| 实际 Inno / COM | 14/14 固定场景；独立验证具体失败阶段/首因/cleanup 证据，非仅验证返回 false |
| 完整 P0 | Runtime、Helper、Launcher、payload、ISCC 实际构建 PASS；Helper 原13/Fresh2、Launcher28/Fresh2、Node44，1049 文件/20 依赖身份核验 PASS |

完整构建、Go 与 Inno driver 的受控进程均已自然退出；对应 Job empty、管道/句柄关闭且无强制终止。P0、Inno、CI finally 的环境恢复已证。Master 另行反馈独立 root134、CJS28、Go Recovery5顶层、PS22/finally7 与相关 Job 检查通过；最终准入判断仍由 Master 独立完成。

Inno 场景覆盖 baseline、缺失/错误 hash、缺失/目录 link、COM 三字段各自改变、已有 link 拒绝、INI 写入失败后的 owned cleanup、匹配 cleanup、外来改变保全、原生 MoveFile 无覆盖、锁定删除失败保全。matrix、driver、scope、真实源函数指纹见 `FAST-INSTALL-R2-INNO-PROOF.json`；已核对实际源内容与实现提交相同。原始函数在本机 owned baseline 也已通过，不能据此归因历史 Hosted。

## 实际 EXE

- 来源：`4e7f58e8341bc69822570838a1716667fb8e654b`。
- 文件：`E:\CodexWorkspace\outputs\fresh-install-r2-p0-90ad468326c74e9db59692459c4cb45f\setup\artifact\K-SESSION-Fresh-Trial-1.1.0-beta.4.exe`。
- 字节数：`33554844`。
- SHA256：`1b4e7723d3f1b6d466bc78cdaed25d63a8eed9c87782efe64dcea41af7ac9111`。
- programManifestHash：`06aeb1ab96ed81d3cd5b184a7faf7990a73a5f023a76520b66e4d125c79bb3e3`。
- 资格：`BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE`；未安装、未执行产品 EXE，不作为可交付用户包。

## 未证明事项与保留停点

- 历史 R1C2 Run38767500533 / attempt1 的 F01 INSTALL_FATAL、PREINSTALL_READY + FRESH_STARTUP_CLEANUP_UNKNOWN 仍 FAIL，具体首因 UNKNOWN；没有追认本轮局部改动为其唯一根因。
- 没有可证隔离的实际产品安装环境，因此 fresh 安装、安装后浏览器业务、核心 26/742 与完整失败安装恢复均 NOT_RUN；早期无生产者 receipt 的部分资源保持 OWNERSHIP_UNKNOWN/PRESERVED，不称全恢复 PASS。
- 本机真实规则只读 collector 返回 QUERY_CIM_FAILED，前后状态 OBSERVATION_FAILED / NOT_PROVEN；未证明权限或服务是原因，未改变服务、权限、网络或规则，未继续探测。严格 stub 与状态传播通过不能替代真实规则快照证明。
- Candidate 2/2 已耗尽，独立 QA 0/1 冻结；本轮 Hosted 0，旧 Smoke/R3/Full/U27/LC01 等 FAIL 与 UNKNOWN 全部保留。本地 P0 PASS 不恢复任何 Hosted 预算。
- 原工作树、`.test-work`、owned 输出、提交与失败证据保留；不做未知清理，不触及 main/tag/Release/内部 SPXT。

固定安全证据：`FAST-INSTALL-R2-LOCAL-BUILD.json`、`FAST-INSTALL-R2-PAYLOAD-PROOF.json`、`FAST-INSTALL-R2-INNO-PROOF.json`、`FAST-INSTALL-R2-LOCAL-GATES.json`、`FAST-INSTALL-R2-READONLY-RULES.json`、`FAST-INSTALL-R2-EXE-IDENTITY.json`。未覆盖旧 FAST V1 本地证明或运行账本；原始进程 stdout/stderr 不落盘。
