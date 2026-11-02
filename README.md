# K⁺-SESSION Experimental Beta

**当前提供源码和文档。没有可供安装的最新 Experimental EXE。** 可从[发布候选目录](https://github.com/KG718718/spxt-public/tree/codex/lan-fresh-trial-v1.1/publication/experimental-beta)获取源码阅读包、文件清单和 SHA256。需要 Windows 安装包的用户请先看[安装状态](INSTALLATION.md)。仓库的 v1.0.0 在线安装包属于历史版本。

K⁺-SESSION 是面向广告公司的 OA、财务核对与数据统计项目。源码包含项目申请、付款申请、欠款、发票、奖金和员工月结，也包含甲方与供应商管理、角色权限、邮件、导出和备份。审批通过记录的是业务决定，银行转账仍须另行办理。首次初始化按零业务数据设计，不预置共享 Admin、员工账号或客户资料。

| 你想做什么 | 从哪里开始 |
| --- | --- |
| 获取源码、识别版本 | [快速开始](QUICK-START.md) · [更新记录](CHANGELOG.md) |
| 判断能否安装、升级或复用旧实例 | [安装与版本边界](INSTALLATION.md) |
| 了解主机、员工浏览器和可信网络的关系 | [LAN 部署说明](LAN-DEPLOYMENT.md) · [配置参考](CONFIGURATION.md) |
| 判断已有问题、报告新的现象 | [已知问题](KNOWN-ISSUES.md) · [排查指南](TROUBLESHOOTING.md) · [Bug 报告模板](BUG-REPORT.md) |
| 提交修改或报告安全问题 | [贡献流程](CONTRIBUTING.md) · [安全报告](SECURITY.md) |

**已经验证的范围。** K⁺-SESSION 1.0 的 F3 `1.1.0-beta.2` 单机安装器通过了 Windows 10 x64 的十步人工验收，覆盖指定 beta.1 到 beta.2 的升级、原账号与附件保持，以及卸载后恢复原实例。验收只对应记录中那份安装器。[人工验收记录](https://github.com/KG718718/spxt-public/blob/d87bba40c623490f0fd682005acdcc9f83a1b3c2/docs/tasks/windows-installer-v1.1/batch-4/HUMAN-ACCEPTANCE.md)

**当前的证据边界。** Fresh `1.1.0-beta.4` 完整安装、安装后的浏览器业务和公司物理 LAN 尚未取得合格证据。最后一次 Windows 原生登记专项在创建前观察处停止。内部测试已结束，独立 QA 冻结。项目所有者负责审核后续社区修改。[已知问题与原始记录](KNOWN-ISSUES.md)

源码采用 [MIT 许可证](LICENSE)。第三方组件保留各自的许可和署名，详见[第三方说明](THIRD_PARTY_NOTICES.md)。
