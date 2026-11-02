# K⁺-SESSION Experimental Beta · 所有者审核候选

**2026-11-02。本候选仅分发源码和文档。** [下载源码阅读包](K-SESSION-Experimental-Beta-source.zip?raw=1) · [逐文件清单](SOURCE-MANIFEST.json) · [校验文件](SHA256SUMS.txt)

| 项目 | 值 |
| --- | --- |
| 阅读包取自 | [`694abddf1571de99410dcf803cb38e777fbf09a7`](https://github.com/KG718718/spxt-public/tree/694abddf1571de99410dcf803cb38e777fbf09a7) |
| 源码 ZIP | `K-SESSION-Experimental-Beta-source.zip`，73 个文件，444,329 字节 |
| ZIP SHA256 | `4773f7439a5d8be2637e54834cdbb8d019f0c99fa5a234a010033e3bb8085648` |
| 应用 / 安装器研究线 | 应用 `1.0.0`，Fresh 安装器研究线 `1.1.0-beta.4` |
| 最新 Experimental 安装包 | 无。当前没有通过完整 Fresh 安装、产物与安全验收的最新 EXE |

阅读包按清单从上述提交的 Git blob 直接取材，包含应用代码与页面、OCR 源码、LAN 工具、Windows Launcher 与 Firewall 助手的 Go 源码、Runtime 和 Setup 源码选段、许可证及公开文档。每项列有路径、字节数、Git blob 和 SHA256。阅读包不包含完整构建工具链、内部验证流程或实例；其中的安装器模板供阅读。GitHub 自动生成的整仓源码 ZIP 与这里的清单范围不同。

## 公开范围审查

- 已检查该提交的 1,081 个跟踪文件，并检索开发分支相对 `main` 新增可达历史中的 2,591 个 blob 版本。历史 Base64 ZIP 另行解码核对，唯一成员为固定的 `fresh-report.json`。
- 检查了私钥头、常见服务令牌、JWT、凭据 URL、明文密码赋值、个人路径、私有地址、业务文件名和实例数据特征。复核结果中，密码字面量命中来自测试夹具及密码哈希格式，认证 URL 来自拒绝用例。阅读包没有发现真实凭据、业务实例、客户附件或可执行安装包。
- 整仓历史保留工程目录引用及部分机器相关测试路径。它们没有进入阅读包。历史验收的 FAIL、UNKNOWN、证据文件和旧 Artifact 保留原义。这次检查回答的是清单内文件能否作为源码分发，不构成应用渗透测试或安装安全认证。

## 如何审核

从[项目首页](../../README.md)进入[快速开始](../../QUICK-START.md)、[安装状态](../../INSTALLATION.md)和[已知问题](../../KNOWN-ISSUES.md)。登记专项的首错为 `NORMAL_RECEIPT / PRESTATE_UNPROVEN`，两个后续场景未运行。完整 Candidate 和 QA 没有通过，物理 LAN、Firewall 授权和第二设备连通均未认证。

仓库所有者决定是否接受此候选以及如何合并和发布。社区反馈使用 [Bug 模板](../../BUG-REPORT.md)和[贡献说明](../../CONTRIBUTING.md)。本候选未创建正式 Tag 或 Release。
