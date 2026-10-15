# FRESH-T1 Master独立Review

日期2026-10-14；结论LOCAL IMPLEMENTATION REVIEW PASS / T2 WIRING & HOSTED PENDING。不代表候选、真实物理LAN或Windows登录已通过。

正式Thread01a13945-ee6b-75b0-94bd-d2dc1e367e17，7b54工作树、codex/fresh-t1-deployment，基线d293f0a。来源e91b41e/2f43a52首回单后Master确认授权顺序缺口，返工cfaf95c/4e5e20a，再补环境一致性1b451b1；所有回单主动准确目标送达。最终整合8d88ae6/40c691c/b20d4f4/47a87f9/7ffc019，后者7ffc0199a8f4ebd2c58f206dd79d2353b94ce6f5是受审整合代码HEAD，本文为后续治理，不自引用。

## 独立核查与复测

- Master逐项读取真实git diff、profile/CLI/Node/Go/Firewall身份和线程回单。默认标准四字段、旧38源文件闭包、历史WINDOWS_DISCOVERY_SCRIPT与原测试期望保持；业务变化仅LAN固化/配置重验接线，无schema/账号权限/历史F3身份/upgrade事务/rollback改动。
- Node83/83：Fresh50+原33，本地替身，不读取真实网卡。首轮与授权顺序增量分别实际复验，fail0skip0。
- Firewall tagged15顶层/57含子测试：实际运行，12新场景及原13保持；系统PowerShell仅解析和隔离cmdlet替身，没有真实Firewall/Registry操作。增量未改helper，不无意义重复。
- Launcher最终tagged Fresh4顶层及11新增顺序子场景15项实际复验PASS；包含原4个rollback/fallback回归时8顶层/19项PASS；环境快照最后三文件增量再次Fresh4/15 PASS。独立diff-check PASS。Execution的vet与fresh-linker整包test仅编译证据已核查，不能冒充实机程序运行。
- 本机Node24.14.0仅开发测试，不冒称Candidate pinned24.21.0；Go1.27.1 offline/CGO0固定。Master缓存/fixture独立且保留，不删除未知文件。

## 已闭合工程边界

Fresh Node marker在既有network源码固化，false/缺省env不能降级；实际系统绝对模块、完整JSON、任何stderr拒绝；物理Private/RFC1918/route/GUID条件严格、唯一预选不是信任。Fresh五字段绑定，GUID/IP/prefix/subnet及配置每次重验/有界poll，异常关闭LAN，不自动换端口/接口。helper在rule mutation前真实比较绑定与Private物理条件，未知拒绝，标准路径不放宽。

初次enable必须先网络/helper/status/必要用户UAC→再网络/status重验→才LAN bind。saved enabled/--logon仅只读status、绝不自动UAC。拒绝/未知没有LAN bind、恢复disabled/Local；partial-child/start+rollback失败均收尾，不伪称成功。Launcher私有环境快照只做配置连续性检查，复制/排序/唯一性且不污染原数组；普通JSON可读可构造，绝非防伪授权凭据或真实Windows登录证明，独立物理/Private/helper门禁仍必需。

## 接线与待验

T2在manifest前唯一替换marker、保留原38；Launcher -X main.freshTrial=1与helper -X main.buildFreshTrial=1、全部旧身份anchor一致。仅Fresh当前用户Startup固定shortcut/目标/参数/工作目录、collision拒绝及owned回滚由T2实现，最低权限不变。Windows登录实际运行、真实普通用户系统模块、GUI/UAC/物理Private/Firewall/双设备/第二Launcher均HUMAN_PENDING；旧P02唯一根因未证，全部历史FAIL原样。

Candidate0/3、QA0/1；旧Full/LC01/U27/Diagnostic0。不允许仅T1局部PASS触发Hosted；须T2完整本地/独立Review及来源同步。未访问内部SPXT、main/tag/Release、真实业务或真实网络，没有新增架构/服务/管理员安装。

## 后续测试组织一致性

T2实际复验发现旧beta4静态扫描会计入tagged Go文件、把新增测试误算为旧13项。原T1将四份新测试精确迁至tools/tests/fresh-lan-trial/*.go.in，来源79d9355、整合4f846bf，Git四项100%rename/0新增删除行，生产与原测试期望零改。T2用独立Go overlay实际加载全部新检查；迁移不能冒充重跑。原beta4目标计数回归已由T2恢复20/20，Master待最终集成复验。T1额外beta3旧正则FAIL如实保留；Master核对原beta3测试blob0503fa2及原Launcher build.ps1 blobff9343c在初始3f4f630与当前T1整合代码完全相同，说明该正则失败是既有旧路线不匹配，不等于新trial通过或新生产失败；未改旧断言。

## 本地核心回归预检的治理缺陷

主控在 Fresh 集成树 42f2d44 执行原 `run-public-tests.js`，本地发现 `public-product-docs.test.js` 因历史 LC01 SPEC 中具体部署主机标签违反公开文档规则而 FAIL。其余 Hosted-only 用例在本机明确 SKIP，因此本次不是核心 26/742 PASS。该标签在起始基线已存在；仅将禁止访问的对象概括为“真实部署主机”，禁令含义与历史失败结果不变，未更改测试、期望或白名单。原文档测试独立复跑 8/8 PASS，diff-check PASS。历史提交及失败日志保留；完整 fail0skip0 核心验收仍须获批 Candidate 的 F08。
