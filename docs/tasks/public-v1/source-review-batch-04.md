# Batch 04｜安全启动与月结关联

本批只包含已逐文件审查的公开代码与虚构测试；不含预置组织资料或历史，不代表完整应用已可安装。

## 已核实证据

- 首次 Windows 云端 CI：[run 34459266116](https://github.com/KG718718/spxt-public/actions/runs/34459266116)，提交5d5b84892d262bd05bc0684a9527f1671e1cdfb9；73+24+49+44共190项通过，4份测试文件无失败。该轮启动测试使用注入内存文件系统，不是完整HTTP/浏览器验收。
- 本批月结失败优先：对所有676个两字母虚构用户名进行资格覆盖，来源模块只返回675个；证明存在专用名称排除。按已确认的去专属机制决定移除两处排除，角色及已删除账号限制保留。26项月结合成关联测试通过。
- 本批启动失败优先：链接文件应拒绝但原核心未拒绝；新增lstat检查，链接、目录、读取中消失的文件均不能转为全新安装。初始化账号改用既有created字段，审计使用user/detail字段，避免管理页面读不到创建日期和操作者。46项内存测试通过。
- 所有本批JavaScript语法通过；逐文件定向身份/公司/私网/私有路径标记检查无命中。仅在内存处理，未写本地公开文件。

## 云端待运行

新增真实文件系统专项仅在GitHub Actions执行：首次原子创建、PBKDF2持久化、重复初始化、跨进程重载、损坏配置/数据、旧附件/备份、链接文件、失败保存及两个进程并发初始化。使用runner仓库内独立临时夹具，测试后仅清理本次精确目录。任何虚构夹具均不得进入生产安装包。

月结继续保持：申请人奖金、执行人员费用、员工报销分别归属；活动月份唯一来源；当前已通过付款选择；全额完整纳入；重复锁定拒绝；已锁定结果不随新参数重算。权限仍须完整服务端与三角色页面后续验收，本批模块单测不替代该层证据。

## 文件与边界

public-startup.js、employee-settlement.js、3份相关合成测试及本记录。既有运行实例、真实业务文件和正式实例未变。未PR、合并、Release、部署；完整server/Admin接入、其余模块审查、依赖、浏览器与候选ZIP仍未完成。

## Hosted result after upload

Commit 8edf9f14a51a58b86b6788bce9de6141fb5551fe passed 237 checks in 6 test files on hosted Windows. All 19 real-filesystem startup checks passed, including exclusive publication, second-process reload and two-process first-admin contention. Evidence: https://github.com/KG718718/spxt-public/actions/runs/34460680038 . This does not represent HTTP, browser, full installation or LAN acceptance.
