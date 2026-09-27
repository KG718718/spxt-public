# Batch 4.5 Master Review Log

当前均为实施中的提前Review，未形成最终验收。

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