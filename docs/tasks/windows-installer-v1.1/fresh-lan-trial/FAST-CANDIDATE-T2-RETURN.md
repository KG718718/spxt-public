# FAST V1 — CANDIDATE PREPARATION RETURN / LOCAL PASS

2026-10-15。原 FRESH-T2 正式总 RETURN，代码冻结，等待 Master 总 Review/ff-only/中央 R1C1；Execution 未 push/建 trigger/Hosted/实际安装，未操作本机真实 Firewall/网卡/Registry。生产 Go、业务、Setup 安全逻辑不变；不交付用户包。

- 最终实现源码 `df3e40909289a647afe6eb86e2d08b07137a9cf4`，sourceTree `0d85e7fe1fe9561f9c492acd727f92db6abe1be5`；codeFingerprint `9360c967f306d3d0c3c071d3e10b23cba88ee6bdd1d50dca1f2887a7261ad0ac`。新实现 c9f87b73→40c15c97（真实合入bc52，保留Master及原P0源码祖先）→df3e4090；此后只有报告提交。
- 同一 clean df3e 实际完整 P0：Runtime/Helper/Launcher/payload/ISCC 全 PASS；原13/Fresh2全12/故障反例4、Launcher28/Fresh2、重复unit13/28、Node44 fail0skip0；payload身份重验1049文件/20依赖。固定 Node24.21/Go1.27.1/Inno6.7.3，工具受信任来源及manifest/EXE来源/hash已复核。
- EXE：`E:\CodexWorkspace\outputs\fresh-fast-final-multi-job-47ea1593c55b46528c9500b291c29fb0\setup\artifact\K-SESSION-Fresh-Trial-1.1.0-beta.4.exe`，33,555,937 bytes，SHA256 `e870c5e6a7a8cc13d429dc8c9d858ce086bde43a00b2f387520f606974ee7e6e`。同目录build-info/installer-manifest；programManifestHash `496a39d738a643c5e3fc60dbf248c0c318a14b962d098840cc189edde86682a8`。仅BUILD，不是安装/业务/LAN验收PASS。
- 实际完整构建 Job 在 gate 前 Assign，naturalExit/stderrEmpty/jobEmpty/environmentRestored 均true，forcedTermination=false；受禁stdio文件扫描0。owned构建目录、产物及历史失败保留，未把 memory helper 的 UNKNOWN 当全局恢复PASS。
- 最终根层134/134、fail0skip0、sourceBound=true；已闭合原131中的5FAIL并保留全部用例。新增多失败三个门禁证明全12 TIMEOUT/多UNKNOWN不退回父分类、实际stdin CLI→主报告→outer失败及cleanup writer保留12×8安全信息，额外raw/敏感/重复/矛盾拒绝。另验证TIMEOUT已知true读取保留、未观察false映射UNKNOWN。
- Fast契约10+26/742内存解析2＝12/12；真实通用Job五反例、profile四纯mock门禁均PASS且Master独立核验。单一失败Smoke保持FAIL且耗尽；C1/C2/Q1沿用原槽位，schema2严格绑定新授权、真实local proof/source/hash/codeFP/真实祖先。C2需首FAIL/安全收尾/实际改码；首次PASS后拒跑C2，QA只复用相同Candidate EXE字节及完整原验收，不重构候选。
- Installed Go overlay真实compile/vet、环境恢复PASS（source40c15），对应Go包/模板/生成器blob与最终df3e逐字相同，`FAST-CANDIDATE-OVERLAY-PROOF.json`记录此等价性，不冒称重跑。workflow机器YAML parse、四段inline PS及新增/修改CJS/PS语法、diff-check PASS；未变模块不重复。
- 本地原public runner按Hosted-only guard为15 suites/511 checks、11 SKIP，严格记录FAIL/NOT QUALIFIED（`FAST-CANDIDATE-LOCAL-CORE-BOUNDARY.json`），不伪造GH环境、不称742 PASS。实际Candidate F08仍调用原runner，必须真实26/742、零fail/skip；新解析器只写固定报告，不落stdout/stderr或原始hash。P1—P3实际安装/浏览器/系统恢复及独立QA仍须Hosted。
- 未来Candidate/QA实际bootstrap/CI/finalize/policy/F08 stdio均内存化；保留Master明确允许的 owned Inno `/LOG` 作为固定marker判定输入，不取消门禁、不宣称没有任何内部日志。所有日志/路径/账号/注册表正文继续禁止进入Artifact；F07全局profile状态改为实际前后只读内存比较，未知不写false。

Canonical `FAST-P0-LOCAL-PROOF.json` 现在绑定df3e，SHA256 `432e196492d3530bbafc95f417de62bf0321f500a572b8b9382c6571ce69f888`；根层证明 `FAST-CANDIDATE-ROOT-GATES.json`。2f40/40c15旧proof另存固定版本，所有原EXE/失败目录仍保留。40c15中间完整P0 PASS的EXE为33,555,537 bytes / e31198bc47232bf199bad6b57678a3b46e98595ee498b6e177458ff9fb3eef5e，不能替代最终df3e证明。

实际构建命令为 `pwsh -NoProfile -File tools/windows-installer/fresh-trial/local-p0.ps1 -Root <上述new-owned根> -Node <固定Node24.21> -GoRoot <已核验公开Go1.27.1> -Compiler <原固定hash的inno/compiler>`；根层使用 `check-root.cjs`，额外模块使用固定Node `--test fast-delivery/*.test.cjs`，Job/profile使用相应 `.test.ps1`（只模拟fixture，无真实Net变更）。最终代码相对bc52净29文件；未经Review不触发。Candidate0/2、QA0/1仍未用；旧Smoke/R3/Full/U27/LC01所有FAIL/预算不改。
