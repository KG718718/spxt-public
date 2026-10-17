# 2026-10-17 唯一 Fresh Candidate — Master Review

结论：**本地接线/构建准入 PASS，允许使用唯一 IC1；真实 Runner 前检、安装及 QA 尚未通过。**

唯一 Master01a0db0e-c950-79e0-8e11-07155e0742f2，原 FRESH-T2 Thread01a13948-7433-7571-8330-a09bfd12a0dc / bea7 已正式 RETURN 后冻结。实现849131c20282afcdc4d27fa5237fdf9b38865e8d，报告4f8f32d802bade53fc1dc7f49112b4f995be9a93，经独立审查和 ff-only 整合；代码指纹43091f6233c1ca6ed093432591108fb9ac325e01d10c21c05630f4f7189d8f0a。

## 独立 Review

- 12文件仅新workflow/预算来源合同、bootstrap/context、反例以及必要的CI/supervisor/finalizer接线。生产Launcher/Helper/Node/Setup/业务/安全/历史身份/事务/rollback、旧workflow/预算合同没有改动。
- 新IC1/IQ1独立授权身份，不伪造旧FAST授权；精确repo/ref/event/attempt/title/parent/trigger-only差异、完整分页/历史总数/重复及未知历史、同源真实P0证明和代码指纹均严格验证。旧QA出现任何运行即拒绝本次重复使用。Master只读核实旧两workflow历史各3条，均无QA。
- 只允许开发分支push到单一新trigger；attempt1、同一exclusive并发组、45分钟硬上限。旧耗尽槽位、Smoke、诊断、Full等不能复用。实际trigger只由Master最后创建。
- 新context缺失、伪造/降级、错授权/slot/workflow或来源不能绕过真实Job监督。实际CI在构建/安装前执行已审只读隔离、所有权、注册表/规则/路径恢复前态检查；FAIL/UNKNOWN停止，不修改环境伪装通过。
- QA仅IC1 completed/success且全部schema2门禁/cleanup PASS后可用。精确绑定同一run/artifact/source/EXE SHA、ZIP白名单及trigger-only历史控制提交；QA分支仅提取不可变Candidate，不构建产品。当前未解冻或运行QA。
- 当前报告拒绝schema降级，首个失败与清理失败保留；未知所有权/外来改变保持失败和保全，未删除安全门禁。新早期失败也只发布固定阶段/分类/隔离和逐资源NOT_OBSERVED，不泄漏原始输出。

## 实际本地验证

Master独立同源专项45/45（新17+R2兼容28）、root134/134，fail0skip0/sourceBound；受控Job自然退出、stderr空、管道/句柄关闭、Job empty、无force。Execution实际Go overlay编译/vet PASS，workflow4段inline及3个PS AST错误0；YAML采用结构断言及独立源码Review，没有声称通用parser验证。

唯一同源P0真实构建PASS，Master重新核对实际EXE字节/SHA、source/tree、manifest及全部payload，并调用原package verifier PASS。849131c2 / tree ed6d7a1b675200b4b5f0e6b3f44bd2d42570911d，EXE33557167字节、SHAd2f01a824b62e0f00a60026a2d1b01b7000d582e6b9d6031e2cb2b0643ce18eb，1049文件/20依赖，完整Payload147923786字节；Helper13/Fresh2、Launcher28/Fresh2、Node44、ISCC通过，环境/Job收尾通过。此为本地构建资格，不冒充Hosted包或安装通过。

## 运行约束

仅新增IC1一次；原QA一次条件保留。独立RUNS登记后核验local/origin/GitHub一致，Master才以trigger-only控制提交中央触发。任何必需门禁FAIL/UNKNOWN或收尾未证即停止，不重跑/追加，不用QA调试。IC1全部通过后才由原独立QA长期线程审查并使用同EXE的唯一IQ1。

历史F01、Win10规则读取和完整失败恢复未证明的结论不改。实际Runner前检仍待IC1在产品执行前完成。无真实本机安装/规则/登记修改，无内部SPXT/真实业务/凭据/main/tag/Release/未知清理。所有历史失败、工作树及未跟踪现场保留。

## Hosted后资格限定
IC1 Run39005740755在ENV前检失败，compilerOwnedFiles观察未证明，未进入构建/安装。此前有限接线和物理路径本地验证PASS不能证明workflow支持的SUBST路径组合。后续如获新授权，应先补该差异反例；本轮不再实施或测试，所有历史结论保留。
