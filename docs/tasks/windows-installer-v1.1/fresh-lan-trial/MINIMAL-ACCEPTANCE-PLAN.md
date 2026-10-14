# 第一阶段 Fresh LAN Trial — 最小验收方案

日期：2026-10-14。状态：PROPOSED — WEB APPROVAL REQUIRED。本轮只提交方案；未授权实施或Hosted。

## 基线与交付定义

公开仓库KG718718/spxt-public；已核验LAN-2本地/远端基线9d1d8da21a1127b430b992b9681a46307134f5ec。唯一Master01a0db0e-c950-79e0-8e11-07155e0742f2，旧Master永久只读。旧LAN-2与全部worktree/失败证据保留。

建议独立First-stage Fresh LAN Trial，在批准后从包含本方案与批准记录的已确认最新公开HEAD建立codex/lan-fresh-trial-v1.1，生产代码基线仍为上述9d1d8da。只面向全新Win10 x64 Host；交付一个包含现有Runtime、Launcher、Firewall helper的独立试用Setup及简短使用说明。无需另装Node/npm/Git；客户端以浏览器使用。沿用appVersion1.0.0、dataContractVersion1、业务schema、Runtime identity schema、AppId/registration key及LAN安全模型。

提议文件名K-SESSION-Fresh-Trial-1.1.0-beta.4.exe，试用限定写入说明与新验收报告；不复用旧失败包或覆盖旧Artifact，不创建tag/Release。installerVersion继续1.1.0-beta.4，未发行候选以source/run/EXE SHA256区分；由网页版确认该标识。

## 必须批准的最小安装器差异

当前setup-beta4.iss的InitializeSetup会为已有登记进入UpgradeMode并接受精确F3 beta.2。这是现有功能事实，因此仅改变文件名/测试范围不足以保证“只全新安装”。

建议增加独立fresh-trial构建模式，编译固化fresh-only入口，在程序复制/事务前严格拒绝同AppId登记、保留BindingKey、同名快捷方式、非空或不安全安装目标、已有业务instance/旧数据及运行中产品。已知位置只读检查，选择新空数据目录；不得扫描内部SPXT、不清理旧登记/数据、不猜测迁移或通过命令行解除限制。拒绝时保持原文件与数据不变。

该门禁是试用模式的更严格产品边界，须网页版明确批准；旧标准构建模式、F3 trust/profile、upgrade/rollback实现和旧测试接受条件不改。不是删除升级代码，也不是放宽安装条件。保留现有路径/重解析点、manifest/hash、空间/权限、独占锁及零业务种子保护。不要改Launcher/Node/LAN生产逻辑来适配Hosted虚拟网络。

## 独立验收矩阵

以下为新路径目标，当前全部NOT RUN；不得继承旧局部PASS作为新候选最终结论。

| ID | 第一阶段硬门禁 | 自动/人工边界 |
|---|---|---|
| F01 | fresh-only拒绝旧登记/Binding/旧instance/非空目标/运行冲突，拒绝无修改；干净环境实际Setup成功 | 合成反例+Hosted真实fresh Setup；不真实升级/卸载 |
| F02 | 安装后program/Runtime/Launcher/helper manifest、绑定、登记、快捷方式身份一致；首次零员工/客户/业务种子 | Hosted真实安装后校验 |
| F03 | 实际安装Launcher启动，唯一受控Node、根锁独占、Local可用；首Admin仅Host loopback；远程初始化拒绝 | Hosted实际单实例与真实HTTP/浏览器；第二Launcher GUI交互人工 |
| F04 | 明确选择/可信确认才启用、双明确监听、selected subnet guard、端口exclusive bind及持久化；冲突不漂移、网络变化fail closed | 本地/Hosted生产模块合成安全门禁与隔离socket；真实网卡选择/UAC/完整Launcher启用人工 |
| F05 | 实际安装payload的登录页、Admin初始化、两独立账号/会话、基本项目保存/回读、附件上传/下载一致、权限/注销隔离 | Hosted无头浏览器两个独立context；API补验不能冒充浏览器 |
| F06 | 正常受控退出/锁释放后再启动，账号、业务记录、附件、LAN config/port/preference保持；后台无残留 | Hosted真实退出/重启；不卸载、不reinstall；Win10物理重启人工 |
| F07 | Firewall拒绝虚拟/不安全网络；Private+精确程序/端口/subnet规则、无Public/宽泛放行；只处理自有规则且cleanup可证 | 保留合成/受控NetSecurity API证据；真实生产helper授权与实体连通人工 |
| F08 | 冻结业务核心26 suites/742 checks，fail0skip0；新trial/safety/browser测试单独计数 | Candidate及独立QA分别核验，不删旧业务/安全反例 |
| F09 | Artifact严格文件白名单、source/安装EXE SHA256、无账号/Token/路径/网络信息/raw日志/业务正文；失败不能交付成功包 | Candidate+独立QA，实际报告观察后才生成成功状态 |

F05需要新接线指向实际安装后的Runtime/程序/instance。现有production-sessions.test.cjs使用repo/server.js、fetch及test-only discovery preload；只能复用其合成双会话/安全语义，不能原样声称“已安装应用浏览器完整PASS”。注入必须显式TEST_ONLY、独立证据、不进入用户包、不替代生产候选/虚拟排除条件。

不得为F04/F07让Hosted虚拟网卡通过生产信任检查。保留虚拟网络正确拒绝，隔离测试验证服务端逻辑；真实“选择网卡→UAC→LAN READY→第二设备”由最终Win10验收闭合。无自动PowerShell发现、Native ABI/COM或Server2025 MessageBox研究。本路径不禁用全部runner adapter，不复用U27断网/恢复链；仍需证明自有进程/锁/临时Firewall规则收尾，失败即阻断。

## 历史结果及延期

| 历史项目 | 原证据结果 | 第一阶段工作状态 |
|---|---|---|
| LAN-2完整升级/rollback/卸载重装Full | 历史FAIL原样保留，局部PASS不能代完整验收 | DEFERRED；不作为本阶段fresh放行条件，不重跑完整链 |
| U27，Run38429594054 | FAIL；KSESSION_REJECT_NONEMPTY，program残留；恢复校验FAILED | DEFERRED；不清残留、不改NONEMPTY谓词、不解冻预算 |
| Full #4及LC01 GUI | FAIL；历史具体根因未全部证实 | DEFERRED；旧报告不改，第二Launcher物理行为HUMAN_PENDING |
| Batch4受验F3 beta.2单机版 | 原PASS及人工1—10 PASS有效 | 独立保留，不作为新trial的自动PASS来源 |

新报告中分别保存历史result=FAIL和workStatus=DEFERRED。不得把DEFERRED写成PASS/skip，也不通过改旧verifier缺少U27仍PASS；新增fresh verifier/report/workflow，仅约束F01—F09。升级/卸载程序仍存在时保持现有安全行为，但不承诺其生命周期认证、试用数据迁移或未来升级路径。

## 执行编排（批准后）

Master只派单/Review/Git/Actions/治理。一个长期FRESH-TRIAL-T1 Execution与独立worktree/local branch处理fresh-only构建、独立fresh harness/浏览器/验收报告接线与本地反例；需要返工返回该Thread，不创建普通sub-agent。一个独立FRESH-TRIAL-QA Thread审查最终候选及只读QA；Execution/QA不得创建后代或push。本轮不创建/派单。

先完成本地无真实安装的反例、生成器、Go编译、PS语法、manifest/report/privacy与触发互斥门禁，Master独立Review后才使用Hosted。新入口不调用原Full/LC01/U27，不下载F3、不构建六个upgrade fault安装器；仅构建一份试用candidate，不把旧TestSetup整体搬入而带回uninstall/reinstall。

## 建议GitHub预算

| 用途 | 最大新run | 准入与停点 |
|---|---:|---|
| Fresh Trial Candidate | 1 | 本地门禁+Review PASS；一次实际fresh安装/F01—F09与核心回归 |
| 独立Fresh Trial QA | 1 | 只在Candidate PASS后；同source、下载同一EXE并核验SHA，重新fresh验证和只读独立审查 |
| Diagnostic / 旧Full / LC01 / U27 | 0 | 不借旧额度，不自动retry或追加 |

合计最多2次新Hosted。建议每次45分钟硬超时；正常耗时工程估计Candidate15—30分钟、QA10—25分钟，总25—55个job分钟，取决于下载/浏览器/runner速度，不是账单金额承诺。最近U27单job实际约11分23秒，仅供工程估计，不能等同新路径时间。预算按run次数计，不挪用QA调试；任何阶段FAIL/UNKNOWN或资源收尾未证即STOP交网页，不无修改retry。

Candidate Artifact为隔离审查用，QA未通过前不交普通用户。QA验证同一待交付EXE字节，不用不同rebuild冒充。QA PASS才提供source/run/Artifact/EXE SHA及试用下载链接；状态FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING，不称Full PASS/企业LAN认证或正式Release。

## 最终一次Win10双设备验收

1. 在无已有K⁺-SESSION安装/数据的新Win10 x64环境安装试用包，使用新空目录和测试数据。
2. Host本机创建Admin并登录，确认初始LAN未自动开放。
3. 显式选择可信公司/家庭真实网卡，确认可信与Private状态，用户授权Firewall并开启LAN。
4. Host通过显示的LAN URL访问；第二电脑或手机浏览器登录。
5. 两独立账号并发读取/保存，附件上传/下载，退出一个账号不影响另一个。
6. 第一Launcher运行时再启动，验证正常派发或明确INSTANCE_BUSY及自然退出、无第二后台；旧LC01 FAIL仍是历史。
7. 正常停止后重启Host/应用，确认数据/附件/端口/网卡preference保持与URL正确。

真实UAC、网卡与双设备连通、可见向导/Launcher交互和实际双启动结论只由本轮人工提供。未发生的真实DHCP变化、其他OS/浏览器范围不宣称已认证。任何人工FAIL停止交付扩大，不自动修复/放宽；人工PASS也仅为fresh限定试用，不认证延期生命周期。

## 请网页版明确决定

批准或调整：独立fresh-only构建及拒绝旧环境门禁、上述自动/人工分工、beta.4 Fresh Trial标识、Candidate1+QA1总2次预算。尚未批准实施、建分支/Thread/worktree或触发任何测试。本轮仅方案治理，不访问内部SPXT，不操作main/tag/Release/Batch5/OCR。
