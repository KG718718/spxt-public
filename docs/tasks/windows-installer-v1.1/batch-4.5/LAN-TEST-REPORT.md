# Batch 4.5 LAN Test Report

状态：仅兼容预检，产品自动化NOT RUN。

|检查|Execution与Master独立结果|
|---|---|
|beta.2合成登记传入现有validator|VERSION_UNSUPPORTED/21，预期拒绝PASS|
|beta.2→beta.3 policy|POLICY_INVALID/40，预期拒绝PASS|
|新增beta.2 profile|BUNDLE_INVALID/41，预期拒绝PASS|
|双http.Server共享handler纯对象|PASS/no-listen；未证明Windows真实bind|
|公开文档校验|8/8 PASS|
|L01—L28、26/742、Runtime/Launcher/Portable/Setup、Batch4回归、安全/QA|本BatchNOT RUN|

上述固定码证明需要兼容变更，不是LAN验收通过。无真实业务/注册表/防火墙/网络操作。Hosted专项0/4、Full0/2、QA0/2，beta.3 Artifact N/A。原Batch4 PASS证据保持历史身份。
