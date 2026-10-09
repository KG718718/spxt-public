# LAN2-LC01 RESULT

2026-10-09。TASK LAN2-LC01；Execution 01a11f35-5133-7ab0-9101-d9d01a69ccea；唯一回单 Master 01a0db0e-c950-79e0-8e11-07155e0742f2。
任务分支 codex/lan2-lc01-launcher-lifecycle，基线5121d8195c1986c83dca9ad0f681463868084f04。
状态：PASS — 静态诊断交付；历史具体根因 UNKNOWN，LAN-2继续BLOCKED。不是产品/Hosted/升级PASS。

## 1. 已证位置

Full #4 Run36388264496@2e9294d9a61426dac428f7c8ff8a12d36a4bbbb8 / Artifact10955343405历史FAIL不改。既存生成harness/upgrade_windows_test.go:552–594先安装受验F3 beta.2，U01后启动其program/K-SESSION.exe；READY后立即启动第二个同路径EXE，20秒context，丢弃second.Run结果，context失败报second Launcher did not exit。尚未升级beta.4。指定六JSON中升级报告仅U01 PASS、总FAIL；阶段OFFLINE_LIFECYCLE FAIL，网络restored=true、firewallChanged=false。六JSON没有第二PID锁结果、窗口类别或派发结果；超时细节来自冻结停止记录及生成门禁，不能冒充完整运行根因证据。

实际旧EXE对应c8886e6b6d413c2fd73d6716621d07a80b337e58:tools/windows-launcher/main_windows.go：

- 423–430：同instance class；CreateFile share=0。sharing violation32才dispatch；成功返回nil，失败INSTANCE_BUSY。该失败分支未取得锁、未创建controller、未spawnNode。
- 308–322：最多100次窗口/同EXE owner查找，未找到sleep100ms；找到后一次SendMessageTimeoutW(openMsg或stopMsg，15000ms)，要求非零且reply=1。不是当前HEAD的15秒总deadline。晚找到窗口时，查找加发送名义耗时可能接近25秒；owner查询等没有独立deadline，15秒不是全进程上限。
- 366–373：健康通过写READY，随后c.text/openBrowser(ShellExecuteW)，start返回后468–473才进入GetMessage/DispatchMessage。READY不能证明首次ShellExecute已返回或消息派发已就绪。
- 224–243：openMsg可能恢复已退出child；正常活child路径仍同步健康检查/openBrowser，再ShowWindow/SetForegroundWindow，最后reply=1。浏览器操作没有Launcher自己的deadline。
- 33–35、485–491：fault先调用模态MessageBoxW，返回后才os.Exit(1)。安全拒绝成立也不保证无人值守退出。
- 200–219、249–254、266–275、285–287：stopMsg cleanup私有child/锁/日志并DestroyWindow；WM_CLOSE先确认弹窗；WM_DESTROY PostQuitMessage，主循环退出后defer cleanup。WM_CLOSE不能当无确认停止。

当前HEAD main_windows.go:365–410已是不同的dispatch deadline；544–550锁分支与609–615错误弹窗仍在。Full #4与任务基线相关生产/生成器diff为零，但当前实现不能解释旧beta.2 EXE。

## 2. 产品 / 测试 / UNKNOWN及证据

已确认测试缺口：prepare-hosted-harness.cjs:95–111接受busy拒绝与成功dispatch，却未处理旧EXE的拒绝弹窗；丢弃Run错误/退出码，未区分启动失败、成功、明确拒绝、context终止。lock-lifecycle.test.cjs:216–220仅检查生成源码标记，未验证真实Windows交互。20秒FAIL是有效停止证据，不改PASS。

已确认产品事实：正常第二次启动向现有窗口派发openMsg，并不必然返回INSTANCE_BUSY；同步浏览器操作在READY之后、openMsg回复之前。模态错误提示是既有行为，不据此认定产品设计错误。

基于证据的最小候选集合：(A)首次ShellExecute/UI未就绪导致dispatch失败→INSTANCE_BUSY弹窗等待；(B)窗口/owner不可用或消息超时→同样弹窗；(C)锁前校验失败→其他fault弹窗；(D)尚在派发/启动路径，包括接收方ShellExecute或查找+发送超过20秒。没有运行分类证据，不能选择唯一原因。READY不证明第二进程取得或未取得锁，也不排除旧child后来改变状态。

历史产品缺陷归因UNKNOWN：不能断言只是测试超时、一定是弹窗、第二Launcher取得锁或beta.4生产缺陷。本机重现也不能追认Hosted唯一根因。

微软官方API语义核实（2026-10-09）：[MessageBoxW](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-messageboxw)为模态对话，返回按钮结果；[SendMessageTimeoutW](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendmessagetimeoutw)等待窗口处理或超时，失败和超时可能均返回0；[ShellExecuteW](https://learn.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shellexecutew)处于上述同步代码路径。资料不证明历史调用实际停顿。

## 3. 最小修复建议（未实施）

先限于测试：保留精确历史beta.2 EXE；改Start+有界Wait，保留固定启动/退出/context分类；只对第二PID的受控错误对话识别固定INSTANCE_BUSY类别，记录后仅关闭其确认按钮，再要求有界退出及明确拒绝退出码。派发成功须正常退出；其他fault、无可识别窗口、超时均FAIL。原Launcher/Node仍活、独占锁仍占用、READY无增加必须保留；强制终止第二进程不能当正常拒绝PASS。消息就绪观察不能用READY或固定sleep代替。

不建议单纯扩大20秒、忽略context失败、跳过第二实例、改受验beta.2或用新dispatch解释旧EXE。无弹窗自动退出、异步浏览器、隐藏非交互参数均属生产/UX变更，须另批，本任务没有实施授权。

## 4. 低成本专项验收与本轮验证

实际仅静态审查冻结源码/历史beta.2 Git对象、指定六JSON和生成Go，相关diff/分支身份核对及微软API查阅；未运行单测、编译、EXE、网络、安装器。实机0/1 UNUSED，Actions/Full/QA=0。静态证据已足以证明测试预期缺口，具体根因按授权UNKNOWN收尾，不新增harness。

未来专项建议（未申请/未执行）：单个research-only合成instance、LAN关闭、loopback；确定性覆盖dispatch成功、窗口/owner不可用、消息超时、INSTANCE_BUSY弹窗、其他fault、启动失败/context、错误第二后台。每项固定PASS/FAIL、零skip；受控PID/句柄关闭、锁释放及未知文件hash均验收。若必须真实Win10，先给Master源码/隔离资源/总时长（例如90秒）Review，仅一次运行，精确关闭自身PID，失败即停。不下载/安装旧包，不重建冒充受验身份；已有合格独立资源不足时记能力不足。

现有生产/测试diff为零，冻结开发分支仍5121d8195c1986c83dca9ad0f681463868084f04。仅任务SPEC/ORCHESTRATION/RESULT；无push、Full #5、QA或旧工作树清理。

## 5. 是否需要产品 / 安全决定及回单

诊断本身无需新产品/安全决定。测试方案须Master审查并另批实施范围和实机资源；生产第二次启动用户交互/退出语义改变须产品决定。锁、同EXE owner验证及数据安全边界不得放宽；LAN-2止损继续，本报告不授权Full。

主动回单目标01a0db0e-c950-79e0-8e11-07155e0742f2；local commit在发送时提供。冻结报告后发送结构化回单，核验返回目标；失败另记DELIVERY FAILED。主控负责Review与最终五项返回。
