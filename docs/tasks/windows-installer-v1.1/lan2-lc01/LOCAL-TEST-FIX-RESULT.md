# LAN2-LC01 阶段1测试修复结果

2026-10-09。Execution 01a11f35-5133-7ab0-9101-d9d01a69ccea；唯一Master/return target 01a0db0e-c950-79e0-8e11-07155e0742f2；续行基线d07b0bf558f5463c81bff7fa6fe982f761fb06fe，原任务分支。

阶段1本地门禁PASS，等待Master独立Review。阶段3资源BLOCKED，实机0/1未使用/未授权；历史Full #4具体根因仍UNKNOWN。旧RESULT及历史FAIL没有重写。

## 修复及边界

第二Launcher段不再丢弃Run结果或把任意非零退出当拒绝。测试adapter持CreateProcess原始handle，用创建时间和镜像身份核验第二进程；标准#32770、产品标题、完整INSTANCE_BUSY正文、唯一标准Button/IDOK、其parent/owner/可见可用均精确匹配，发送前再读取核对。只有这一消息路径能确认弹窗，不发送WM_CLOSE，不点击其他PID/窗口。

实际Go状态机区分DISPATCH_SUCCESS、INSTANCE_BUSY_REJECTED、START_FAILED、TIMEOUT及固定失败原因。成功须自行退出，明确busy必须exit1且已精确确认；任何其他非零、未知/错弹窗、deadline/错误或cleanup强制终止不能PASS。确认排队后只能等待同一精确弹窗关闭/第二自行退出，不能重复点击。

保留第一Launcher/Node原始身份、锁占用、READY不增加；补NODE_SPAWN不增加、第二父子进程快照。事件日志解析严格，读取/JSON失败不能按0计数。快照只是保守辅助，不能单凭PID/句柄持有宣称永不复用或覆盖所有短暂后代；存活期间点击安全依据是原始handle+creation+image+live。第二退出后只用其原始handle创建时间确认退出对象，PID扫描疑义保守FAIL。

close/cleanup都进入结果，窗口和子窗口callback固定2个而非轮询中新注册；文本读取单次50ms、第二总20秒边界保留。失败cleanup只作用于自己CreateProcess返回handle，3秒等待并检查关闭；不凭PID终止。Win32辅助仅编译，未运行，不能把纯函数反例当真实UI已验收。

## 实际本地验证及失败历史

纯Go测试直接调用实际lcRun/lcExactBusy/lcParseCounts，模拟边界/虚拟时间，不调用UI、网络、Launcher或业务Node。覆盖窗口未准备/dispatch等待、精确busy、缺失/错弹窗、其他PID、PID/创建身份不匹配、点击前身份变化、其他fault、意外退出、启动失败、deadline/慢API、会话/锁/事件/进程链失败、强杀不能PASS、cleanup/句柄关闭失败及事件日志损坏。

最终Go JSON含subtests共64个PASS测试记录、0FAIL/0SKIP；Node联合77/77、0FAIL/0SKIP。固定JSON中的sourceFilesSha256是本地门禁时工作树字节hash；不是受测F3 EXE来源证明。

新增Node专项验证实际policy/adapter完整嵌入生成Go、保留门禁及callback/cleanup边界；兼容/事务/原锁套件与其一起运行。锁反例只运行合成PowerShell文件持有者，临时资源限定本任务.test-work；没有Launcher、交互probe或后端进程。

首次编辑的helper声明误入生成Go模板，Master即时Review指出，已修模板边界；未将其声称生成或编译PASS。随后新增Node专项首轮3/5 PASS、2/5 FAIL，原因为gofmt后的结构正则空白差异，已修断言并完整复验，不修改实际安全条件。后续加强deadline/严格事件日志/退出后identity处理后重新纯Go测试和离线编译，最终计数见LOCAL-GATES.json。

Go固定1.27.1，既存存档SHA256匹配toolchain.json；GOTOOLCHAIN=local、GOPROXY/GOSUMDB=off。实际纯函数go test/vet；生成overlay后go test -c只编译、不执行Windows测试EXE。Node语法检查及git diff --check。所有路径证据和编译EXE只留任务.test-work，不提交二进制/缓存。

## 实机计划与风险

完整门槛/资源/时限/cleanup见REAL-RUN-PLAN.md。现有有界公共资源检查没有精确F3 Launcher+Runtime或可安全静态解包归档；不构造stub或source-equivalent替代。当前只交已可Review判定辅助源码；资源确认后才补独立controller源码并再Review，不能自动实测。尚无真实第二路径结果，历史具体根因仍UNKNOWN。

修改仅beta4第二Launcher生成器/针对性测试、research-only纯Go策略/反例、任务治理；现有生产Launcher、Setup、identity、transaction、rollback、schema、网络CI脚本和冻结分支零diff。无push/Hosted/Actions/Full/QA/后代Thread，无LAN-2解冻或旧工作树清理。local commit由主动回单提供。
