# LC01-DIALOG-R1 Master Review / STOP

2026-10-13。REVIEW PASS — RESEARCH ONLY；实际失败条件仍UNKNOWN，LAN-2冻结。

唯一原LC01 Thread回单96cccff86b7280702a005d2ac6e58973392928e1、010cfba131979116786e36eb86f4fdbd9d795acd；Master分别整合为7d93029、04ea4ec。纯布尔补充随后整合61c5888/15f8308，最终受审代码15f830824b4d80ef544bedb3adadb3552d165291。公开集成基线e2a5d10，问题Run38362515475受测95a03c4。只新增两份研究测试及评审/回单文档，没有改生产、原policy、Windows adapter、生成器、workflow、可信身份、事务、rollback或业务schema。

## 独立验证

- 三个版本（Execution起点7093862、受测95a03c4、Master基线e2a5d10）的policy和adapter Git blob逐一一致。
- Master在受验F3 source c8886e6b6d413c2fd73d6716621d07a80b337e58读取core/main，逐字核对product、INSTANCE_BUSY消息及错误编号拼接：标题、正文与policy常量均相同，MessageBoxW hWnd=0/type0x10。
- 新增Node源码审查3/3 PASS，fail0skip0；不是再次运行历史F3解包研究。
- 固定Go1.27.1离线执行纯策略及显式lc01dialogresearch合成测试：126项PASS（包括父测试/subtests；其中R1研究61项），fail0skip0。无Windows API调用、真实进程或窗口观察。
- git diff --check PASS。研究Go文件只在显式build tag下启用；Go overlay仍只注入原policy/adapter，公共26/742 runner也不扫描该研究Node文件，既有门禁接线未变。

## Review结论

1. 旧安全报告BusyClosed=false与DIALOG_MISMATCH共同收窄到首次present后的lcExactBusy=false；本次不是重复确认分支，原字段不足以确定哪个条件为false。首次窗口PID/class/存活/映像及子控件读取若提前报错，会是WINDOW_IDENTITY_FAILED，不应与当前失败族混淆。
2. 已证的测试假设缺口：adapter把任何非空Static的缓冲区视为文字，只保留最后一个正文。微软WM_GETTEXT规范区分非文字Static/SS_ICON缓冲区语义；非空图标缓冲区的纯模型会产生TextCount=2并拒绝，顺序还能影响TextMatch。真实Server2025是否触发该路径仍未证，不称唯一根因或生产缺陷。
3. 研究诊断草案已拆分各项固定Observed/Match布尔和阶段/分类one-hot布尔，未知/未到达不得默认为true或false；MATCH要求完整证据全部为true，矛盾/缺失/敏感字段均不接受。dialogAlreadyConfirmed只记录分支。Master预审的聚合过粗与矛盾分类问题已退原线程补反例后关闭。尚无实机collector或接线。
4. 最小建议是将来获批时先取得字段观察，再按证据修测试中的正文/预期图标分类；不能简单减少检查、忽略额外控件、点击未知窗口或把cleanup强杀当PASS。无owner window符合F3源码，不要求owner=第一Launcher。
5. 同一桌面上的Win32枚举/消息自动验证有条件可行；该Run已到达可枚举/读取的对话框，不能断言Hosted完全没有窗口能力。但稳定交互桌面、实际控件布局与自然退出路径尚未证明，不能承诺非交互Runner可靠覆盖真实用户交互。物理Win10可见弹窗/OK行为、第一Launcher继续运行、无第二后台、正常退出，以及双设备LAN/真实Firewall授权仍待人工。

详见LC01-DIALOG-R1-REVIEW.md中的Microsoft官方引用。所有来源原文仅用于规范审查，没有运行新Hosted或实机probe。

## 停止

本轮新Actions/Hosted0、Full0、QA0；旧Run/Full #4 FAIL及根因UNKNOWN保持。原Execution停止，工作树/分支/失败证据保留；仅研究和治理非force推唯一开发分支，等待网页版决定下一轮范围/预算。没有beta.4最终包，没有Final Full准入。

规格补充：local224c2c4/48b8b6f整合61c5888/15f8308。公开观察载荷全部为boolean，内部三态不直接输出；每项Observed/Match与阶段/分类one-hot明确区分未知和不匹配。严格拒绝JSON null（避免Go bool解码将null保留为false）、其他非bool、缺/多key及矛盾分类。Master在最终15f8308独立重新跑纯Go126项（R1研究61项）fail0skip0；来源Node三项代码未改，本轮3/3结果仍适用。这是研究schema验证，不是实际collector实施。

文档核对更正：无弹窗自然exit0且guards通过已经是既有DISPATCH_SUCCESS，不需重新设计产品契约；只有忙碌拒绝路线需要精确弹窗确认后exit1。人工验收不得要求正常派发强行产生错误弹窗。此更正只忠实记录现有policy，不改代码或验收规则。
