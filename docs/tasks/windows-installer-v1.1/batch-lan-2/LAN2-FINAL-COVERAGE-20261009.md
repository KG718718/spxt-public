# LAN-2 Final Candidate 自动覆盖与人工停点

2026-10-09；本表是返工后的**源码覆盖图**，不是新的 Actions 运行结果。历史 Full #4 `36388264496` 仍为 `OFFLINE_LIFECYCLE FAIL`；Launcher 专项、新 Full Candidate、Final QA 的新预算均未由本任务使用。只有唯一 Master 在独立 Review、专项 PASS 和预算登记后才能触发下一阶段。

| 验收项 | 自动门禁源码 | 本轮可据实宣称 | 留待人工 |
| --- | --- | --- | --- |
| F3 下载、身份及 beta.4 EXE SHA | `lan2-beta4-v1.1.yml` 精确下载并校验 F3 archive/Setup；`ci-beta4.ps1` 再核对 F3；`verify-artifact-beta4.cjs` 对 beta.4 EXE 重算 SHA | 已设 fail-closed 自动门禁；尚无新运行结果 | 最终下载包的用户侧核验 |
| silent 安装、Launcher/私有 Node、首次 Admin、登录和基本业务 | `offline-ci-beta4.ps1` 运行 Go TestSetup；`core-client.cjs` 使用合成账号、127.0.0.1 API 测 PDF、XLSX、上传、备份 | 自动 API/安装路径；不等于图形化首次使用 | 实际桌面安装向导、浏览器 UI 与用户交互 |
| 显式选择网卡与开启 LAN | LAN Node/Launcher 的配置、选择和启用合成反例；beta.4 overlay 注入 schema2 固定测试配置 | 配置安全规则和封闭测试注入；未在 Hosted 选择真实物理网卡 | 用户在目标物理网卡上显式选择、开启和检查 |
| 同机私网浏览器入口与双会话 | beta.4 `production-sessions.test.cjs` 在恢复网络后运行真实 Node/生产业务 handler、runner 自有私网 socket；本机仅 loopback 反例 | login.html HTTP、Host 本地建合成 Admin、远端两独立 Bearer、角色、员工上传、12 个并发只读认证请求、单会话登出；私网运行待 Full | 真实浏览器渲染/交互、第二物理设备及真实网络路径；并发写事务未证 |
| IP、端口和访问限制 | `network.test.cjs`、`server.test.cjs`、私网会话测试的远端 bootstrap 拒绝 | RFC1918/端口/子网/本地地址/伪造头合成规则及同机 socket 访问门禁 | 企业网络实际路由、交换机与第二设备访问 |
| beta.2→beta.4、拒绝与 rollback | Go TestUpgradeLifecycle overlay、故障 Setup 与持久清单 | 已设自动门禁；历史 Full #4 未到后续 U 项 | 用户真实数据迁移与使用验收 |
| 卸载、重装保数据 | Go TestSetup/TestUpgradeLifecycle 的合成 data.json/附件/配置 byte-preservation | 已设自动门禁；新 Full 尚未运行 | 用户实际业务资料复核 |
| Firewall 最小规则 | `firewall-hosted-gate.ps1` 以测试规则校验 Private/程序/端口/子网/接口与清理，生产 helper 拒绝 Hosted 虚拟网卡 | 测试规则和拒绝行为；不宣称生产规则在物理机获授权 | 真实 UAC/Firewall 授权与物理机规则 |
| 26 suites / 742 checks、隐私及 Artifact | Full workflow 精确计数；`verify-artifact-beta4.cjs` 精确文件名单、固定 session 报告字段、隐私和 SHA | 自动门禁源码已接线，需 Full+独立 QA 实际 PASS | 人工包核验与最终 LAN 双设备 1—10 步 |

新 push 包装仅监听唯一开发分支的 `LAN2-FINAL-TRIGGER.md` 变更，并要求第一次运行与两个互斥标记之一。当前 trigger 文件只是未启用说明；Master 事前预算台账负责单次性，标记过滤本身不能阻止未来再次提交。任何新专项、Candidate 或 QA FAIL 均按用户止损返回，不把历史失败改记 PASS。
