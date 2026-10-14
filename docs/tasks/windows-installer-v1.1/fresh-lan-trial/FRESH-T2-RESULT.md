# FRESH-T2 — 正式 RETURN

日期：2026-10-14。状态：RETURNED / MASTER REVIEW PENDING；不是 Hosted PASS，也不是最终交付包。

公开工作树 `E:/CodexWorkspace/CodexWorktrees/bea7/public-source`，分支 `codex/fresh-t2-installer-ci`，基线 `0eee621`，origin `KG718718/spxt-public`。只执行源码、合成反例、离线 Go 测试/编译及语法验证；Hosted/Candidate/QA 使用均为 0。无 push、trigger 文件/提交、真实本机安装、客户产品 EXE 执行或 Registry/Firewall/网络配置修改。未访问内部 SPXT，旧 FAIL/工作树保留。

## 提交边界

T2 自有前序提交：`008e87c`、`a84953b`；最后代码提交见本文件所属提交，报告治理后续单列。T1 已批准依赖本地映射：`93b2ee7` ← e91b41e，`3b54854` ← 2f43a52，`6733e72` ← cfaf95c，`86cc0b8` ← 4e5e20a，`1f0ec54` ← 1b451b1，`e92a79a` ← 79d9355。Master 不应重复整合 T1；T2 改动应以自有提交或按路径审查整合。

## 完成内容

- FreshTrial 独立 build entry、fresh-only ISS、只读拒绝登记/Binding/已有 instance/非空或未知目标，以及 user/common 桌面、开始菜单、Startup 同名冲突。common namespace 不写、不删，只做源码合同验证，未冒充实测。
- 原 38 项 Runtime 闭包保留；现有模块 marker 在清单 hash 前精确一次派生，Launcher/helper fresh linker 身份三方一致；标准 ISS 预处理与基线完全相同（CRLF 规范化）。旧 F3/升级/故障模式不进入 fresh build。
- 原 13/28 与新增 tagged 2/2 分开；fresh test fixtures 用 byte-preserved `.go.in` overlay，不降低旧静态数量。
- 安装态 Hosted Go overlay 验证实际 Setup、installed payload、Launcher/Node/锁/事件、持久配置及数据、同员工项目和归档附件重启 readback；实际 installed browser 两独立 contexts，不启动仓库 server、不预填配置、不伪造物理信任。默认 `--logon` 抑制未知 ShellExecute。
- F01–F09 严格固定报告、Setup 七次调用的退出/白名单 marker/阶段诊断、编译错误白名单、源/控制提交与 EXE SHA 绑定。最终 PASS 必须 buildDiagnostic=COMPLETE/PASS，全部实际门禁和所有 owned cleanup 成功；未知、真实内层失败、外层失败不能复活为 PASS。
- firewall reject + controlled narrow rule，同一实际校验器贯穿 Persistent/Active/cleanup 全过滤器；变化/未知规则不删除。UTF16 命令与 UTF8 JSON 固定协议保留中文路径并拒绝 stderr。
- push-only 单路径触发、一次 attempt、C1/C2/C3/QA1 once-only slot；从当前 run 的 workflow_id 查询预算历史，不依赖默认分支已存在 workflow。QA 下载固定候选 Artifact，同源同 EXE，不 rebuild。
- 两阶段 always 收尾：私有 completion 区分实际失败与待外层收尾；先严格验证再物理路径转存 Artifact/report，仅撤销确证自己创建且仍相同的 SUBST。final 使用物理副本、真实 source/execution outcome；失败仅上传严格固定安全 JSON。
- 固定已验签 compiler `/PORTABLE=1` 私有目录，完整 owned hash inventory 删除；用户/双 registry view/关联/快捷方式环境前后相等，未知保留并失败。无本地 compiler 执行。

## 本地证据

- Fresh Node：112/112，fail0skip0（其中所有权文件、实际 PS rule validator 的 mock filters、UTF8 中文协议、失败不能转 PASS 等均为本地合成或 stub）。
- 原 beta.4 compatibility：20/20，fail0skip0；标准 ISS 等价包含在 Fresh suite。
- Go1.27.1：安装态完整 overlay `test -c`、`vet` PASS；纯安装日志 UTF16/UTF8 等价及两项 fresh Launcher tests PASS。实际 installed test 未运行。
- Firewall 原 13 + fresh 2：各组 PASS，fail0skip0。Launcher 原 build 固定 selector 28/28 与 fresh 精确 selector 2/2 PASS，均 fail0skip0。
- CJS 全部 syntax、fresh PS 全部 AST parse、diff-check PASS。Master 已补严格 YAML uniqueKeys/graph/branch/push-only/45min 机器解析；随后 workflow 未改。
- 保留验证过程：一次本地测试编排目录名违反纯 fixture 规则，修正执行目录名后通过；一次错误的 Launcher 整包选择包含需 Hosted payload 的旧 integration，因环境前提缺失 FAIL/SKIP，未执行安装；最终只采用原 build 固定 28 selector，未改测试或降低条件。新增源码反例曾语法/切片范围失败，修正反例后全组112通过，不掩盖这些尝试。
- 原 beta.3 static builder regex mismatch 属基线既存（Master 确认同 blob）；product-docs LC01 标签的治理修复由 Master 集成，不在 T2 改旧 SPEC。未宣称本地26/742完整PASS。

## 尚未证明

本地无受验 ISCC，真实 ISS 编译 NOT_RUN；Candidate BUILD 才验证实际编译/API/打包。全部实际 F01–F09、26/742、Artifact privacy、独立 QA 待 Master Review 及中央批准预算执行，本 RETURN 不构成 Hosted 准入批准。安装程序宏与 WinAPI Pascal ABI 的实际 compiler 行为尚未证明。

真实 GUI/UAC、首次明确 LAN 授权、合格物理 Private adapter、必要防火墙授权、物理第二设备、实际 Windows 登录及第二 Launcher GUI 全为 HUMAN_PENDING。持久端口合成 binding 明确 enabled=false；isolated socket 为 installed request gate + synthetic discovery，不能冒充生产物理 LAN 认证。原升级/卸载重装/LC01/U27 FAIL 且 DEFERRED 保留。Runner native uninstall 只用于 owned 测试收尾，不升级为旧卸载重装验收 PASS。

任何未知进程/锁/登记/规则/快捷方式/工具或 drive/env 收尾均 fail closed，只有已验证自身对象允许收尾；Master 遇安全/架构/权限冲突应依 AUTONOMOUS-AUTHORIZATION STOP，不追加预算。
