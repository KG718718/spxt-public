# Batch 4.5 — 第27节升级兼容决策卡

## 方案A正式批准｜2026-09-27

用户已明确解除第27节upgrade compatibility阻塞，批准独立的受验F3 beta.2→beta.3路径。唯一可信来源installerVersion1.1.0-beta.2 / source c8886e6b6d413c2fd73d6716621d07a80b337e58 / Run36246132535 / Artifact10907910968；必须核验固化精确安装后非敏感锚，禁止仅版本/commit/tree相同或未经取证fresh rebuild。beta.1不得直升beta.3；保留冻结beta.1→beta.2历史语义，再走两段路径。beta.3 same-version拒绝；beta.3运行旧beta.2须保持降级保护。appVersion1.0.0、DC1、Runtime identity schema、AppId/登记键、业务schema、instance结构不变。允许detector/bundle/Setup/transaction from-to/build metadata/测试CI在此边界内改造。取证占专项4次之一，运行时仅依赖固化锚，不在线下载历史Artifact。不得创建Release或承诺历史包永久可得；旧停点为历史，自动恢复T1—T5。详见COMPATIBILITY-APPROVAL.md及C01—C15。预算专项0/4、Full0/2、QA0/2，最终LAN HUMAN PENDING停点和其他产品安全门禁不变。


状态：BLOCKED / NEED PRODUCT DECISION。暂停依据为用户SPEC第27节原文：“如果工程发现必须修改：package/appVersion、data contract、Runtime identity、upgrade compatibility，停止并提交网页版决策卡。”第26节已批准beta.2→候选目标，但第27节明确保留兼容变更决策门禁；本次不是请求再次批准一般LAN工程。

## 【当前事实】

Batch4已正式PASS，用户Win10人工1—10全PASS。受验beta.2为source c8886e6b6d413c2fd73d6716621d07a80b337e58 / Run36246132535 / Artifact10907910968，历史身份和文件未变。收尾9eaad01已推原开发分支；LAN唯一集成分支已建。完整1—38节、规格/Plan/L01—L28/人工14步和预算均已登记。

独立Execution c06dcfe报告整合7bfbfd3。Master重现三反例：beta.2登记VERSION_UNSUPPORTED/21，beta.2→beta.3策略POLICY_INVALID/40，新beta.2 profile BUNDLE_INVALID/41；双http.Server共享handler对象检查PASS且未监听。所有反例仅合成内存输入，未访问真实实例/注册表/网络。

## 【技术约束】

upgrade-detection/index.cjs:11-13、45-66、81-113固定beta.1来源、目标beta.2、source/tree、封闭两profile及精确hash；setup.iss:573-576主动拒绝登记beta.2；upgrade-transaction/index.cjs:68固定事务from/to。仅改installerVersion无法完成beta.2升级，必须改变兼容路由和受信来源。

目前可保持appVersion1.0.0、dataContractVersion1、Runtime identity字段契约、AppId/登记键和回滚语义。新候选hash变化本身不是本次决策原因。双明确listener在当前Node共享handler/状态架构中有可行路径，但实际bind、bootstrap/peer门禁及生命周期尚未实现或验收。

## 【可选方案】

A（推荐）：beta.3仅直接接受已验F3 beta.2精确安装后身份；在受控Hosted提取、核验并固定非敏感锚，不能仅凭版本、commit或同源码重建通过。beta.1不直接升级beta.3，先用冻结beta.2走既有beta.1→beta.2路径。历史代码/证据和Batch4回归继续保留，增加独立beta.2→beta.3封闭路径。不得覆盖beta.2包。

B：beta.3同时直接支持beta.1和beta.2；按来源版本分别匹配独立精确身份集合，再进入目标beta.3事务，增加两来源失败回滚矩阵。

## 【各方案影响】

A范围最小，符合第26节已验beta.2目标，beta.1需两段升级；需保留可取得的历史beta.2。原Artifact保留期为2026-10-26T13:55:32Z，未授权延长或改建Release，不以保留期假设永久下载可用。受控取证计入本Batch专项4次预算，不能另起无预算取证。

B增加直接升级承诺、受信身份和测试矩阵，既有4/2/2预算不自动增加；若预算不足仍停止。两方案都不能接纳未知安装登记、任意beta.2或放宽哈希/数据保护。

## 【需要网页版决定的问题】

是否批准A：仅将受验F3 beta.2安装后完整精确锚加入新的beta.2→beta.3封闭兼容路径，允许相应detector/bundle/Setup/事务from-to修改；appVersion/DC1/Runtime identity契约保持不变，beta.1继续两段升级？或选择B并明确批准扩大直接兼容范围。

未决定前Execution冻结，不派后续生产任务、不消耗Hosted。当前预算专项0/4、Full0/2、QA0/2。没有LAN候选Artifact或自动化/QA PASS，不冒充最终LAN HUMAN PENDING。
