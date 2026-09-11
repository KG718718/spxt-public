# Batch 11｜公开版发票访问政策

## 2026-09-11 购买方、替票与收款身份接入计划（主控批准）

延续已批准的公开化 L2，不新增业务决定。先独立完成 invoice-access-policy.js 和失败优先合成测试，再由完整 server 的既有路由调用；不是新增替代业务服务器。

- 使用 config.invoiceBuyerName 保存 Admin 填写的单位全称；原始输入 trim 后保留，1—300 字、拒绝控制字符，归一化后不能为空。匹配沿用来源 normalizeText 的规则，不用页面 eligible 作为依据；未配置是 409，明确非法值拒绝，空发票购买方不能因双空比较通过。
- users[].invoiceReplacementAllowed 为显式布尔，新增员工 false；身份从当前 users 的精确 username 查找，不能使用供应商名称归一化或旧 session 角色。Admin/审批岗在原发票分析器中的既有资格保留，路由/项目权限不在本核心扩展。
- Admin 修改授权复用账号生命周期 expectedVersion、审计、原子保存和会话撤销；本核心只校验并返回待应用字段，不写文件、不创建第二份账号或名单。只允许现有有效员工；不因建立收款对象自动授权。
- 收款明细只依其保存的 payeeAccountType，余票只依保存的 poolOwnerType；操作授权变化不改变历史分类。没有可靠类型的历史记录返回未知，禁止按当前授权名单自动猜成任一类型；保留原对象供历史查看，完整服务接入时不得把未知当成供应商池开放共享。
- 银行信息可选仅保留普通 employee-payee；欠款成本可选仅保留有效 formal-supplier。不保留固定公司别名，不转授通用 company-payee。
- 用合成同名账号/供应商、撤权/停用/旧草稿重新判定、已存分类深比较、Admin实时角色、版本冲突、非法配置与0副作用测试。源内固定名单的反例只在 RAM 核对，不向公开文件复制固定名单。
- 完整 server、Admin/员工/发票页面及 HTTP/跨模块角色验收仍须后续同轮接入；核心测试不能标为全部实现。仅云端候选文件，不改 main、公司来源/配置/数据/服务或正式主机。

状态：计划已固定，尚未实现/测试。

### 同批启动接入

新增字段也接入 public-startup.js：已有 config.invoiceBuyerName 明确非法、已有 users[].invoiceReplacementAllowed 非布尔时，按已批准的关键配置/权限损坏拒绝启动规则保留原件。缺字段仍允许读取且不回填。先补 startup 单元与 bootstrap HTTP 合成反例后实现，复用 invoice-access-policy 验证，不新增存储或初始化方式。
