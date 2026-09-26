# Batch 4.5 Upgrade Compatibility — 用户方案A决定

2026-09-27正式批准；本文件与SPEC完整1—38节共同生效，覆盖先前第27节兼容阻塞。不是变更其他安全/产品契约的概括授权。

1. 唯一直接升级矩阵：已验F3 beta.2→1.1.0-beta.3。F3 source c8886e6b6d413c2fd73d6716621d07a80b337e58、Run36246132535、Artifact10907910968；禁止任意beta.2、仅DisplayVersion/commit/tree相同、未经取证fresh beta.2、beta.1直升、未知登记。
2. appVersion=1.0.0、dataContractVersion=1、Runtime identity schema、AppId/registration key、业务schema和instance结构保持不变；必须改变任一受限契约则重新决策。
3. 允许专项Hosted额度内一次受控安装后取证。固定现有模型等价的version/source commit-tree/program manifest/inventory/build-info/Runtime manifest/Launcher/registration-binding非敏感锚；不得记录instance正文、路径隐私、账号或secret/token/cookie/password。
4. 取证经Review后，运行时只依赖固化精确锚；Artifact是历史取证来源，不能作为在线升级身份依赖。
5. 原beta.1→beta.2代码/测试/证据语义不删除、不重写、不重新定义；版本化/分派隔离新beta.2→beta.3。不能把旧profile名解释成beta.2。
6. 允许新的detector/trusted bundle-profile/Setup路由/transaction from-to/beta.3 metadata/对应测试CI；精确F3接受，beta.1直升拒绝，beta.3同版本拒绝覆盖，beta.3上运行冻结beta.2仍防止不受控降级。原identity/binding/manifest/program/Runtime/Launcher/rollback/instance保护不得削弱。
7. beta.1需两段升级，但beta.2尚未成为持久发布资产前不承诺未来任何时间可完成；历史分发留后续Release管线，不延长或伪造Artifact保留期。
8. 新增C01—C15核心兼容测试，见ACCEPTANCE；不可减语义。
9. 取证消耗现有专项4次，失败必须证据→本地反例→最小修复→Review后再用剩余预算，禁止无修改retry。Full2、QA2不变，不挪用。
10. 恢复B45-T1—T5，Master按依赖编排，不依赖身份取证的LAN任务可正常继续。不bind0.0.0.0、不开放Public、公网、不改业务权限/schema；Host-only首Admin、selected subnet guard、Firewall最小权限不变。
11. 自动推进至BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING即停，等待Win10 Host+第二设备人工验收；不进Batch5/OCR/main/tag/Release。
