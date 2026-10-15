# C1 返工 — Master 独立 Review

2026-10-14。原 FRESH-T2 正式 RETURN `68880d6c945b533df95af96c3bc59085c0b40bf3`，在原 bea7 / codex/fresh-t2-installer-ci，a767d10 基础一笔；原线程及现场保留。结论 REVIEW PASS / C2 ADMISSION；不是 C1 根因已唯一证明或 Hosted PASS。

## 已确认与未知

C1 `38566205060` / Artifact `11896545773` 的 BUILD/LAUNCHER/COMMAND_FAILED 和全部 cleanup=true 原样保留。原固定 LAUNCHER 阶段覆盖多个子命令，内部日志没有上传，公开 job 日志也只有外层状态；确证存在失败阶段接线缺口，无法追溯首个子命令。

原词法 Runtime dependency prefix 对合法 junction 表示误拒已由实际本地 Node 反例复现；物理化及严格实际文件/目录边界/每段无 link 的验证接受正确模块并拒绝越界、相似前缀、未知内部 link。不能将 junction 结果直接等同于单纯 SUBST 的 resolver 行为；Go/Node 的“必然导致 C1”推断已撤回，C1 唯一根因仍 UNKNOWN。

## 最小范围

七文件仅工具构建接线、安全诊断、反例及 RETURN：Fresh NODE_PATH 与 Launcher scratch 使用现有物理路径边界；新增八个固定实际构建子阶段，失败不吞异常，不上传 raw 字段。标准路径/ci-lan、客户 38 源闭包、业务、Setup 接受条件、旧身份/事务/rollback、安全规则均未改。没有由 Root 修改实质代码，没有新工作树或 Agent，Execution 无 push/Hosted。

## Master 独立复验

在受审树校验固定 Node EXE SHA 与 distribution.json 一致，实际 v24.21.0。Fresh118 + 原 beta.4 compatibility20 = 138/138，fail0skip0；实际 PS 环境分支、native pwsh switch双值、实际别名/目录边界/CLI反例都执行。PS AST、CJS syntax、diff-check PASS；workflow零变更。真实 Go 的合成 profile builder 旧28/fresh2/链接和完整 overlay compile/vet 来源证据已读，仅构建/合成测试，未运行产品 EXE或安装，不替代 Runtime/Setup真实验收。

Master此前原LAN44本地44/44保留，不当Hosted等价证明；带未知或仓库依赖时真实Runtime来源guard仍拒绝，不能为本机已有node_modules而删除该guard。整合仅本笔，不重复T1，源码与受审树一致后仅推fresh分支。

## 自主 Loop 决定

本轮实际修复可本地复现的构建封装误拒和已证固定阶段信息丢失；均属于用户最终授权的普通代码/构建/报告接线范围，未改变验收接受条件。C1资源恢复已证明，未触发强制停止。C2仍执行完整独立 Candidate F01—F09，不另开 Diagnostic 或无修改retry；结果须再次核验具体阶段及cleanup，不能以新增字段宣称实际行为PASS。当前 Candidate1/3、FinalQA0/1；C2正式触发后计2/3，首完整PASS即独立QA同EXE。
