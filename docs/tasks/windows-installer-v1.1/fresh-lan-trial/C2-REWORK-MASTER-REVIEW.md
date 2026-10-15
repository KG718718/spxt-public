# C2 返工 — Master 独立 Review / 最后完整 Candidate 准入

2026-10-14。原 FRESH-T2 正式 RETURN `184308ec9ab3b96e138e8348b56cb67864da0f38`，原 bea7 / codex/fresh-t2-installer-ci、68880d6 基础一笔六文件。结论 REVIEW PASS / C3 ADMISSION；不表示 C2 首个原因已唯一证明或安装通过。

## 事实与因果限制

C2 Run38572354045 / Artifact11897209874 的 BUILD/LAUNCHER_UNIT/COMMAND_FAILED、checks空、setupSha空、cleanup10/10true原样保留。完整实际 builder→环境恢复→重复28→strict report在本地通过，BOM/alias/CGO的“就是C2原因”推测不能成立为已确认结论。

可独立证明的具体源码缺陷：父重复unit恢复后继承未知Go配置/cache/temp，实际原source native mock观测CGO1/auto/非空flags/未知cache；同一路径没有与内部builder相同的固定隔离边界。父throw还丢失已产生Go JSON/strict report的安全失败子结果，只留下COMMAND_FAILED。这两项属于用户自主Loop明确批准的测试环境/报告接线工程缺陷；不是产品/安全路线改变。

## 最小修复与独立复验

Fresh父重复28保持，改用现有owned physical环境的私有cache/temp与明确windows/amd64/CGO0/local/offline/空flags；snapshot、双层finally与恢复检查，Exit异常仍恢复并FAIL，恢复失败明确ENV_RESTORE_FAILED。不写、不清未知用户cache。原28名单、测试和go-test-report文件/成功判定零diff，不能以新的diagnostic代替实际原report。

新阶段只为Environment/Policy/GoJSON/Report；原LAUNCHER_UNIT历史继续可读。四字段固定diagnostic区分真实exit、缺失/不可读/非法JSON、失败/skip/package/集合不符；单一实际top-level失败仅能输出原28固定名，多项/未知泛型。raw输出、路径/PID/未知名称不会进入Artifact。显式build-fail或FailedBuild即使exit0和完整pass也FAIL；Master预审指出的该矛盾已经用反例闭合。整体PASS仍只允许COMPLETE/PASS和全F01—F09/全部cleanup。

Master在最终受审树核验固定Node24.21 EXE SHA，实际独立Fresh123+旧compat20=143/143，fail0skip0。实际PS原source污染观察与新parent block的正常、Go失败、非法JSON、report冲突、Exit异常和恢复失败均运行；PS AST/CJS syntax/diff-check PASS。实际新owned环境的真实原Go28/strict report、实际完整builder重放及overlay compile/vet来源证据已核验；无产品EXE执行/安装。workflow/旧标准路径、客户38项、业务、Setup、可信身份、事务、rollback、安全规则零改。

## 中央决定

实际修改已闭合两个有针对性反例证明的工具封装缺口，未降低验收。C2具体Hosted首个故障仍UNKNOWN，不能声称已解决；但源码执行边界已修为确定性，安全结果丢失已修，此轮具有已批准普通工程Loop内的完整Candidate准入依据，不是无修改retry或另开Diagnostic。只允许最后C3完整F01—F09；若失败立即停止，不申请C4，不借QA调试。首完整PASS才独立QA同一个EXE。

当前Candidate2/3、FinalQA0/1，旧Full/U27/LC01/Diagnostic0。整合并三方SHA核验后中央C3，真实ISCC/安装/26-742与物理人工项尚未通过。原C1/C2及全部历史FAIL不改写。
