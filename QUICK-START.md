# 快速开始

本次 Experimental Beta 适合阅读源码、核对设计和提交反馈。需要马上在公司电脑安装的用户请看[安装状态](INSTALLATION.md)，当前没有合格的最新 EXE。

## 获取同一份源码

从[发布候选目录](https://github.com/KG718718/spxt-public/tree/codex/lan-fresh-trial-v1.1/publication/experimental-beta)取得源码阅读包、SHA256 和逐文件清单。Windows 可用 `Get-FileHash -Algorithm SHA256 -LiteralPath <源码包路径>` 比对清单中的 ZIP 哈希，再解压到新目录。阅读包收录应用、Windows 组件源码和用户文档，不含运行实例或安装程序。

需要查阅历史工程证据的贡献者可以打开[公开开发分支](https://github.com/KG718718/spxt-public/tree/codex/lan-fresh-trial-v1.1)，在提交记录中选择对应 SHA。GitHub 的 **Code → Download ZIP** 是整棵开发树的快照，范围大于上述阅读包。

使用 Git 的读者也可以在新的空目录旁执行：

```sh
git clone --single-branch --branch codex/lan-fresh-trial-v1.1 https://github.com/KG718718/spxt-public.git k-session-experimental
git -C k-session-experimental rev-parse HEAD
```

第二条命令给出本次取得的提交。反馈时附上它即可，不需要提供电脑名称、路径或业务实例。

## 阅读入口

- 从 [server.js](server.js) 了解业务入口，从 [public-bootstrap-http.js](public-bootstrap-http.js) 查看首次 Admin 初始化的限制。
- 从 [Windows Launcher](tools/windows-launcher)、[LAN 部署说明](LAN-DEPLOYMENT.md) 和[配置参考](CONFIGURATION.md) 了解主机与浏览器的分工。设计要求和实体验收结果分别列出。
- 对照[已知问题](KNOWN-ISSUES.md)后，使用[Bug 报告模板](BUG-REPORT.md)提交去标识化的复现步骤。

阅读源码不需要启动服务、开放端口或导入任何现有实例。
