# Batch 4.5 Plan

唯一Master负责派单/Review/Integration/Git/Hosted；不直接写实质生产代码或测试体系。一层独立Execution→独立QA，禁止后代Agent。模型沿用gpt-5.6-sol / medium，复杂安全边界必须反例和独立Review。

|任务|范围|依赖及资源|
|---|---|---|
|B45-T5-PREFLIGHT|先只读核查第27节版本/Runtime identity/升级兼容及第13节双listener可行性|必须先回单；只可写本任务报告，不可修改可信策略|
|B45-T1|adapter、route/subnet、port真实bind、独立配置|预检无决策阻塞后启动；分配独立合成目录/端口|
|B45-T2|Node双listener、首Admin本机门禁、selected subnet guard|依赖T1接口；server/bootstrap核心文件独占|
|B45-T3|Launcher发现/选择/固定状态/复制/网络变化|依赖T1/T2；Launcher核心文件独占|
|B45-T4|最小elevated Firewall helper及安全反例|与T3共享核心时串行；不对开发机实际网络/防火墙做更改|
|B45-T5|beta.3构建、升级/卸载/重装、回归和最小CI|依赖前述，且必须先解决预检发现的版本兼容决策|
|B45-QA|独立安全、功能、数据、隐私与Artifact审查|集成后审查；不修改生产代码，问题退原Execution|

每任务精确baseline、local branch、工作目录、scope、测试、停止条件写完整卡。复用已空闲且历史已整合工作树，保留旧分支和未跟踪证据，不另clone或本地保存发行包。共享核心文件及端口/instance/注册表不并发。

已有明确冲突线索：upgrade-detection固定beta.1→beta.2、旧source/tree及封闭两个profile；build固定beta.2。用户第26节要求beta.2→候选，但第27节明确升级兼容必须修改时停止。先让独立Execution确认最小必改范围；不能把新可信身份接纳当作普通改名。若确认需要改变upgrade compatibility，立即决策卡，暂停依赖实现。

Hosted：专项4、Full LAN Candidate2、QA2；每次记录source/run/mode/Artifact/结果。相同失败无修改不retry，先证据→本地反例→最小修复→Master Review→Hosted。预算不互换，耗尽停止。
