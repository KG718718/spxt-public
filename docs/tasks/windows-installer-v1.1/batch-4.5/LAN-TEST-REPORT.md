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

## 实施阶段局部证据

T1网络/config Master独立15/15 PASS（本机Node24.14.0，目标24.21.0待验），不是实际公司LAN验收。T5本地9/9+PS进程PASS；专项1 run36280286553@bb497a8在STATIC_GATE失败，PS测试TEMP_PATH_UNSAFE，Node9/9通过，实际安装NOT RUN。安全Artifact10918207525只含固定report，hash/schema/隐私已核验；不无修改重试。
