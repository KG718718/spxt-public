# LC01-DIALOG-R2 唯一专项结果

2026-10-13。FAIL；BLOCKED — LC01-DIALOG-R2 SPECIALTY FAILED / UNKNOWN STATIC STYLE。专项1/1用完，LAN-2继续冻结；本轮Full0、QA0、额外Hosted0，立即STOP。

## 身份与范围

- Run38395066549，attempt1，GitHub结论failure。
- 受测source45e0f6acb2d2f1c0fc16199df23e0bddeb2cb8c6；Review代码2da7513ba7c8a96dbb25e27120ca3f292d403dbf；触发前local/origin/GitHub均f6d08099d498a76f32cea46694e6660ac1f5e4c0。
- Artifact11812155052，名称lc01-hosted-45e0f6acb2d2f1c0fc16199df23e0bddeb2cb8c6-38395066549。仅一个白名单JSON；Master独立schema3 verifier、source/F3绑定核验PASS，证据evidence/HOSTED-38395066549.json。未下载或上传原始窗口文字、PID、路径、句柄或原始日志。
- 修复仅Windows测试adapter/纯策略、固定诊断报告、对应合成测试/生成器接线及治理。生产Launcher/Setup/Node、历史F3身份、事务/rollback/业务/workflow未改。原Thread和工作树保留。

## 1. 本地与Review

原LC01 local887ff66/553d082/77758f2/c2f81b6/090b432/a24c39c，经Master整合至2da7513。Master独立Node26/26、Go54顶层/206含子测试fail0skip0、vet、两份实际Windows overlay仅编译、PS语法/生成器/diff-check PASS；历史schema1/2报告独立核验PASS且历史FAIL原义不变。详见LC01-DIALOG-R2-MASTER-REVIEW.md。上述是本地门禁，不是Hosted PASS。

## 2. Hosted固定分类

报告status=FAIL，stage=LC01_LIFECYCLE，reason=LIFECYCLE_FAILED；outer.stage=IDENTITY、runnerOutcome=FAIL；inner.classification=LIFECYCLE_FAILED、stage=LC01_LIFECYCLE。外层IDENTITY是封装调用位置，不代表F3身份失败。

Core7解释器可信来源/API/UTF8/签名检查PASS；原受验F3安装后身份PASS，inventoryFiles=1042，所有固定program/Runtime/Launcher/build-info锚通过。

生命周期stage=SECOND，Path=DIALOG_MISMATCH，DialogReason=UNKNOWN_STATIC_STYLE。DialogFirst阶段ENUM_CHILDREN，classificationUnknown=true；DialogRecheck=NOT_REACHED。未执行确认重读或发送IDOK。

## 3. 明确布尔证据

已观察且符合：原第二进程映像、创建时间、存活、ownerPID；目标dialog class/count/title；child窗口/parent、可见/可用；图标style/ID/双消息语义/count；按钮class/style/count/所属进程/parent及handle。

已观察但不符合：bodyCountMatchObserved=true/Match=false，buttonIDMatchObserved=true/Match=false，controlSetMatchObserved=true/Match=false。

未证明：bodyStyleMatch、bodyIDMatch、textMatch均Observed=false/Match=false。不能把未观察到正文解释为正文错误，也不能认定这是预期INSTANCE_BUSY弹窗。未知Static样式及实际按钮ID值按隐私约束没有保存；不凭猜测扩表或自动点击。

## 4. 生命周期与cleanup

BusyClosed=false，NaturalExit=false，second.CleanupTerminated=true，second.HandlesClosed=true。第二进程ExitCode=0不代表自然成功：已存在受控强制收尾证据，禁止计PASS。

firstIdentity/nodeIdentity/exclusiveLock=true仅证明失败前已过这些门禁；noSecondBackend=false、quiescence=false等表示后续未闭合，不能据此断言出现第二后台。firstNaturalExit=false，nodeExited=true，lifecycle.cleanupTerminated=true、handlesClosed=false，最终cleanupVerified=false。没有宣称正常收尾或全部资源闭合。

## 5. 结论与下一步

本轮确定当前适配器在子控件分类处拒绝，严格未知控件门禁生效且具体安全原因已发布；未证明产品缺陷，也未定位历史Run38362515475或Full #4的唯一根因。原历史FAIL/UNKNOWN保留。

不具备申请Final Full的条件。任何下一步实施/验证须网页版重新决定范围和预算；可优先决定是否采用最终人工精确弹窗验收，或另行批准仅针对Static样式/按钮身份的有界测试适配工作。不能直接放宽控件白名单、将非IDOK按钮当确认或重跑。本轮不自动申请新额度、不进入Full/QA/LAN HUMAN/Batch5/OCR/main/tag/Release，无beta.4最终包。正式基线仍受验beta.2单机轨道。

Run: https://github.com/KG718718/spxt-public/actions/runs/38395066549
