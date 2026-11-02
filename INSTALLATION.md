# Windows 安装与版本边界

**当前选择：获取 Experimental 源码。最新 Fresh 安装器没有通过完整验收，也没有发布供用户安装的 EXE。**

| 手上的内容 | 对应身份 | 如何处理 |
| --- | --- | --- |
| Experimental 分支或其源码 ZIP | 当前公开源码及文档 | 在独立目录阅读，按[快速开始](QUICK-START.md)记录提交 SHA |
| v1.0.0 在线安装 ZIP | 已有历史 Release，使用自己的说明和清单 | 只按该版本的说明判断用途。[历史发布页](https://github.com/KG718718/spxt-public/releases/tag/v1.0.0) |
| F3 beta.2 单机安装器 | Source `c8886e6b6d413c2fd73d6716621d07a80b337e58`、Run `36246132535`、Artifact `10907910968` | 十步人工验收仅适用于这份历史产物；其临时 Artifact 不是长期分发渠道。[受验身份](https://github.com/KG718718/spxt-public/blob/d87bba40c623490f0fd682005acdcc9f83a1b3c2/docs/tasks/windows-installer-v1.1/batch-4/HUMAN-ACCEPTANCE.md) |
| 名为 beta.4 的试验 EXE、旧 CI 构建或失败报告 | 文件名不能证明来源或交付资格 | 请勿作为本次 Experimental 安装包使用 |

如果已有安装，请保留原版本和实例，不覆盖程序目录，不迁移数据，不通过删除登记项、快捷方式或实例解决安装拒绝。历史升级、卸载重装的具体结果见[已知问题](KNOWN-ISSUES.md)。

将来若所有者提供 Experimental 安装包，发布说明须同时给出对应的源码提交、完整构建来源、EXE 文件名与 SHA256、payload 文件清单及安全核验结果。Windows 可用 `Get-FileHash -Algorithm SHA256 -LiteralPath <安装包路径>` 核对文件字节。只比较哈希不能证明安装、恢复和 LAN 已验收。当前这些交付条件未齐备。
