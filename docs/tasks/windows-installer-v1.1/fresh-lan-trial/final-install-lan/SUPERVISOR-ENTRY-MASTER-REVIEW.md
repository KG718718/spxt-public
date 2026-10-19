# FC1 Supervisor Entry Closure — Master 独立 Review

2026-10-19。结论：源码接口、本地真实入口与严格固定诊断Review PASS；完整同源构建身份另见SUPERVISOR-ENTRY-MASTER-BUILD.json。本地闭合不证明历史FC1已恢复，不授权Hosted。

## 来源和独立结论

授权85817e6b56f3c2bc0c38a2cb25149f58fc56fbfa，原FRESH-T2/bea7树，最终实现cb2042de92cf4b578de73ee62863c62fbc04b26a（前实现c708cf1567817cbc3cfd6c1d5dd1f5eefb015908），代码指纹10788f0915a8dd798e0817010afd0210c75df9c593bf0a2764dbe95677aecedc。未使用普通sub-agent或后代Thread。

Master独立复现旧Read-FreshPhysicalWorkBinding对工作流正斜杠输入的提前拒绝，并核验workflow/supervisor/physical-work三份blob与历史受测source63e91f98一致。该缺陷足以阻断此路径，但历史日志没有具体子阶段，不能称历史唯一首因。另旧CI在Job握手前调用context Node，是源码时序缺口；Execution受控进程已复现，不等同历史Runner实际逃逸。

## 审查范围与安全边界

- 19个测试/进程封装/固定报告接线文件；生产Setup/Launcher/Firewall/Runtime/业务、安装接受条件、升级身份/事务/rollback零diff。
- 只允许固定根的已知斜杠形式规范化，仍保留原receipt、CANONICAL、设备、FileID/句柄与映射约束；未知路径/映射/权限仍拒绝。
- 子进程CREATE_SUSPENDED，实际IsProcessInJob核验后写gate并Resume。stdin/stdout/stderr三句柄白名单继承，Unicode环境与Windows参数quote已实测；任何失败不伪装自然退出。
- CI在任何context Node或ENV操作之前等待握手；来源/控制提交/branch/FP/Hosted身份验证保持，未加入本机模拟Hosted的运行开关。
- 入口诊断envelope严格source/control/run绑定，分类/布尔白名单；实际FileID只放独立私有ownership receipt，不进入日志/Artifact/固定诊断。
- 诊断文件首次CreateNew且持有ShareNone句柄；不按同名内容相同认领未知文件；异常写入固定紧急报告，stale/reparse/额外字段拒绝。
- finalizer只从验证过所有权的physical work读取。映射或FileID失效使恢复未知/失败，不遗留伪alltrue；原深层BUILD/F01/场景分类保留，附严格固定入口分类。
- report schema2和early schema1不随意增版，仅扩失败枚举及受限nested supervisor。PASS一致性加强；UNKNOWN/force/缺报告不转PASS。
- FC2的firstFailure/预算门禁、实际trigger、历史报告与账本计数均未改，未Hosted/本机安装/内部SPXT/main/tag/Release/未知清理。

## Master实际复验

最终cb2042de：目标68/68、root134/134、实际Windows入口64/64及共享core28/28，fail0skip0；真实Job assigned/natural/stdio/handles/jobEmpty全真，forcefalse。
Core负例仅允许精确一个固定报告写拒绝marker，并绑定sink-foreign拒绝观察；任意额外stderr仍失败。这是负例断言，不改变生产stderr安全语义。
Master另直接执行实际ci.ps1非法入口负例，固定CI_ENTRY_REJECTED、预期scope FAIL、Job空/管道句柄关闭且无force，未伪装Hosted身份/执行安装。本机Win10 build19045、PowerShell Core7.6.5；不声称支持WinPS5运行此.NET Core测试封装；该封装不进入产品Payload，不为用户增加PowerShell 7安装依赖。
Execution兼容physical26、恢复22、actual finally7、link15及Go7父/32子/vet在c708通过；最终四文件小修输入适用性及重跑范围见Execution固定报告，不冒充全部在最终源码另跑。

## 本地失败与纠正保留

- 开发中的Resume失败暴露异步管道未收敛即Dispose竞态，已最小修复并加入真实反例。
- 开发测试曾写实际受控cwd，已仅对精确自有证据脱敏为bool；无真实业务或凭据，无上传旧raw。
- Master第一轮误把共享core预期固定拒绝stderr当意外失败；仅修Master负例验证后复验。第二轮嵌套输出根过深导致native读取拒绝，实际同文件managed成功/native普通拒绝/extended读取成功反例已保留；后用短独立owned根复验，不放宽路径规则或扩一般长路径支持。
- c708诊断PASS+scope FAIL不一致反例由Execution发现并修成cb2042de，JS/PS一致拒绝；中间结果不改写。

## 剩余限制与下一步

历史Run39011056474 SOURCE/CLEANUP_UNPROVEN以及恢复NOT_OBSERVED仍FAIL/UNKNOWN。实际Hosted ENV、Fresh安装、F01—F09、浏览器、26/742及QA本轮未运行；实体LAN项目仍HUMAN_PENDING。
新增Hosted0，剩余FC2/QA各1均冻结；既有FC2 firstFailure仍拒绝历史恢复未知，不能把此本地PASS追认成历史收尾证明。下一次完整Candidate须用户另行明确解除冻结并确认准入方式。本轮仅治理非force同步及一次交接后停止。
