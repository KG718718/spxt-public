# K⁺-SESSION

项目审批、付款申请、欠款台账、发票核对、奖金与月结、统计导出的独立公开候选。

**Windows x64 在线安装候选已完成云端验收，可以下载试用；尚未创建正式 Release。** 当前源码在 [codex/public-v1](https://github.com/KG718718/spxt-public/tree/codex/public-v1)，main 未合并。

## 下载安装

1. 下载 [已验收的在线安装候选](https://github.com/KG718718/spxt-public/actions/runs/34605839563/artifacts/10266950988)（需登录 GitHub，Actions 产物保留 30 天）。
2. 外层 ZIP 中包含 K-SESSION-online-setup.zip、SHA256SUMS.txt 和合成验收证据。核对校验值后，解压内层安装 ZIP。
3. 双击 Install.cmd，按提示选择独立本地安装目录。首次安装须联网，从官方来源下载锁定的 Node 与 npm 依赖，无须预装 Node。
4. 安装完成后，在安装目录双击 Start.cmd。默认仅本机访问；首次由安装者创建 Admin，没有默认账号或密码。
5. Admin 明确配置购买方、税率、服务费、奖金、账号和主数据后使用。退出服务请在服务窗口输入 stop，不是只关闭网页。

请先阅读 [完整安装、启动、备份与恢复指南](tools/installer/README-install.md)。候选未签名；不要绕过系统安全策略，也不要用公司真实数据做公开演示。

内层安装 ZIP 的 SHA-256：

```text
8d251676da49d87b5d2c06a4b128ef79143963b53d18f66c6968e8346adbe2c8
```

342132 字节；与已测代码 d2553434aa24b30339a9a24a2bdbed08f126a80b 对应。哈希用于完整性核对，不等同于代码签名。

## 新安装原则

- 零用户、零供应商/收款对象/客户、零业务、零附件、零实例配置；测试夹具和截图不进入安装 ZIP。
- 税率由 Admin 填写，不预置 6%；明确的 0 与未填写不同。未配置时提示补齐，不猜数值，不阻断只读列表。
- 员工替票由 Admin 显式授权；收款对象关联不等于替票授权。原单位的专属收款对象特例不内置。
- 安装、重装与启动不清空实例。程序、运行环境和 instance 分离；失败不切换版本、不改既有数据。
- OCR 可选，不随包内置 Python、引擎和模型。邮件默认关闭；测试发送也应由 Admin 明确配置与操作。

## 已验证与边界

[最新 CI](https://github.com/KG718718/spxt-public/actions/runs/34605839563)：25 份公开测试 / 734 项套件报告检查、23 项实际在线安装检查、6 项真实可选 OCR 合成检查全部通过，依赖审计 0 漏洞。安装与截图均在 GitHub 托管 Windows 完成，使用合成数据；不是开发机或生产环境测试。

已覆盖首次 Admin、五页与角色权限、项目→付款→发票→奖金/月结、欠款、导出、重启、重复安装、失败零写入、同结构程序升级和停机完整副本恢复。详见 [第16批证据](docs/tasks/public-v1/batch-16-online-installer.md)。

真实双机局域网、任意旧版本迁移、异机密钥恢复、系统服务、代码签名和正式部署未验收。默认只监听 127.0.0.1；不要直接暴露公网。结构化 data.json 备份不等于完整实例备份。

application-core-only-not-installer 是另一份仅核心源码的产物，不是本节在线安装器，也不是完整离线包。

## 许可证与开发入口

本项目采用 [MIT](LICENSE)；第三方保留各自原始许可，见 [第三方说明](THIRD_PARTY_NOTICES.md) 和 [实际分发边界](docs/licenses-and-distribution.md)。在线安装不免除第三方许可义务；未来离线二进制整包仍需独立审查。

[当前状态](PROJECT.md) · [意图](docs/tasks/public-v1/intent.md) · [规格](docs/tasks/public-v1/spec.md) · [计划](docs/tasks/public-v1/plan.md) · [验收](docs/tasks/public-v1/acceptance.md)

公开源码和产物只保存在 GitHub。本轮未创建 PR、合并 main、创建 Release 或部署；未修改公司版和 19。
