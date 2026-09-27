# Batch 4.5 Master Review Log

当前均为实施中的提前Review，未形成最终验收。

## 最新闭合证据与最后CI接线

T3 stale URL P2在bf6f87d被独立合成反例复现，报告5ac3aa7整合6d99644。77fc8cc/3babad0修复为fresh adapter/config/state的GUID/IP/prefix/subnet/port一致才发布地址，整合59f0a9b/d967786；Master4项及vet PASS，独立QA原反例和正例3/3 PASS，报告0af651f整合137e526。错误的TCP table class=3为ALL猜测已撤回；微软TCP_TABLE_CLASS定义3为OWNER_PID_LISTENER，不产生生产修改。随后普通刷新busy停止请求首回0的同步问题经合成证实，6a2cae6整合a226ed1，逐次owner核验及15秒整体上限保留，Master2/2和vet PASS。

T5完整登记snapshot/hash验证/restore/readback与事务COMMITTED、ROLLED_BACK外置marker经e894881/b2471bb修复，整合3bde248/e0fbbb1。commit内部故障保留登记待恢复journal，marker不随递归清理先丢失，cleanup异常可识别且不再错误降回登记。独立QA基于冻结51d4f7f运行事务25/25、登记顺序静态1/1 PASS，报告0f47c2整合d485b36；不把静态registry顺序声称真实API恢复成功。真实Setup双视图恢复留待Hosted。

CI名单和既有setup-v3调度入口dbd758af8a025d4bf4c932facf04a1febcd703d9、7cbe124abd921628b2bab33119b1048e5b032c1f已整合76044c7/eaebaf6。Execution回单曾错误手填两条40位SHA，Master从git对象核验后要求更正，未使用不存在的身份。Master在eaebaf6实际wrapper44/44 fail0skip0；首次报告误传Execution SHA的本地报告不作来源证据，已以实际HEAD重新运行并另存正确报告。仅手动LAN分支入口可调用诊断/full/qa，旧job条件不变；未触发Hosted。专项3/4、Full0/2、QA0/2。

## T3 R1正式整合与T5独立QA

T3主动返回6919bcdcd326bfe36ee316a977c6ffda930f4fc4（parent a05d39d）；环境失败关闭、UI消费pending前保持串行、worker独立controller及旧配置/端口恢复经Review通过，整合d623cdfffb2e916890b770d6297fdf9839a3a412与bf6f87ded76b8591899accdbfb47cfde746c9f3a。Master在统一树实际运行Node六文件37/37 fail0skip0，固定Go1.27.1选定25顶层+11子用例、go vet PASS；仅合成及自有loopback，没有真实LAN/UAC/Firewall操作。T5已获统一HEAD用于依赖接线。

独立QA T5冻结阶段报告19e8abe51135ae8909f469a462662bc9a4892f6d已整合0e666db：两P2分别为登记只恢复六值且不验返回，以及finalize递归清理恢复副本失败后仍进入rollback。已退原T5补完整登记恢复/readback及持久commit point/清理故障反例，尚未闭合。原报告是静态证据，不假称真实Windows复现。无新Hosted消费。

## 冻结阶段 Review / 2026-09-27

T3主动返回a05d39d6ba6d112e4ba0d0a291dfe3df93132248；主控退回原线程R1：helper环境失败必须拒绝启动，worker结果直到UI消费前保持串行，设置过渡清除旧URL并消除child/config共享竞态；已有配置切换后启动失败须安全恢复原配置，不能引入未批准的自动换口。

T5阶段fe7cb3c7167acdb82743104352d1d54ab3725997、接线修复f053b907e08be75c75aed734a78fb4c39671d3b6及报告dc45119263553a042f87f5eda82d414457184a8d已收到。Master独立实际运行兼容wrapper：33 tests / 33 pass / fail0 / skip0，C01—C15精确映射通过；这是本地合成验证，非实际Setup生命周期。原wrapper仅扫描C08-C12区间文字会漏C09—C11，现已修复。CI仍须返工旧Portable校验路由及Go测试程序helper hash注入，版本化harness保持历史测试源码不变；同时接入T3/T4安全反例及L01—L28证据映射。NODE_PATH须来自已构建Runtime，早期SOURCE/DOWNLOAD/VERIFY失败有固定安全报告。

独立QA原线程正在对上述T5冻结提交审查信任、回滚、构建及证据，不改生产代码。T3/T5均未整合；专项3/4、Full0/2、QA0/2未变化，尚无beta.3候选Artifact。

## T1 网络/config/port
- 默认网关不能硬性要求；有效connected/on-link Private LAN应保留，多NIC不猜选。Execution已接受。
- GUID canonical小写无括号8-4-4-4-12 hex，不能任意限制UUID version/variant位，拒绝全零；T1/T4已同步。
- 修正JS有符号bitwise导致172/192 RFC1918判断错误；生产port入口禁止0.0.0.0/Public/越界端口，归一化后去重。Execution测试收口中。
- Node exclusive参数是cluster handle语义；要求.NET ReuseAddress对抗与原生Windows独占检查。允许仅新增Launcher lan_port_windows.go及测试，用现有Go工具链做SO_EXCLUSIVEADDRUSE实际探测；不修改core/main。需明确探测后正式Node bind的竞态失败处理，不谎称OS socket传递。
- Config固定instance/lan-deployment.json，仅schema1/port/adapterPreference，不存IP；同adapter多IPv4不得取第一项。

## T4 防火墙
- 仅闭合action/port/GUID输入，程序固定私有Node，安装信任需编译锚和binding。
- 提权System32定位不能依赖继承SystemRoot；用可信WindowsAPI，固定系统PowerShell/module路径，拒绝用户模块自动加载。
- CIDR全范围必须在相应RFC1918 block，不仅检查host地址；适配器语义与T1一致。
- 自有rule更新需先禁用、逐项收紧、核验再启用；未知rule不碰，正常启动/status只读。
- ALLOWED须有效ActiveStore和Private policy，不能仅存在PersistentStore规则。

## T5 取证
- 原historical job放末尾的既有71项测试语义保留，新job插入其前，不改旧测试强行过关。
- 静态门禁前纯PS预置固定FAIL report/env，保证最早失败仍有封闭阶段；invoke严格验证唯一预置报告。
- 下载固定Artifact校验后，启动受验Setup等产品进程前剥离认证环境；只停止精确路径且证明属于本任务的进程。
- Artifact只上传固定安全报告及成功时evidence，原始路径/log/registry/data不上传。

预检工作树lan-server已建，尚未派T2；待T1正式Review/整合后精确更新baseline。所有Hosted预算仍0/4、0/2、0/2。

## 本轮Review更新

- T1最终未添加Go原生socket探测。Master复验.NET非独占/ReuseAddress竞争真实探测PASS，Node已有handle持续保留；不把exclusive参数本身当Windows SO_EXCLUSIVEADDRUSE证明。固定System32 PS解析返工已整合9b23ba6，15/15 PASS。
- T2已按9b23ba6派原独立任务；提前Review要求remote bootstrap显式闭合、网络变化先停accept再毁旧连接，失败不能因地址相同直接永久跳过重绑；健康字段完整才能server-ready。
- T4返回3ab36ca未整合。R1：enable后查询抛异常仍须best-effort禁用已确认自有规则；status/未知冲突禁止写。补实际嵌入PS的mock行为测试。product32 view读取InstallLocation而非不存在的InstallRoot，字段缺失不能当key不存在；绑定必须核对INI Schema/InstallRoot/Instance和HKCU，instance==installRoot拒绝。
- T5 R1 deaa097→be83e8e：仅测试harness路径修复，Master双PS进程与9/9 PASS；Hosted2已通过static，失败CLEANUP_VERIFY。R2要求细分安全清理阶段和0/1/multiple pipeline反例，尚未运行下一次Hosted。
- 当前专项2/4、Full0/2、QA0/2，前述0预算及未派T2仅是当时历史。
## 独立早期QA反馈与证据更正

- 已确认T1 P2：Node配置JSON.parse重复port last-wins，helper严格拒绝，形成损坏配置跨层解析分歧；没有证据证明提权或Firewall绕过。原T1 R2严格重复键/尾随内容与原字节保护返工中。
- 已撤回T2 healthFailed孤立API漏洞定性：独立QA追溯唯一生产monitor→reconcile，发现异常前已同步selected=null/lanListening=false撤销guard；导出函数孤立测试不是生产可达绕过。Master撤销返工，原T2确认NO PRODUCTION DEFECT，清除仅自己的未提交孤立测试，clean@30a1351，无生产改动/新commit。
- 已确认T4 P2：enable既有精确enabled自有rule时，早期Test-ActiveEffective查询异常在cleanup flag建立前，exit25但不禁用；原T4 R2补责任边界及exact规则下profile/ActiveStore查询throw反例。status/unknown仍禁止写，正常幂等保持。
- QA未给整体PASS；T3/T5仍实施中，专项3/4、Full0/2、QA0/2不变。

## T1/T4 原缺陷返工整合

- T1 R2/R3：递归token parser拒绝解码后重复键、未知字段及尾随值；仅配置层要求schema原始数字token为1、port为8080—8099规范十进制整数，通用parser仍保留标准JSON数字能力。Master18/18 fail0skip0，非法load/save保持原配置、合成业务及附件逐字节不变。
- T4 R2：自有CIM rule object确认后立即承担cleanup责任，覆盖既有精确规则的早期Profile/ActiveStore查询异常；status/未知同名不写，正常幂等零写。R3补精确解码后字段集合，拒绝Go默认大小写匹配，整数解码继续拒绝小数/指数。Master13顶层29子用例及go vet PASS；原生产嵌入PS以隔离mock执行，未操作真实Firewall。
- 集成HEAD b0e51b54744c944ce68a5730d9b8d279b72db9a0已远端核验；原QA FAIL保留，独立同bytes跨语言corpus与早期异常复验进行中，不能提前称QA PASS。

## 早期复验闭合及T3/T5接线Review

- QA主动返回4b9eae3，Master审查纯报告并整合d82a698：同13组JSON bytes的Node/Go结果一致，原精确enabled规则Profile/ActiveStore异常最后禁用，两个P2局部复验PASS。旧FAIL保留；这不是整个Batch QA PASS。
- T3冻结前Review：保存端口冲突的start错误导致run关闭控制窗口，阻断LAN设置；LAN READY不能仅依赖T2启动时health缓存，须新鲜Host LAN self-probe；状态查询失败不能保留旧可复制URL；首次自动配置不能把自己Local占用8080误判为第三方冲突；需异步处理自己child的停启、严格字段、SELECTED非空与错误恢复。已交原T3补反例，尚未整合。
- T5冻结前Review：独立beta3事务沿用beta1六文件元数据清单，并以wx新建install-state.json；真实beta2正常具有install-state.json，会在prepare被拒绝或commit遇EEXIST。原T5须严格验证beta2旧state与已核验身份/binding契约，快照精确bytes，受保护替换为beta3状态并在任意失败还原。合成fixture须符合beta2实际形状，不能把合法旧state当未知文件；旧beta1路径不动。此为已批准兼容路由工程适配，无新产品/schema决定。
- Hosted虚拟NIC不得作为放宽生产发现的理由。隔离runner socket/NetSecurity证据、严格生产拒绝和合成选择算法应分开记录；L25真实第二设备等仍人工。当前专项3/4、Full0/2、QA0/2，未新dispatch。

## 专项4失败与预算止损

Master核验Run36288039798精确受测4f52e8759d8ddd20b2a9883fd267a98ced27fba1、Artifact10920906716，FAIL/PORTABLE。实际失败为Firewall build.ps1内部go test，早于helper编译及后续显式Go名单门禁。三个有效夹具分别被HELPER_PATH_INVALID、INSTANCE_BINDING_INVALID、REGISTRATION_INVALID拒绝。只读源码确认夹具t.TempDir、ci-lan/build未规范TEMP/TMP；本地Master此前规范路径后通过。短路径/解析不一致仅候选原因，Hosted实际TEMP及细分拒绝原因未记录，不能宣布定位或修复。未执行新反例/修复，未借Full/QA预算；按专项4/4停止并提交网页版决策。

## D5前主控独立原测试对照

在公开f727063d818cd8e6a0bcd640cafc5ce4f2864467、固定Go1.27.1上运行未修改的3个原Firewall测试。规范GOTMPDIR下3/3 PASS；仅GOTMPDIR换成指向同一owned合成目录的junction，3个顶层及登记合法子用例失败，精确复现HELPER_PATH_INVALID / INSTANCE_BINDING_INVALID / REGISTRATION_INVALID。初轮只切TEMP、GOTMPDIR仍规范，两轮均PASS，原先“仅TEMP即可触发”实验预期失败，未掩盖。固定Go源码testing/testing.go的t.TempDir使用os.MkdirTemp(os.Getenv("GOTMPDIR"),pattern)，因此输入分类须含有效GOTMPDIR。机制已复现、原合法fixture结构可通过；历史Hosted具体路径仍未知，不能追认junction就是旧Run根因。仅自有合成目录与junction，无系统配置/真实Registry/Firewall操作，原测试自动清理自己的子目录。安全结果见evidence/d5-master-original-fixture-counterexample.json；raw日志仅本地，不上传。

## D5实现3459a59：Master独立Review FAIL

原T5代码冻结3459a5987f8aa77c5c26fc0efbbc04d45ba17950，生产5文件与原baseline逐字节一致。Master自有合成目录复测：环境分类13项PASS，兼容wrapper45/45 fail0skip0；真实build TESTS/TESTS_FAILED，12顶层PASS、9个Firewall隔离cmdlet行为子例及该顶层FAIL，compile未到达；driver ZERO的底层返回TESTS/INTERNAL，与期望TESTS_FAILED不一致，driver FAIL。原3fixture已通过，不能用Execution短目录结果掩盖此独立FAIL。Go临时根长路径与WindowsPS5事件文件兼容仅候选；对子进程pwsh7.6.5空事件解析及空数组比较手动复核均正常，不能认定该比较就是根因。已退回原T5 REWORK，保持当前5生产文件冻结；D5/D6仍0/2。安全报告evidence/d5-master-review-3459.json，raw本地保留不上传。

## D5最终本地Review与预登记

原T5主动RETURNED并冻结b67cbb6e4bb2ddadd92ddf6ee12885198979ed19。Master取得准确回单后独立复验：环境13/13、driver反例5/5、实际build入口Go13顶层fail0skip0/package PASS/真实compile PASS、固定Go1.27.1 vet PASS、兼容wrapper45/45 fail0skip0、diff/privacy PASS。五个Firewall生产源文件/go.mod与原baseline逐字节不变；原路径/Registry/binding/CLI白名单及原拒绝语义未放宽。11类对照完整，实际8.3本机UNAVAILABLE如实保留。原3459失败和原Hosted未知路径事实不改写。安全证据evidence/d5-master-review-b67c.json。

状态RETURNED→REVIEWED→INTEGRATED；正式90cdc0f/7e5e7f8/b67cbb6分别整合45dfc76/3187c41/f8f9340。原T5冻结等待Hosted，其他线程仍冻结。下一次只dispatch已注册setup-v3.yml / codex/lan-host-v1.1 / mode=lan-diagnostic-extension，预留Diagnostic Extension D5第1/2次；受测为包含本登记的精确HEAD，dispatch后记录run/source。D5真实构建仅TEST_BUILD_ONLY，不生成发行Artifact；上传仅四个固定JSON，不上传raw日志/路径/程序。当前历史专项4/4、新D0/2、Full0/2、QA0/2；D5结果未出，不预判当前阻塞或全Batch通过。
## D5 PASS / Full1准入与预登记

Run36292597156 / source98b030d1fa5c2ca091ac266069ea9d624d3177a5 / Artifact10922139870（1180bytes），SHA25660dd6656612fa510b35f769124f27a221fb0d817270278e6da8e0aa5043faa99。Master内存解包，四个精确JSON文件/schema/封闭字段/来源/计数及privacy核验PASS。Hosted原始TEMP/TMP为NONCANONICAL、GOTMPDIR为NONLOCAL，owned physical测试根下environment13/driver5/Go13 fail0skip0/package PASS/真实compile PASS。仅TEST_BUILD_ONLY；历史Run的精确路径仍未知，不倒推旧Run唯一根因。证据evidence/d5-run-36292597156.json。

Master确认当前Firewall fixture/build阻塞已越过。T1—T5已整合，局部QA缺陷已关闭，D5修改仅测试环境/诊断，生产五文件冻结；完整candidate的真实Runtime→helper→Launcher构建身份链、固定F3五锚/离线升级、既有U30与C15及全26/742门禁未削弱。F3 Artifact10907910968 API仍expired=false且原Run/source/大小一致；只在Hosted下载原包，不fresh rebuild。满足Full1工程准入，不等于候选PASS。

下一次仅setup-v3.yml / codex/lan-host-v1.1 / mode=lan-full，预留Full第1/2次，精确受测为包含本登记的公开HEAD，dispatch后回填。历史专项4/4、Diagnostic Extension1/2（D6未用）、Full当前0/2、QA0/2。Full1若有此前未到达的纯工程失败，按批准第12节本地反例→最小修复→Review后再Full2，不借预算；若失败性质不在授权内或需额外诊断而无相应额度则停止决策。仅FullPASS后启动原独立QA最终阶段。未运行真实Win10物理LAN/第二设备，不提前标LAN HUMAN PENDING。
## Full1 FAIL / 原T5有界返工

Run36292822541 / sourcef139a429b56aab53b84727fad58838619e40f4ee / Artifact10922344270，296bytes，SHA25631c53b74b3b6ff76784578ed41e7dfef8ec495421535ff2797614b03d37bcbcc。Master内存解包唯一stage.json、闭合schema/source/FULL/FAIL/PORTABLE与privacy PASS。Firewall测试及compile、Launcher测试及build已越过；后续原LAN Node37项31PASS/6FAIL/skip0，六个config fixture为LAN_CONFIG_PATH_INVALID；尚未Setup/U22/U23/Registry/Firewall/最终回归。此为此前未到达的后续L/config门禁工程失败，不撤销D5结论。

Master在同一f139a42原37名单、本地Node24.14.0独立对照：规范physical TEMP/TMP为37/37 PASS；指向同一自有合成根的junction为31PASS6FAIL，六个失败名称与Hosted一致，仍固定LAN_CONFIG_PATH_INVALID。原业务合成字节/夹具保护测试未改，生产safeInstance拒绝符合契约。Hosted具体映射值仍未知，不写成唯一根因。证据evidence/full1-master-config-counterexample.json。初次只选五文件31项对照亦精确复现，随后补齐Launcher6项得到实际37，未隐藏初测范围。

按用户批准第12节，B45-T5原thread01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9/原b4-qa/codex/b45-t5-integration从冻结b67cbb6继续REWORK，完整卡tasks/B45-T5-FULL1-REWORK.md，准确return target01a0db0e-c950-79e0-8e11-07155e0742f2。本地baseline的tools/.github/生产config与受测f139a42无diff。只处理测试环境/CI接线，生产路径及安全契约冻结，禁止直接Hosted或amend已返回SHA。先本地对照→最小修复→Master Review，证据充分才Full2；否则止损。当前历史专项4/4、扩展D1/2、Full1/2、QA0/2；未使用D6或Full2，最终QA仍冻结。
## Full1返工期间下游对照更正

Master对原compatibility wrapper做长owned TEMP实验曾得20/45及一次Node子进程提前退出。进一步核查，Primary工作树CRLF导致2个workflow静态regex不适配（Hosted checkout固定LF）；长物理TEMP另有Node24.14子进程3221226505退出。因此不能把这25个失败全归因transaction，更不能声称对应Hosted已运行该门禁。原日志保留本地，未发布raw。

隔离后，在同一公开1be32fe、原transaction.test.cjs、短owned物理根与其junction对照：物理25/25 fail0skip0，junction2PASS23FAIL，明确inventory的Link or escaped file拒绝。全部是合成fixture，生产保护未修改；Node24.14与Hosted24.21版本差异明确保留。安全证据evidence/full1-master-transaction-counterexample.json。与原37项physical37 vsjunction31的已闭合对照共同支持修复ci-lan至ci-beta3的测试环境传递；该实证不追认历史Hosted精确路径。T5获得CI测试环境接线及固定安全报告授权，旧beta1语义/生产文件仍冻结。所有新修复待正式回单和Master最终冻结复验，无新Hosted。
## Full2最终预登记 / Full1返工Review PASS

原T5主动RETURNED冻结8e99b4d9895c05fe6454d3bb20b32378c7516685，实现cf4848a173535d746344d89be69d0c0ef3f8d04f；Master核对thread/worktree/两个local commit和完整回单。独立复验environment7checks、原37名单physical37PASS/junction31PASS6预期拒绝/skip0；兼容wrapper45/45 fail0skip0；额外实际注入Launcher环境变更后throw，finally完整恢复及candidate外层恢复均PASS。4脚本AST、13个workflow内嵌PS块、YAML小diff人工结构、diff/privacy PASS；未安装或宣称第三方YAML parser。生产JS、原config断言、Firewall五文件、Launcher build逻辑与冻结基线逐字节一致。证据evidence/full1-master-review-8e99.json。

状态RETURNED→REVIEWED→INTEGRATED；cf4848a/8e99b4d分别整合7ec9be74e1353c871c12f73a635d55871128e030/a9545783b4051f2e8358fc438efa072fa7237a94。修复只隔离并恢复ci-lan/ci-beta3及回归测试环境，增加封闭诊断和必需PASS计数，不改变产品接受条件；原T5冻结，其他原线程/工作树保持。

依批准第12—13节，当前新问题已能本地安全定位和复现，无须增加专项Hosted。下一次仅setup-v3.yml / codex/lan-host-v1.1 / mode=lan-full，预留最后Full第2/2次；精确受测为包含本登记的公开HEAD，dispatch后回填run/source。当前历史专项4/4、D1/2、Full1/2、QA0/2，D6未用。Full2仍失败必须停止交网页版，不挪D6/QA续调；FullPASS后才原独立QA最终阶段。当前尚无最终beta3 Artifact或LAN HUMAN PENDING结论。
## Full2 FAIL / 最终停止

Run36294405341@ac2b47de85aaac9545cf6f2a534603d7071ed5db / Artifact10923547080（1082bytes，SHA256e77aec5c2923c6c1dbc7bdbd541bf4745a0018c0c134c20891d92efd6c034092），固定HOSTED_LAN/FAIL/FULL；三JSON来源/allowlist/privacy PASS，环境恢复true，LAN37/37 PASS。公开日志确认Portable自动门禁和兼容45/45通过、7个Setup模式构建完成；尚未执行实际Setup生命周期或后续Firewall/26/742/最终QA。旧冻结回归110PASS/1SKIP，原8.3实际别名不可用，不伪称全PASS。通用HOSTED_LAN_GATE缺少细分原因，没有唯一根因；停止后不再反例/返工/Hosted，只读证据归档。

最终状态BLOCKED — FULL HOSTED BUDGET EXHAUSTED。预算历史4/4、D1/2、Full2/2、QA0/2；D6/QA不挪用。T5收到STOP并主动确认原worktree/local8e99b4d冻结，原T1—T4与QA保持既有冻结，未清理任何现场。决定与选择详见HOSTED-STOPLOSS-FULL2-20260927.md；原历史CHATGPT-HANDOFF保留，新卡full2-stoploss/CHATGPT-HANDOFF.md。唯一Master/Primary/集成分支不变，未main/tag/Release，不进入Batch5；等待新明确授权。