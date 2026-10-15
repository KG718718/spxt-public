# Fresh Firewall R3 — FAIL / STOP

2026-10-15。唯一Run 38737813798 / attempt1已FAIL；专项预算1/1耗尽，不重跑，不借Candidate/QA。当前 BLOCKED — R3 HOSTED FAILED / FRESH SCENARIOS TIMEOUT。无产品安装包，所有历史FAIL保持。

## 精确来源与证据

- Source 7709d22d3dd7535091e954ea299d374de015a1d4；control f6112e43ef629a54cade54abba215844a855a8ae；GitHub workflow fresh-firewall-r3.yml / workflow ID385533159 / job116431490960；只该新workflow运行。
- Artifact11974890253，fresh-firewall-r3-safe-38737813798。独立核验Run/attempt/branch/path/control/parent/title、Artifact归属/未过期/单文件名及严格schema/source/codeFingerprint/字段隐私均PASS。
- 单文件 firewall-r3-report.json；report SHA256 31c3bf4a14f6820e59126e8f033cef960f4a509872eed7fb6f3a6926065bf2df。此为报告hash，绝非Setup EXE hash；本轮没有EXE。
- 指纹ce81d3fa0bad96459d120e50380922ee1cc53ee23dff275fab9fa8bb30069358，保留HOSTED-REPORT.json与HOSTED-METADATA.json。未下载或上传原始Actions/进程日志。

## Hosted实际结果

固定外层status=FAIL、stage=FRESH2、reason=TEST_FAILED。Node24.21.0/Go1.27.1身份、实际overlay编译及vet均true；原Firewall13/13 PASS。Fresh2为1PASS/1FAIL、fail0目标未满足、skip0；失败父测试TestFreshFirewallBindingBeforeAnyMutation的12个子场景全部TIMEOUT/TIMEOUT：

exact-binding、guid-changed、ip-changed、prefix-changed、subnet-changed、missing-binding、public、unknown-virtual、unknown-hardware、unknown-hidden、route-unknown、read-failure。

每个场景mockVerified/requiredReadsObserved/mutationObserved/expectationMatched/pathProven均UNKNOWN，不能据此推断实际读过网卡、实际写过规则或完成安全拒绝。

4个故障反例报告：guid-changed_ADAPTER_ABORT FAIL、guid-changed_ROUTE_ABORT FAIL、unknown-virtual_ADAPTER_ABORT FAIL、guid-changed_MISSING_MOCK PASS；父测试FAIL（0PASS/1FAIL）。最后一项存在下述已证oracle缺口，不可作正确guard拒绝证明。

runnerNaturalExit=true、runnerStderrEmpty=true、Job empty=true、forcedTermination=false、环境恢复及owned temp/fixtures/cache/toolchain移除均true。仅证明这些受控资源门禁，不能泛称全部系统状态/所有临时控制日志恢复。mockProof.original13=true、fresh12=UNKNOWN、realSystemMutation=UNKNOWN；该项运行证据未闭合。

Always verify步骤为FAIL是保留原报告FAIL并返回非零；独立下载后的严格报告验证成功，不把红色final步骤误称为report解析失败。

## 已确认位置 / UNKNOWN / 有证据的差异

1. fresh_binding模板用20秒context控制系统PowerShell的CombinedOutput；ctx.Err非空即记录TIMEOUT并在读取reads/events前返回。R3实际12例均走此分支。已定位到完整Fresh子进程路径未在期限内完成，尚不能区分其启动、完整guard、脚本执行或输出管道收尾的内部卡点。
2. 原13继承os.Environ，Fresh显式窄环境仅SystemRoot/WINDIR/System32 PATH/系统PSModulePath/owned TEMP及固定合成参数，另多Fresh wrappers/guard/binding调用和20秒context。范围差异有源码证据，但未证明哪个差异导致超时；不直接扩大环境、提高超时或改安全条件。
3. 超时分支在读固定trace前返回，导致已有安全token是否存在不可知，这是已证诊断缺口，但不是超时原因证明。
4. MISSING_MOCK负例只要求Phase不是COMPLETE且MockVerified不true；TIMEOUT或GO_START默认false也满足。Master只读逻辑反例已确认两者都会被旧oracle接受，因此报告的单项PASS不证明guard实际拒绝。其它三例在超时时FAIL符合既有断言。此为测试判定问题，不是生产放行漏洞证明。

不能把R3的TIMEOUT回填成R1/C3唯一历史首因；旧Run38674907559仍只有顶层失败证据。没有证据认定真实防火墙安全缺陷，也没有证据说已修复Hosted阻塞。

## Review边界更正与最小建议（未实施）

Master准入Review漏检了用户“不保存raw stdout/stderr”的字面要求，误沿用R2仅禁止上传的惯例。当前封装有Runner私有raw临时落盘，control擦除未证；Artifact白名单/隐私PASS不能代替此合规要求。详见REVIEW-QUALIFICATION.md。由Master负责，不把责任归给Execution。没有据此追加运行或改写历史Review/Run。

建议下一阶段统一准备时仅修测试封装：超时后仍只读取固定token并保留UNKNOWN/已证状态；MISSING_MOCK必须证明明确guard拒绝而非泛化false，启动/超时均不得算该反例PASS；raw输出仅在内存解析并只落白名单报告。保持20秒/固定工具链/系统PS/完整mock/原接受条件和生产安全。尚未实施，不能声称这些建议解决超时；需先有针对性本地反例。

不申请第二个R3或新的微诊断Batch。是否将上述最小准备并入完整Payload→Fresh Setup→LAN→浏览器验收，以及统一新预算，由网页版决定；当前不能直接解冻Candidate。

## Git与最终停点

仅codex/lan-fresh-trial-v1.1治理收尾及非force同步。R3 1/1 FAIL，原R1 Smoke1/1 FAIL、Candidate0/2和QA0/1继续冻结；旧Full/U27/LC01/其它0。原Thread/工作树/所有安全失败证据保留，生产/R2语义/旧workflow无改动，无内部SPXT/main/tag/Release/清理操作。真实Helper/Launcher完整payload/Setup/F01—F09/26-742/QA/物理LAN本轮全部未执行。

执行停止，最终交接后STOP。