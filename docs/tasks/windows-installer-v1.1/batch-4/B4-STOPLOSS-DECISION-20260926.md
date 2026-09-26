# Batch4 Hosted预算止损决策卡

状态：BLOCKED — HOSTED BUDGET EXHAUSTED。唯一主控01a0db0e-c950-79e0-8e11-07155e0742f2；旧主控永久只读历史。此卡不是新派单或追加运行授权。

## 当前事实

- 原B4-T4持续复用，当前local58898b2已Review并整合d7ef396。D4 run36213904038@d7ef396完整19阶段PASS，U21/U23非零退出、阶段证据齐全、旧owned/instance不变。
- 最后F2 run36214270618/job108326997302/source23ab36bff1e953e14fd5a213d1c9fb759997ee9c在U22失败。fresh Setup29自动PASS/3人工PENDING，D13/13及U01/U02/U15/U16/U17/U18/U20/U21通过。
- U22期待KSESSION_UPGRADE_RECOVERY_PREPARE_FAILED，实际exit4并有gate accepted、prepared、native copy complete、post-install failed、transaction rolled back。缺少期望marker导致测试先停止，exact state断言未运行，不能认定U22恢复已验证。
- 失败Artifact10897445184，SHA256 c6f01ed8ef890629feef8724ffbf9f04ef012e28f6168416ba94aa2792190bdb；offline externalDuring=false/restored=true。742/最终privacy/Setup上传未执行；QA未创建，最终beta.2 Artifact不存在。
- 新预算诊断4/4、Full2/2用尽；QA0/2不能替代。原执行已确认冻结，未改main/tag/Release，未进入Batch4.5。

## 技术约束

当前prepare发生在Inno把payload/metadata复制到暂存目录之前，validateStaged只在暂存已存在时执行；commit在实际程序替换前再次校验。fault-payload-hash把期望hash置零，因此“应在prepare失败”的测试预期与真实复制顺序存在冲突。代码与固定marker支持此解释，但缺事务错误子码和U22完整状态对比，尚不能断言唯一根因或安全恢复已证明。不能直接把期望marker改成任意失败来求绿，也不能把D4旧payload的U23通过算作F2当前payload通过。

## 可选方案

A. 维持冻结，结束本轮恢复；保留证据和原任务，等待后续安排。
B. 明确批准一个新的有界U22工程续行：原T4先本地复制顺序/错误hash反例、固定安全事务子码和exact状态断言，再主控Review；单独追加最小U22诊断及Full额度，QA仍仅在完整候选通过后使用。

## 各方案影响

A不新增Hosted成本，当前无法给用户最终安装包或启动Win10验收。B有新增工程/Hosted成本，可继续验证已有规格；不授权产品、UX、schema、migration、数据生命周期、beta.1信任或安全放宽，不保证下一轮必过，也不允许无限重试。建议B保持最多一次针对性诊断加一次Full；这仅是预算建议，未执行。

## 需要网页版决定的问题

选择维持冻结，还是明确授权方案B及其新增次数上限？若批准B，是否确认U22验收目标保持“错误payload hash在实际program改写前拒绝，原owned/instance精确不变”，允许用与真实Inno顺序一致的固定阶段证据修正测试预期，而不改变产品规则？当前不申请降低任何验收门禁。
