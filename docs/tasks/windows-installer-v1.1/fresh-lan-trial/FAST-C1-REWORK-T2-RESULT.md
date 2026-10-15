# FAST V1 — C1 REWORK / T2 RETURN

2026-10-16。LOCAL PASS；原 FRESH-T2 正式 RETURN 并冻结，等待 Master 独立 Review/整合/中央决定。未 push、trigger、Hosted、安装或运行产品 EXE；没有本机真实 Firewall/网卡/Registry 修改。

已确认：最终实现 `57b7df4e6f914000ba7d13579b758b8f12f9274e`（51efe216 + 57b7df4e），sourceTree `8dd2a31c5b0ecc70aa1fbe318949ccde35aab0db`，codeFingerprint `6fd6228c915bd2280d5f204bd7d205252085a13e2f63fe27fc523b90a8605f1f`。相对 Master 基线 b47270f0，代码仅 `tools/tests/fresh-lan-trial/fresh_behavior_windows_test.go.in` 一文件；生产脚本、原13、Go业务、Setup安全、workflow和trigger未改。之后只有报告提交。

- 正常驱动采用原13的 system WinPS 直接 `-Command` 协议；保留显式窄环境与20秒期限。最终完整 argv 用 Go `syscall.EscapeArg` 逐项生成，再把同一串设置到 `SysProcAttr.CmdLine`；执行前验证含终止NUL的UTF16长度≤32767，另保留脚本30000保守界限。
- 会话显式禁止模块自动加载；通过引擎API只枚举Function及Alias，要求唯一正确名称、无Alias、内联无File来源、参数与正文整体SHA256匹配。仅LF/首尾空白规范化；新辅助函数参数在函数体显式param内。正常路径不依赖 Get-Item/Test-Path/Remove-Item。原harness和生产脚本继续直接组合执行，事件改用.NET写出同一固定JSON语义。
- 最终同源本地：Fresh2/全部12、counter父测试及15子项、vet均PASS，fail0skip0；根层134/134、sourceBound=true。原4反例保留，新增11项覆盖旧provider失效与新方法正常完成、受控模块发现阳性对照、None下模块不可用、wrong body/参数/alias/file绑定、真实native启动失败、5秒受控阻塞、18条固定事件协议等价。错误绑定与alias只指向隔离sentinel；缺失/错误绑定显式验证无模块sentinel加载且无mutation。5秒仅用于超时反例，正常20秒未放宽；反例进程被期限终止，外层Job仍自然完成且为空。
- 最终 clean 57b7 实际完整 P0：Runtime、Helper原13/Fresh2+12/15反例、重复Helper13、Launcher28/Fresh2、重复Launcher28、Node44、payload身份1049文件/20依赖、ISCC均PASS；固定Node24.21/Go1.27.1/Inno6.7.3。Job gate前Assign；naturalExit/stderrEmpty/jobEmpty/environmentRestored=true，forcedTermination=false。
- EXE：`E:\CodexWorkspace\outputs\fresh-c1-rework-final-p0-937b1007448f46c9943972d5525439ab\setup\artifact\K-SESSION-Fresh-Trial-1.1.0-beta.4.exe`；33,556,103 bytes，SHA256 `7af35ddda3f1b095cb9c9d9f2ebdd3beaab8d67232ced4c484af79ee8b7a242e`。programManifestHash `c4f696c6f518d9175fdd3063da07bf46cd80c4ad16aca0ff15c5713652b3920d`。只具有 BUILD_ONLY_NOT_INSTALLATION_ACCEPTANCE 资格，不交用户包。
- 严格15键 canonical `FAST-P0-LOCAL-PROOF.json` 绑定57b7，SHA256 `89e72b4c1d8eb8d8f607be188a39b24f6022ceb279cc1fdd06e7350d2bee34bb`；旧df3e proof归档为 `FAST-P0-PROOF-DF3E4090.json`。本轮safe报告：`FAST-C1-REWORK-ROOT-GATES.json`、`FAST-C1-REWORK-LOCAL-GATES.json`、`FAST-C1-REWORK-JOB-SCOPE.json`、`FAST-C1-REWORK-DELTA.json`。
- 完整构建报告位于 `E:\CodexWorkspace\outputs\fresh-c1-rework-final-p0-937b1007448f46c9943972d5525439ab\p0-result.json`、`worker-state.json`、`portable\artifact\fresh-payload-report.json` 及 `setup\artifact\build-info.json`；本地Go受控报告位于 `E:\CodexWorkspace\CodexWorktrees\bea7\public-source\.test-work\c1-rework-overlay-7663f72ac45b4a3f8dc89f34b251c1ed\final-local-gates.json`、`final-scope.json`。stdio只在内存处理；Artifact白名单未放宽，未加入raw内容。
- 51efe中间完整P0亦PASS，33,555,779 bytes / `4e4169609ef9a30a90af7e004166faccf11d4ffbad0ccdcbd820a33b22e6f8d7`，保留在 `E:\CodexWorkspace\outputs\fresh-c1-rework-p0-19056d02c9464873a859a0020af702bf`；不能替代57b7最终资格。所有原.test-work、旧EXE及失败证据保留，未reset/clean。

历史已确认事实：C1 Run38758814656/attempt1、Artifact11984418940依然FAIL，12场景TIMEOUT/内部观测UNKNOWN；cleanup10/10true。实际失败报告、真实祖先、代码指纹差异已用现有firstFailure契约离线验证PASS。Candidate1/2已用、剩1次，QA0/1仅Candidate完整PASS后；旧Smoke/R3/Full/U27/LC01及诊断额度不变。

基于证据的判断：已证明新方法在原安全门禁下完成，并能解释性地区分受控provider依赖故障、绑定错误、启动故障和阻塞；这不是历史C1/R3唯一首因证明。该首因仍UNKNOWN，也未证明生产防火墙缺陷。安装/浏览器业务/真实26-742/F01-F09/独立QA/物理LAN尚未通过本轮验收，不以本地结果替代；本轮不伪造Hosted环境重跑本地Hosted-only核心门禁。

下一步仅由Master独立Review、确认新proof/真实祖先/指纹一致及C1失败安全收尾，再决定唯一C2；T2现冻结，不自行push/Hosted/后代或扩大范围。
