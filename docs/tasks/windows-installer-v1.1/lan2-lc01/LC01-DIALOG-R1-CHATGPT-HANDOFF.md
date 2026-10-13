===== CHATGPT HANDOFF BEGIN =====

项目：K⁺-SESSION公开版；Batch：LC01-DIALOG-R1。
结论：研究Review PASS；实际失败字段UNKNOWN；LAN-2继续冻结。
分支：codex/lan2-manual-host-v1.1。
受审代码/HEAD：15f830824b4d80ef544bedb3adadb3552d165291。
问题来源：Run38362515475@95a03c484d4a051f5fc4d10324faae98302ef4d4，Artifact11795027982；历史FAIL不变，本轮新增Run/Artifact/EXE SHA256=N/A。

1.【明确的测试假设问题】受验F3标题及INSTANCE_BUSY正文与测试常量逐字一致，排除源码文案不一致。adapter把所有非空Static缓冲区当正文并累计TextCount，最后一个覆盖Text；没有区分图标和文字。F3使用错误图标，WM_GETTEXT对非文字Static/SS_ICON有不同语义。纯合成模型证明非空图标会造成TextCount=2；但不能证明该Run实际如此。BusyClosed=false证明当前是首次lcExactBusy失败，不是确认后重复识别；Confirm未到达。窗口所属进程与GW_OWNER不同，F3合法没有owner window。

2.【仍需Windows观察】具体哪一条件为false仍UNKNOWN，包括创建时间、标题/正文读取结果、文字控件数量、按钮ID/class/数量/父窗口/所属进程、可见/启用。已设计逐项Observed/Match纯布尔诊断，阶段和分类也使用one-hot布尔；缺失或未到达明确UNKNOWN/NOT_REACHED，不记录原始窗文、PID、路径、句柄或其hash/长度。旧报告无法补回这些值。不能据此确定Server2025差异或历史Full #4根因。

3.【最小建议】以后若获批，先仅收集这些固定条件；只有证实图标误计后，才修测试中的正文与预期图标分类，保持精确身份、完整正文、唯一按钮及未知控件拒绝。不得忽略错误、放宽身份或点击未知弹窗。本轮没有实施collector或修现有验收代码。

4.【Hosted自动验证】条件具备时，同一桌面窗口API可自动验证可观察路径；当前Run已达对话框读取，不能说完全不支持。但稳定控件布局、正确确认和自然退出尚未闭合，无法保证非交互Runner可靠覆盖所有真实桌面交互。

5.【人工边界】最终物理Win10需看见并核对实际弹窗，点击OK后确认第二Launcher退出、第一Launcher/Node仍运行、无第二后台，再正常退出。双设备LAN与真实Firewall授权仍待最终用户验收，不能用Hosted代替。

实际完成：原长期LC01 Thread只新增隔离研究测试/设计，Master独立Go策略+研究126项（其中R1研究61项）、Node源码核对3项全部PASS，fail0skip0；diff-check PASS。原policy/adapter/生产/Setup/身份/rollback/workflow未改。Node/npm/Runtime体积等本轮非交付项=N/A。
停止：新增Hosted0、Full0、QA0；只保全研究与治理，原线程/工作树冻结。需网页版决定下一轮实施范围与测试预算，不自动申请或触发，不进入main/tag/Release/Batch5/OCR。

===== CHATGPT HANDOFF END =====
