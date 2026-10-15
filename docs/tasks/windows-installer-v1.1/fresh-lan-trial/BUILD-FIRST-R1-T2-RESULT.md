# Build-First Recovery R1 — FRESH-T2 执行结果

日期2026-10-15。状态：RETURNED / MASTER REVIEW PENDING；本地实际构建闭合，不是Hosted PASS或触发授权。

## 来源与授权

原bea7/public-source、codex/fresh-t2-installer-ci，从184308ec安全merge主控cff7feca5fd2c05d2e2fab161b61eac4be2ccbef，无冲突，基线a02b76ff051ed277629ad5af831e4ea13a3ac595。原.test-work及未知文件保留，没有reset/clean、新worktree/thread/agent、push或Hosted。依据BUILD-FIRST-R1-AUTHORIZATION/ORCHESTRATION；R1预算Smoke0/1、Candidate0/2、QA0/1，由Master独立Review后中央触发。旧C1—C3 3/3 FAIL不改。

## 实际前置构建事实

固定Node24.21.0 EXE SHA与distribution匹配，固定Go1.27.1。以a02b76ff精确Git source真实构建fresh Runtime，20依赖/1044文件/10checks PASS；原prepare追加Go及项目许可证后1046文件。真实manifest/Node hash进入现有Helper build，原13/Fresh2与真实Helper编译PASS；实际Helper hash进入现有Launcher build，原28/Fresh2及真实Launcher编译PASS。两端父环境恢复true，EXE未运行。Master另独立核验Runtime、PE、长度/SHA及三方manifest/helper链与Fresh报告。

本地首轮Runtime源字节守卫拒绝CRLF工具文件；逐一先证明仅行尾差异、将已知7文件暂时写为HEAD blob后真实构建PASS，随后恢复既有autocrlf形式，没有语义源码变化。不将此本地前提差异归因Hosted C3（Hosted已使用LF checkout）。真实构建scratch位于bea7下独立普通输出目录（指针.test-work/fresh-r1-build-root.txt），不是Git worktree；旧aaaa合成profile仅作反例，未当作真实产物。

以上是a02前置证明，不冒充之后修改脚本的最终构建。最终将local commit后，以同一提交真实执行整个build-payload.ps1并记录结果。

## 确定封装缺口及修复

- C3 HELPER粗阶段还包含父重复13。公开冻结de6c2312源实际block/native mock继承污染CGO/flags/toolchain；子pwsh设置不回传父。Fresh payload外层明确windows/amd64、CGO0/local/offline、GOENV/GOWORK off、清空flags/experiments；snapshot/finally覆盖TEMP/TMP/cache及KSESSION_FIREWALL_TEST_ROOT、pinned Node变量并验证恢复。原重复13/28与原strict report零删改。
- 子Helper INPUT、ENV、原13、Fresh overlay/Fresh2、compile、identity及父重复13的policy/GoJSON/report固定诊断透传至外层；仅4白名单字段、固定enum/原13/Fresh2已知测试名，多名/未知泛型。Helper原PASS不再早于identity；Exit异常/恢复不符固定ENV_RESTORE_FAILED并FAIL。实际脚本九种stub逐阶段拒绝均已通过，stub无效EXE不作为真实构建证据。
- CI成功路径在StrictMode下原script:taskFailed未初始化，纯PS反例为UNBOUND_FAILURE_FLAG；显式false初始化后READY。该已证潜在成功路径缺陷不追认C3原因。
- C3到a02相关构建/生产代码无diff，本地同码成功不能归因C3。历史C1/C2/C3首因仍UNKNOWN。

## R1最小独立接线

独立fresh-build-first-r1.yml/新build-first-r1-trigger.json路径（真实trigger未创建），R1S1/R1C1/R1C2/R1Q1与FreshBuildR1/BUILD_FIRST_R1_MASTER_REVIEWED前缀。旧workflow、trigger与旧slot含义不改。单push分支/路径、attempt1、唯一控制提交父子/文件差异、只读权限、共用互斥组、45min及execution35min。

同R1 workflow任一先前实际Run（包括非法标题、早期失败、取消、attempt重复）消耗/阻断，未知不能过滤掉。Smoke PASS必须验证Artifact归属/run/path/attempt/source/control、严格固定报告、全部cleanup及代码指纹；C1须祖先+相同执行代码指纹（只排除docs/、AGENTS.md、PROJECT.md），C2须C1真实安全失败/cleanup全真+实际代码指纹变化；首Candidate成功禁止第二，QA同R1 Candidate/source/EXE且无重构。来源依赖控制提交也核验唯一parent/trigger差异/title，不能信孤立PASS字符串。

Smoke复用实际payload、必要原13/28/Fresh2及LAN44测试、工具链、完整fresh Setup编译/identity，到此停止，不安装、不运行构建的产品EXE、不运行F01–F09/浏览器。原LAN44可含受控合成loopback测试，不冒充安装/物理LAN。独立smoke-report只有固定build/身份/cleanup/source/run/hash；productExecuted/qualifiedForInstallation=false，成功也仅上传JSON，EXE/私有logs不上传。

Candidate/QA继续原严格schema、F01–F09/26-742/真实安装及浏览器；QA bootstrap生成原metadata文件，原identity块与七文件只读ZIP提取分支实际stub验证，缺少/额外/错源/hash/旧workflow拒绝。共享ci/finalize只新增显式R1 Smoke分支；旧默认路径保留。Smoke复用实际owned toolchain/env/drive核验与物理转存；任何外层失败、未知或缺失cleanup均不能PASS。

## 本地验证进度

固定Node全Fresh+R1 138/138 fail0skip0，旧beta4 compatibility20/20；最新来源控制与公开旧基线调整的局部12/12复验PASS。安装态完整Go overlay test-c/vet PASS（未执行安装测试）。变更CJS/PS syntax、YAML uniqueKeys/push-only/45min及内联PS机器parse PASS。Master并行独立已验14个helper/R1/QA反例和语法/YAML，最终仍以受审提交为准。

本轮没有运行Setup/产品EXE/真实Registry/Firewall/Startup/LAN或业务数据操作；所有native构建反例、失败日志、缓存/实际编译产物留在私有owned scratch/.test-work，不上传、不未知清理。真实ISCC本地NOT_RUN（没有受验本地compiler），将只由获准Smoke构建验证；不是ISCC或安装PASS。真正完整payload最终结果见下方。

## 最终提交与整条真实构建 — 已完成

实现commit401ea7f926be2c2123e6922fd5081ae0935bf30b。在该精确HEAD、构建相关文件冻结且tracked clean条件下，传固定真实NodeDir/GoRoot执行完整build-payload.ps1，owned普通输出目录位于bea7下，不是Git worktree。Runtime工具执行前为精确HEAD blob，通过git add仅刷新同blob index（cached diff=0），运行后恢复原autocrlf形式；没有更改运行中源码或未知文件。

结果：exit0，FRESH_PAYLOAD_IDENTITY PASS / BUILD_AND_PURE_TESTS_ONLY，productionExeRun=false。Helper原13/13及父重复13/13、Fresh2/2；Launcher原28/28及父重复28/28、Fresh2/2；LAN44/44，均fail0skip0；runtime-manifest、实际两EXE、package-lan.finish/verify及完整1049文件/20依赖身份组装PASS。刻意污染的父Go env隔离后恢复true，外层env恢复true；未写未知global cache。整条链不再仅direct build或overlay compile。

- sourceCommit：401ea7f926be2c2123e6922fd5081ae0935bf30b。
- manifest SHA256：2532f4832d0240110e0a890869f30f9fba0cad82a89e177da7d4e765a1839b02。
- Helper EXE：3,573,760 bytes；SHA256 6b15c9cc951634607c40bd908d5e7517360b89578fad39a467903cca38909bae。
- Launcher EXE：7,446,016 bytes；SHA256 19fdb38e88b57fb7ea064a5d2cb479beb80125d344d45805f4ceea7cd14f55f7。
- 实际raw报告来源：.test-work/fresh-r1-full-path.txt指向的owned目录，artifact/fresh-payload-report.json、firewall-build-diagnostic.json、firewall-unit-report.json、launcher-unit-report.json、lan-node-test-environment.json及两组件build-info/fresh-policy-report。
- 固定本地摘要：.test-work/fresh-r1-full-summary.json、fresh-r1-real-identity-summary.json；私有整链日志由fresh-r1-build-root.txt指向目录内private-full-payload.log保存，不提交/上传。

PAYLOAD_REPORT/COMMAND_FAILED是build-payload在执行前写入的最后进度marker，成功返回后由外层CI下一个阶段覆盖；此次实际exit0及完整报告PASS已独立核对，不能只凭该预写marker把成功链算失败，也未把它改写为历史C3证据。R1 Smoke在真实Setup identity后才写COMPLETE/PASS，不受该中间marker误判。

验证过程保留：初次helper父block反例取finally后缀未规范CRLF导致截取断言失败，统一源文本行尾后通过；只修测试采样，不改条件。Helper原13/Fresh2/compile/identity/restore实际脚本stub9情形通过。后续新增CI失败flag初始化反例及源父子控制反例，最终Node全138、旧compat20、相关局部12均fail0skip0。原旧报告/预算/失败不更改。报告后续提交仅治理，所有构建相关文件与401ea保持零diff；Master可对最终代码与实际source作独立核验。

本执行回单停止于Master独立Review/中央Smoke准入，R1 Hosted仍0/1、0/2、0/1，没有真实trigger/push。Master若发现权限/安全/架构或关键收尾不可证明须按授权STOP，不把本地PASS称作用户安装或LAN认证。实体GUI/UAC/物理Private网卡/授权/第二设备/登录/第二Launcher均HUMAN_PENDING。