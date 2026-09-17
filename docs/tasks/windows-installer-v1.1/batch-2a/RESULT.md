# Batch 2A RESULT

**Batch 2A PASS — Windows 10 x64 Beta Track；等待上级验收，不自动进入 Batch 2B。**

## 身份与交付

- 仓库：https://github.com/KG718718/spxt-public
- 分支：codex/windows-installer-v1.1
- 最终受测代码/测试/workflow commit：`1dc0efc0209aebb40916ccd94d0fd2b423ed9705`，已 commit + push。
- R5A 文档检查点：`8cff6daaf6fe09377b2984bfbf254a28a9423dca`。
- Launcher 修订链：ffe2664 → c6f6156 → 1dc0efc；最终两个 CI 均 success。
- 本报告所在文档收口提交与受测代码提交分开；用 GitHub 本文件历史或 git log 获取文档提交，不伪造自引用 SHA。文档不重新编译 EXE。
- main 与 v1.0.0 均复核为 `84cbb324a4f63bef094d2c21d70eba841205a7a7`，未修改；没有 PR、合并、Release、部署或 force push。

## 实际实现

Go 1.27.1 标准库 Windows amd64 GUI 单 EXE（CGO=0）；用户不用安装 Go/.NET/Node。
从自身目录定位包内 Node 24.21.0 和现有 Runtime，完整 manifest/hash 校验；127.0.0.1、8080—8099 有限回退；实例锁、同文件身份、TCP PID 与登录文件 hash 组合识别。
Node 暂停创建后先入 Job 再运行，隐藏窗口，重复启动复用，异常回收；原生窗口提供打开页面和停止服务，中文错误及非敏感外置日志。
业务代码、package/lock、原 Install.cmd/Start.cmd 没改；无新增 health API。
UNSIGNED DEVELOPMENT ARTIFACT，不是最终安装软件。

## 验收

详见 [LAUNCHER-TEST-REPORT.md](LAUNCHER-TEST-REPORT.md)。
本机 Win10 19045 实际 EXE：L01—L17 与 X01—X06 共 23 项 PASS；用户三项人工验收通过，日志记录 STOPPED，收口未发现 Launcher 进程。
[Launcher CI 35127971944](https://github.com/KG718718/spxt-public/actions/runs/35127971944) PASS；
[公开版回归 35127971754](https://github.com/KG718718/spxt-public/actions/runs/35127971754) 26/26、742 项、0失败/跳过。
Artifact K-SESSION-launcher-win-x64-1dc0efc0209aebb40916ccd94d0fd2b423ed9705 可用，30天保留；不是 Release。
本机与 CI 采用同一代码但嵌入不同 Runtime manifest，因此各有 EXE hash；不能互换或声称同一二进制实机认证。

## 修改范围

代码阶段：新增 tools/windows-launcher/{go.mod,core.go,main_windows.go,core_test.go,integration_windows_test.go,build.ps1,toolchain.json}；
tools/tests/windows-launcher/ci.ps1；.github/workflows/launcher-v2a.yml。
新增 batch-2a 设计、L2 intent/spec/plan/acceptance 与本轮结果/交接卡。
增量修改 AGENTS.md、MASTER-PLAN.md、PROJECT.md、DECISIONS.md；没有提交二进制、node_modules、原始运行日志、测试实例、凭据或真实数据。
源代码外历史实验与产物保留，未擅自删除/覆盖。

## 阻塞与未完成

当前 Batch 2A 必须门禁无剩余阻塞。原 UI 工具限制通过用户人工验收补齐，未绕过安全控制。
未做实际注销关机、破坏浏览器关联反例、干净机/Win11/ARM认证、签名、Setup、OCR、正式数据路径和升级卸载。Windows10是当前开发机 Beta 验证，不承诺所有Windows支持。
停止采用 Job 终止，无业务请求优雅排空保证；原型邮件和 OCR 禁用，不是正式业务运行入口。
建议上级审查 GitHub 证据后决定是否进入 2B；本任务停止。
