# LAN2-U27-R1 授权与执行卡

2026-10-13。仅定点核查/本地合成测试修复；Actions/Hosted0、Full0、QA0，继续冻结。唯一Master/return target01a0db0e-c950-79e0-8e11-07155e0742f2。

## 已核实现场

Run38402818839@27de942346b511c17a651d20e8e766173bc241f0/Artifact11816921345历史FAIL不变。用户带回网页版核实的实际日志：U26 PASS后runSetup(targetBeta4,true)报setup candidate success=false want=true，U27未记录，persistent inventory重新比较未执行。此比前次固定摘要更精确，只收窄失败调用，不证明具体拒绝原因、数据变更或产品缺陷。

Master基线1c6015aaeb3329dd6b8493694c0695f5ce2cbaa4；原LC01 Thread01a11f35-5133-7ab0-9101-d9d01a69ccea，原E:/CodexWorkspace/CodexWorktrees/lan2-lc01/public-source，codex/lan2-lc01-launcher-lifecycle@3cc99ff0d481634073a0e6dc9412da34e2906668。先对目标测试/报告源码同源核对，必要正常merge基线；不reset/clean/rebase、合并旧未审F3解包研究或创建thread/worktree/sub-agent。

## 分析与最小实施

只分析U26卸载完成后安装目录/登记/绑定/快捷方式/锁预期、beta4 fresh Setup安全前提、runSetupRaw现有exitStatus/固定marker、测试契约一致性及可能真实安全拒绝。优先现有代码和6个固定JSON；需要现有Run日志时仅内存过滤固定类别，不保存/打印原始日志、路径、PID、账号/数据或hash/长度，不用新安装或probe补缺失证据。

只修改Full测试辅助/生成overlay、对应纯合成反例、必要固定报告/验收验证接线与治理。历史tools/windows-launcher生产/测试基线优先不直接改，用beta4测试生成器隔离；不得改生产Launcher/Setup/Node、版本、卸载清理规则、可信身份、事务/rollback/schema或任何安全条件。旧文件/证据原义保留，不继续GUI/MessageBox/解包/VM研究。

将U26后的fresh beta4 Setup固定为U27_PRE_INSTALL阶段；失败必须保留经过验证的安全Inno退出枚举、既有严格白名单拒绝标记、安装前检查/复制/安装后校验的证据状态。没有可证明的阶段证据必须UNKNOWN/NOT_OBSERVED，不能把缺标记当已证未进入；marker顺序/退出/报告互相矛盾必须保留FAIL/UNKNOWN，不伪造PASS。严禁原始日志、原始退出消息、实际路径/PID/账号/业务正文及相关hash/长度进入新报告。

runSetupRaw当前mustRead日志可能在进程启动失败/日志缺失时先Fatal，必须确保这些失败同样能输出固定诊断，保持fail closed。Setup成功判定不能改，exit0之外不接受；原始必需日志/marker条件也不得通过catch忽略。复用原白名单和safeInnoExitStatus，不扩生产接受范围；无法安全归类报告不得成功。

## 本地门禁与回单

无真实安装的成功、安装前拒绝、进程启动失败、异常退出、日志缺失/读失败/非法标记、未知枚举、矛盾阶段、报告额外敏感字段、来源不符、失败不得转PASS反例，fail0skip0。生成器/static/syntax/diff-check与固定Go1.27.1 offline Windows overlay仅编译PASS，EXE不运行。维持原核心26/742门禁，不在本轮声称复测或运行成功。

Execution local commit[skip ci]、完整localSHA/文件/本地数字/已证与未证/生产修复是否需要/下一次最小真实验证建议，主动返回唯一Master；不push/Hosted/Full/QA/真实安装/网络/私有SPXT，不创建后代。回单失败Master read thread→RESULT/worktree/localcommit兜底。Master独立Review/必要复验/整合，仅开发分支非force文档与测试[skip ci]同步，最终交网页版并STOP。下一真实验证/预算只提出建议，未经新批准不实施或触发。\r\n