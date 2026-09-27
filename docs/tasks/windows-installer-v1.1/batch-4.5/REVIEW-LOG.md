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
