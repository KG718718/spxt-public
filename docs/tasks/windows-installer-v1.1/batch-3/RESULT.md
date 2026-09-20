# Batch 3 — Windows Setup Beta Implementation

## 当前结论

**BLOCKED / 自动化通过，等待原始Artifact人工验收；不是 PASS。**
仅公开仓库 KG718718/spxt-public，分支 codex/windows-installer-v1.1。
安装器、构建流水线及安装生命周期测试已通过；原始Setup Artifact已生成。人工验收仍是强制门禁，不允许进入 Batch 4。

## 实际实现

- Inno Setup 6.7.3 固定官方资产与SHA256、签名/许可核验；安装器1.1.0-beta.1，应用1.0.0。
- 当前用户 lowest，无需用户安装 Node/npm/Git/Python；离线完整Portable置于 program，卸载资料独立置于 uninstall。
- 默认 LOCALAPPDATA/Programs/K-SESSION-Beta；数据仍在 LOCALAPPDATA/K-SESSION/Beta/instance；不初始化真实数据，不预置用户。
- 当前用户桌面/开始菜单快捷方式、Windows卸载登记；未知非空目录/已安装/运行中实例拒绝；不强杀，不递归删除用户目录，不做覆盖升级。
- 同commit fresh Runtime、Launcher、Portable、Setup；安装后逐文件hash验证。候选/故障空间/取消夹具分离，故障EXE不发放。
- I01—I32 安装专项；临时CI整机断外网，独立恢复watchdog；不改防火墙，不在用户机器禁网。
- 仅Artifact输出，不创建Release/PR、不改main/tag/v1.0.0。

## 验证状态

最终受测源码 **ff759238b59f3a6076524f82b81d56690ae4e3d3**，source tree **955136b7b440a76a453b0e374da090f08d5014d7**：

| 工作流 | Run | 结果 |
|---|---|---|
| Setup（fresh整链+离线专项+全回归） | 35506827438 attempt1 | SUCCESS |
| Portable | 35506827492 | SUCCESS |
| Launcher | 35506827463 | SUCCESS |
| Runtime公开完整回归 | 35506827449 | SUCCESS |

Setup同commit公开回归26/26套，742项，fail0、skip0。安装专项32条记录：28 PASS、4 PENDING（I01/I02/I03/I09人工）。
实际离线安装、包内Node、PDF/中文/多页、Excel、上传、结构化备份、卸载保留外置数据、重装原账号/数据、运行门禁和完整性均通过。
网络隔离仅一次性GitHub runner，恢复验证通过；不能冒充本机Win10可见向导测试。

## 原始发布候选身份（非Release）

- Artifact：10604780606 / K-SESSION-setup-win-x64-ff759238b59f3a6076524f82b81d56690ae4e3d3，保留30天。
- 入口：https://github.com/KG718718/spxt-public/actions/runs/35506827438/artifacts/10604780606
- Artifact ZIP：32,500,875 bytes；GitHub digest 44332d2e57281d511f4383f26118ae7ef9df999d738cbf75f810e33e40a5f49a。
- EXE：K-SESSION-Setup-1.1.0-beta.1.exe；32,983,233 bytes。
- EXE SHA256：22df28cbf69821dc004728f4c7f8d0e4dccc2996eff81e0ec449a02a1cd925ff。
- Portable payload ZIP SHA256：138fd2e9cc869abc62f3b7f2296e1aac156f071fd4a6a55118a6fe0e962f8790。
- Runtime manifest SHA256：0aa47313dc7a7d18330e0482ec7b9f4e3fcc67a146946921337afb59b590f01e。
- Launcher SHA256：3c8dc2d2d4f4b8f342b184416134dcd7d031d173925ad8d9abd5e4da74607bdb。
- package-lock SHA256：7e650d8d4141d888ab7cc81da25fa094f0e36ffaa0f2152d5066346633e8b2b5。
- Node24.21.0 / Go1.27.1 / Inno6.7.3；程序1042文件、143,766,301bytes、20生产依赖。
- unsigned；installerVersion1.1.0-beta.1 / appVersion1.0.0。
- 本机下载未成功：gh run download卡住后停止，仅终止本次下载进程；官方Artifact API替代下载150秒超时。未生成本机原始ZIP/EXE，不能把CI校验冒充本机复算。

历史首次失败、误判撤回、修复及网络阻塞详见 INSTALLER-TEST-REPORT.md。
archive.updatedAt跨秒问题在ba0fa92回归中真实复现，保留首次失败并仅一次获准重跑通过；未修复测试，不删断言。

## 未完成门禁

1. 原始Actions安装Artifact本机下载、身份/哈希核验。
2. 本次EXE的Win10 x64人工可见向导、免UAC、默认路径、浏览器、卸载保留数据及重装原账号。

Win11/干净机认证、代码签名、OCR、覆盖升级并未实施；不能宣称已获认证。

## 修改范围

新增 tools/windows-installer（安装脚本、固定工具链、构建、CI离线与Artifact校验）、tools/tests/windows-installer/contract.cjs、
tools/windows-launcher/setup_windows_test.go、.github/workflows/setup-v3.yml 与本批文档。
更新 PROJECT、Master Plan、独立 TEST-FLAKE 事实记录。
不改业务server/HTML/CSS/依赖锁/原Install.cmd或Start.cmd/Launcher生产契约/Portable生产逻辑。

## 回滚及安全

所有实施仅开发分支普通提交；源代码可正常revert，不改正式历史。
未向本机安装任何候选Setup，未修改本机已有Beta实例；不合格安装包不发放。
安装失败仅允许Inno撤回自身记录文件，卸载不删除外置实例。
测试仅合成数据；没有访问或同步内部/公司用途版本、真实数据、账号和私有配置。
一次本地Go静态检查误用默认缓存/临时路径的偏差已登记，E盘显式环境重跑通过；未掩盖为全程E盘。

## 交付索引

- SPEC.md / PLAN.md / ACCEPTANCE.md：已批准实施契约与I01—I32。
- INSTALLER-TOOLCHAIN.md：固定编译器、官方来源/hash、许可证边界。
- INSTALLER-TEST-REPORT.md：原始失败与最新结果，不只保留成功记录。
- HUMAN-ACCEPTANCE.md：仅最终自动化通过后执行的用户步骤。
- CHATGPT-HANDOFF.md：最终交付时更新的独立验收摘要，不替代证据。

报告归档commit必须与真正受测构建commit分开记录；文档提交不等于重新编译或验收。

最终远端只读核验：main与v1.0.0均为84cbb324a4f63bef094d2c21d70eba841205a7a7；正式Release仍为K⁺-SESSION1.0.0（ID387424742），原始资产ID/大小未变化。
网络故障后以官方Git数据API同步原始blob/tree/commit SHA并force=false快进开发分支，未生成替代历史。代码构建身份不随报告归档变化。
