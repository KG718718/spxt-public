# FINAL DELIVERY CLOSURE V1 / FRESH-T2 正式 RETURN

2026-10-17。本轮物理路径观察修复、受控反例及同源完整构建 PASS。真实产品安装和早期原生安装失败的完整恢复仍 NOT VERIFIED；不能称 P0/P1/P2 三项实机交付闭合。Execution 本回单后冻结，由原 Master 独立 Review/整合，无 Hosted 或 QA 准入。

## 来源与修改

原公开 origin、原 bea7 和 `codex/fresh-t2-installer-ci` 已核验；tracked clean、原 `4f8f32d8` 为 ancestor 后，ff-only 至授权 `ceaeed701874feff5005fe7c8ff92293ad0f9a85`。未知未跟踪现场、实际 trigger 与全部历史 FAIL 保留。

- 实现：`283cfe6b251d40d3fb691fbd6e7a04e0775c0790`。
- 权限/目录身份反例补充：`98f99aa1f33ad80b4459a23f2518a7fb773ce0a9`，亦为最终受测与实构建 source。
- 实现树：`09f0083e2f922fa76187050aca8cc0169b44d774`。
- 完整代码指纹：`e6f357c493399a4425091efeed3ff5c5680abb32260022ef3b3bd6a01314aa91`。
- 后续仅报告提交；不把报告 SHA 冒充实构建 source。

P0 不再以可解析别名等同可信 physical work。新内存 binding 验证隔离 owner 收据、run/drive/ExpectedTarget 与实际设备：created=false 仅接受真实 HarddiskVolume/CANONICAL；created=true 必须精确匹配本轮受控 SUBST。保存物理设备及目录文件身份，前后复读 current path 身份，拒绝映射变化、reparse、缺失或权限未知。目录句柄不能被假定为跨版本禁止 rename；实际反例验证 rename 后 FileID/路径绑定拒绝，再仅对同一已证 owned 目录恢复。

compiler 前后 observer、工具链 snapshot/remove 均使用已验证物理根；两个工具链命令使用物理 Node，保留原 pin/清单/无未知文件删除条件。映射不一致时不执行工具链清理。supervisor 和 finally 写报告前单独复核 physical directory 身份；报告写入物理根，句柄在结束后关闭。早期绑定缺失或物理目录未知时拒写该未知根并保持失败，由原外层 fail-closed 收尾处理。

P1 复用原审查过的真实 Inno/COM harness，增加独占锁导致真实 `VERIFY_EXCEPTION` 的固定反例，现为 schema2/15场景。原 schema1/14场景历史 fixture 仍严格可读。`CreateFreshStartup`、`FreshStartupMatches`、Fresh `DeinitializeSetup` 均原函数提取；只有固定目录常量映射，无产品 Setup 安装。未发现可证的普通生产缺陷，生产身份谓词与实现不修改。

P2 保持完整安装卸载 callback 仅在原 F02 全身份验证后赋值，没有提前调用以采纳未知资源。新增六类资源的 owned **文件替身**早期失败测试：独立有生产者 receipt 的文件可精确清理；同场景无 receipt 的部分输出即使失败后读取 hash 也不获清理权，保全并保持 OWNERSHIP_UNKNOWN；缺前态保持 OBSERVATION_FAILED。它们不是产品登记或真实安装恢复证明。真实早期 native Setup 尚无足够生产者 receipt 的缺口明确保留。

本轮实际 trigger 已存在，wiring 测试改为验证保留的历史 IC1 来源，而非删除 trigger 获取“文件不存在”PASS；原准入合同、已消耗 IC1、旧预算、workflow、生产 Setup/Launcher/Firewall/Runtime、身份/事务/rollback 均零 diff。

## 本轮实际重新执行

| 验证 | 本轮结果与边界 |
| --- | --- |
| 物理路径/受控 SUBST | 26 PASS，fail0/skip0；精确映射创建、变化拒绝、未知 owner 拒绝、缺失、reparse、真实锁拒读、恢复异常、映射移除 |
| 目录替换 | 实际分支 `RENAMED_AND_IDENTITY_REJECTED`，不是假称 OS 拒绝 rename |
| 权限拒绝 | 只读边界注入 `UnauthorizedAccessException`；固定 UNKNOWN、不执行物理 Node。没有修改真实 ACL，不将 sharing violation 写成 ACL 实测 |
| 实际 Inno/COM | 15/15，含原14及真实锁触发异常；固定具体首因/阶段/cleanup 断言，worldUnchanged/environmentRestored=true |
| Windows Go overlay | 7 顶层/32 子项 PASS，fail0/skip0；包含新增早期六资源文件替身、实际生产者 INI 读取与原恢复反例；未执行 installed core |
| Go vet | 同一实际 Windows overlay PASS |
| PS 恢复/finally | 原22反例、实际 CI finally AST 的7反例 PASS，fail0/skip0；真实规则/登记写入=false，finally 环境恢复=true |
| Root CJS | 134/134 PASS，fail0/skip0，sourceBound=true |
| Candidate wiring / R2 CJS | 新 wiring 17 PASS；原 R2 28 PASS。Master 又独立在最终 source 复核45/45及 root134 |
| LAN / 公开权限 | LAN50/50、权限策略47 PASS；合成/隔离本地单元范围，不是安装后业务验收 |
| 完整 P0 | 最终 source 真实 Runtime/Helper/Launcher/payload/ISCC 构建 PASS；原 Helper13/Fresh2（含12场景断言）、Launcher28/Fresh2、Node44、1049文件/20依赖 PASS |

路径、链接、Go、vet、PS、LAN 的独立 Job 均自然退出、stderr空、管道/句柄关闭、Job empty、无强制终止。受控映射已精确核验移除；P0 naturalExit/jobEmpty/environmentRestored=true、forcedTermination=false。固定报告不含 raw/stdout/stderr、物理路径、PID、账户或网络细节。生成的本地 source/owned fixtures 保留供 Review，不作为可上传诊断报告。

Master 已独立反馈最终 source 的 CJS45/root134、实际 path26、Go7父项和 link15/源码 manifest 逐字节复核通过；无生产/安全放宽及返工项。完整实构建仍以本轮 `LOCAL-BUILD.json` 为准。

开发阶段保留三次失败：两次“目录句柄必阻止 rename”的错误测试假设导致 FAIL，均未创建 SUBST，受控输出目录保留；一次 owned GOTMPDIR 未创建导致 Go 启动前 FAIL/测试未执行，补齐新 owned 环境后实际重跑7父/32子PASS。旧失败输出不删除、不改写为PASS；最终 source 的上述门禁均 fail0/skip0。

## 本轮真实构建身份

- 文件：`K-SESSION-Fresh-Trial-1.1.0-beta.4.exe`，未安装、未执行产品。
- 来源：`98f99aa1f33ad80b4459a23f2518a7fb773ce0a9`。
- 字节数：`33553047`。
- SHA256：`98849d369d37cf9a4e63764ac51e40c451cce942c34115f2778e34be7fe28597`。
- programManifestHash：`b0afc65e8ad3d1d4815d8cec7b702f7acbd946ae6ced0454d981a6b91fd0ce50`。
- `LOCAL-BUILD.json` 原始安全证明 SHA256：`10530a6ff102ec0ff3119a91d3a96148639dbe166bb3e4010f68c423400a3128`。
- 资格：`BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE`。实际本地 EXE/证据位置已通过原 Master 私有回单提供，固定诊断不嵌物理路径。

本轮证据：`LOCAL-BUILD.json`、`BUILD-IDENTITY.json`、`LOCAL-GATES.json`、`LINK-PROOF.json`、`PAYLOAD-PROOF.json`。已核对实际 EXE 字节/hash、build-info/sourceTree 与真实链接源码 manifest；报告提交仅文档，代码指纹保持。

## 沿用历史与未验证项

Run39005740755 的 ENV/CLEANUP_UNPROVEN、compilerOwnedFiles OBSERVATION_FAILED 仍 FAIL；其实际映射类别未记录，不能追认本轮修复为历史唯一根因。Run38767500533 的 F01/登录启动项首因仍 UNKNOWN。旧 Win10 rules QUERY_CIM_FAILED 仍 NOT_PROVEN，本轮没有新增真实规则探测，也不将 stub PASS 代替真实规则读取。

没有安全隔离且获授权的真实产品安装环境：完整 fresh 安装、早期 native 失败后的逐项实际恢复、安装后浏览器业务、物理 LAN/UAC/登录启动/双启动仍 NOT VERIFIED。原核心26/742有真实 Hosted/local skip 条件，本轮未伪造 GITHUB_ACTIONS、未改 skip/期望值，保持后续必要门禁 NOT VERIFIED。

早期 native 无 producer receipt 的资源不能盲 uninstall/delete，完整失败安装恢复未证是停止风险，不因本地文件替身通过而消失。最小后续验证建议是另行批准一个已证明可销毁、隔离的 Windows 环境，对同一 EXE 做实际安装及早期失败逐资源恢复；这些前提闭合后才由用户另定 Candidate/同 EXE QA 预算。本轮不创建 VM、研究解包或自动申请/使用预算。

新增 Hosted/QA 预算0，实际触发/重跑/push0；QA冻结，已消费 IC1与全部旧FAIL/预算不变。不改 main/tag/Release，不访问内部 SPXT，不清未知内容。原树、提交、owned 输出和失败证据全部保留；统一 RETURN 后 Execution FROZEN。
