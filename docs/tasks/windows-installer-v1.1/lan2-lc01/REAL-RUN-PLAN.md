# LAN2-LC01 唯一Win10专项待Review计划

2026-10-09；原Execution/原任务工作树/原分支；唯一Master 01a0db0e-c950-79e0-8e11-07155e0742f2。
当前仅阶段1。真实额度0/1，REAL RUN NOT AUTHORIZED。此文件不是执行命令或阶段3授权。

## 实测来源门槛（当前BLOCKED）

现有Win10专业版10.0.19045、64位，只读查询确认。本地Go1.27.1存档hash与公开toolchain.json精确一致；无需安装/下载工具。用于本地测试的Node CLI是测试工具，不是拟受测的private Node。

优先且唯一拟用受测身份是受验F3 beta.2：source c8886e6b6d413c2fd73d6716621d07a80b337e58 / Run36246132535 / Artifact10907910968；Launcher SHA256 0abe466cf580673e436deb9283dbd551ad1cb4b89f15b4c1cba5b60e66983b89；runtime manifest SHA256 9cbae719e33456290c5c12d71b27e1fe4db0bc93f4e6b25f771ddf6bc6075671；Node24.21.0 SHA256 ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32。其余锚以accepted-f3-beta2-identity.json为准。

有界静态检查任务树，公共checkout内已知full-review-36246132535、full-range-review-36246132535、b45-identity-review-36281720897、qa-review-36249047967，以及公开审计输出顶层：均为固定JSON/治理脚本，未找到精确Launcher+匹配Runtime或可解包的F3归档。未扫描用户目录、内部版、实际部署或未知缓存。Master已知资源缺口，Execution不再追加搜索。

需提供上述精确公共资源的确切位置和来源证明。若只有旧Setup归档，须有已存在且可核验的静态解包工具，并先审查无安装执行的解包流程；不得运行Setup/注册表/快捷方式写入，不下载工具。无合格资源时保持BLOCKED0/1，不启动纯GUI stub、历史源码重建或其他research runner来消费实机额度。历史源代码重建最多证明source-equivalent行为，不是受验F3，当前明确不采用。

## 已可Review源码

- tools/research/lan2-lc01/policy.go：本轮实际Go状态机和完整弹窗证明判定；纯合成测试使用同一文件，无Node镜像替代。
- tools/tests/windows-installer/beta4-upgrade/second-launcher-windows.go.in：CreateProcess原始第二句柄、创建时间/镜像/存活核验；窗口读取/二次复核、唯一IDOK消息、自然退出和受控失败cleanup。
- prepare-hosted-harness.cjs把二者原样嵌入既有upgrade Go overlay；不会创建新的CI入口，也不修改生产。现有2个文件映射继续有效，不需改offline-ci/network脚本。

Windows adapter仅离线编译，真实API/UI路径未运行。具体独立实机controller须在资源来源确认后，由原Execution补齐并交Master再次Review；当前不提供可误触执行的runner。资源未知时编造完整可执行启动/清理脚本反而无法证明安全。没有controller源码及其Review就不能进入阶段3。

## 单次实测步骤（全部准入后才执行）

1. Master核对资源hash/来源和固定controller local commit，另发明确阶段3授权。新建本任务.test-work下唯一fresh run目录、合成instance与程序副本，拒绝existing非空、reparse、交叠或越界；原资源只读。无身份/业务数据导入；独立合成instance LAN关闭，仅loopback。默认8080—8099若无可用口即失败，不终止占用方、不更改网络配置。
2. controller启动前证明总预算不超过90秒（first ready最多20秒、second既有20秒、退出/cleanup分段有界、剩余预算留证据）。原始handle持有与自己的Job监督/cleanup源码必须完成Review，不能只靠go test timeout防止孤儿。启动第一受验Launcher到合成instance，无安装绑定更改。若原binary的既有只读绑定检查拒绝，记录FAIL，不修注册表或绕开身份。
3. 第一Launcher与private Node都持原始句柄/创建身份、精确镜像；确认合成READY/NODE_SPAWN和loopback健康。真实专项只启动一次第二Launcher，不人为操纵网络、超时或窗口来触达额外分支。adapter执行唯一原定路径，不再加probe。
4. 第二路径仅DISPATCH_SUCCESS（自行exit0、未关闭弹窗），或完整身份匹配的INSTANCE_BUSY_REJECTED（只确认其IDOK、自行exit1）；其他退出、未知/缺失/错弹窗、启动失败、timeout全部FAIL。记录固定类别和布尔，不保存窗正文、路径、PID、账号或网络身份。
5. 同时核对第一Launcher/Node仍存活、锁占用、READY/NODE_SPAWN不增加、第二自身进程链无新child。PID快照只作保守辅助，不能宣称覆盖瞬时已退出child；已受验源码锁分支、日志与句柄证据一起评估，任何未证项不PASS。
6. 向经过同样镜像/创建身份核验的第一Launcher仅发送既有stopMsg，等待受控Launcher和Node退出、独占重开/关闭锁；关闭自身所有原始handle。失败时只可对自己创建且仍持原始handle的残留安全cleanup，明确CLEANUP且整run不能PASS；不得按PID查找/终止无关进程。保留fixed evidence与工作树，不清理旧资源。

## 结果与停点

一次真实run，无论结果均结束；无重跑/新增微诊断/Full/QA/Actions。PASS只说明本机该精确binary的一次第二实例行为及本轮测试判定成立，不追認历史Full #4根因，不解冻LAN-2。未知继续UNKNOWN。失败保留固定类别/cleanup/句柄结论，不把强制终止计自然退出。
