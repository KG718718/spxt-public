# B45-T2 RESULT — Server LAN Listener / First Admin / Remote Guard

## 结论

**PASS（限 B45-T2 生产实现与合成本地验证）**。实现冻结提交：`c7fe5736d6bc02f2985903bd12755706d6a6295f`。未运行 Hosted，未绑定或读取开发机真实私网 NIC，未修改防火墙、注册表、路由器、Setup、Launcher、业务权限/schema/instance 结构或版本；不代表真实第二设备 LAN、L01—L28、完整 26/742、Artifact 或 Batch 4.5 PASS。

## 已完成

- `server.js`
  - 旧 localhost-only 路径继续支持 `127.0.0.1` 与 `PORT=0`；明确拒绝 wildcard/非本机 `KSESSION_HOST`。
  - 仅 `KSESSION_LAN_MODE=1` 且严格 `instance/lan-deployment.json` 有效时启用双 listener；在真实 bind 前给 T1 `reservePersistedPort()` 注入同一个业务 handler，持续使用其返回的 `127.0.0.1:<persisted port>` 与 `selected-private-ip:<same port>` handles，不做释放后重绑。
  - LAN 配置加入 startup `priorFiles`；首 Admin 前不创建配置。配置损坏时 LAN fail closed、Local 保留、只读状态为 `LAN_START_FAILED`，不覆盖配置或业务数据。保存端口冲突不换号；LAN 单侧失败时只保留同一保存端口的 Local。
  - 单一进程、单一模块状态、单一 sessions/data/config store；background jobs 只启动一次，不随两个 listener 重复。
  - 运行期每次发现使用受限 Worker 异步执行现有 T1 发现，20 秒超时、完成后 5 秒再调度、严格串行且不积压；Worker 只继承 `SystemRoot`。发现失败/profile 变化/偏好消失先撤销 guard，再停止接收、销毁旧 LAN connections，最后更新状态；下一轮同 GUID/DHCP 新 IP 可在原保存端口恢复绑定。退出时停止监控并关闭 listeners。
- `public-lan-server.js`
  - 所有 OPTIONS/bootstrap/login/业务 handler 之前检查实际 `socket.localAddress` 与 `socket.remoteAddress`；复用 T1 IPv4-mapped normalization 和 selected subnet 判断，完全忽略 `Forwarded` / `X-Forwarded-For` 身份冒充。
  - LAN 首 Admin 前所有请求固定 `HOST_INITIALIZATION_REQUIRED`；远程 `/api/setup` 在初始化后仍固定 `REMOTE_BOOTSTRAP_CLOSED`。Local 首 Admin继续沿用既有 loopback + Host + Origin 同源校验。
  - `/api/lan/status` 仅允许真实 127 listener + 127 peer + 合法 Host/Origin 的 GET；无 HTTP 写配置入口。公开字段不含路径、账号、业务正文或 secret。
  - Server 最多报告 `LAN_SERVER_READY`，从不报告最终 `LAN READY`；只有 Local/LAN bind 与两侧 Host self-health 都通过且首 Admin 已创建才进入该状态。Firewall 与外部第二设备可达性仍由 T3/T4 聚合。
  - 状态覆盖 `HOST_INITIALIZATION_REQUIRED`、`NO_PRIVATE_LAN`、`MULTIPLE_LAN_ADAPTERS`、`PORT_OCCUPIED`、`LAN_START_FAILED`、`LAN_HEALTH_FAILED`、`NETWORK_CHANGED`、`LOCAL_ONLY`、`LAN_SERVER_READY`。

## T3 接口

1. 启用方式：先由 T1 受限 CLI 保存 `instance/lan-deployment.json`，再以 `KSESSION_LAN_MODE=1` 明确重启 Server；不支持远程或 HTTP 配置写入。
2. 本机状态：`GET http://127.0.0.1:<port>/api/lan/status`，必须从 127 listener/peer 发起并提供同源 Host；无配置时首 Admin 前为 `HOST_INITIALIZATION_REQUIRED`，初始化后为 `LOCAL_ONLY`。
3. 配置损坏为 `LAN_START_FAILED`；保存端口冲突为 `PORT_OCCUPIED`；Server 的 `LAN_SERVER_READY` 只是 T3 汇总最终 11 项 LAN READY 的一个输入，不能直接展示为最终可达结论。
4. 配置/IP 变更不通过 HTTP；adapterPreference/port 修改后明确重启。运行期 IP/profile/subnet 变化由 Server 自身异步发现并 fail closed/rebind。

## 测试证据

本机：Windows `10.0.19045.0`、Node `v24.14.0`；测试只用合成身份/文件/地址和 loopback，不冒充目标 Runtime Node `24.21.0` 或真实 LAN。

- `node --test --test-reporter=spec tools/tests/lan-host/server.test.cjs tools/tests/lan-host/server-startup.test.cjs tools/tests/lan-host/server-runtime.test.cjs`
  - **13 tests / pass 13 / fail 0 / skipped 0**。
  - 覆盖双 handler/同一状态、首 Admin 远程拒绝、Host/XFF/Forwarded 冒充、selected subnet、只读状态、保存端口冲突不 fallback、局部 bind 失败 Local 保留、LAN health fail closed、旧连接终止顺序、同网健康失败恢复、DHCP rebind、prior-file、配置损坏、数据/附件字节保护、LAN mode 无配置的 Local 首 Admin，以及 Worker 悬挂期间 Local 仍响应。
- `GITHUB_ACTIONS=true node --test --test-reporter=spec tools/tests/public-bootstrap-http.test.js tools/tests/public-server-http.test.js`（仅复用现有依赖目录）
  - bootstrap **46 PASS**；真实旧 localhost server HTTP **25 PASS**；fail 0 / skip 0。覆盖现有首 Admin、登录、独立随机 session、权限、CSRF、配置版本与重启状态；合成临时目录已清理。
- `node --test --test-reporter=spec tools/tests/lan-host/network.test.cjs tools/tests/lan-host/config.test.cjs tools/tests/public-startup.test.js`
  - T1 network/config **15 PASS**；startup 自报 **80 checks PASS**；Node 汇总 16 tests / fail 0 / skip 0。
- `node --check server.js public-lan-server.js`、三个新增测试文件及 `git diff --check`：PASS。

## 已知限制 / 后续

- 未在开发机或真实 Win10 Host 绑定私网地址；真实双 listener、DHCP/profile 变化、两客户端、Host LAN self-test 与第二设备访问必须由后续受控 Hosted/人工阶段验证。
- Firewall 未由本任务实现；`FIREWALL BLOCKED`、最终 `LAN READY` 和 `HOST READY — EXTERNAL LAN ACCESS NOT CONFIRMED` 由 T3/T4 聚合，不能从本任务结果推断。
- Runtime/Setup allowlist、manifest/hash、升级/卸载/重装与 LAN 配置保持属于 T5；新增模块和测试尚未打包。
- 已有 `data.json` 但 users 为空时保留既有安全契约：不把既有 store 当 fresh install 重开初始化；LAN 仍固定 `HOST_INITIALIZATION_REQUIRED`，不会让远端抢占或覆盖数据。该异常实例需人工恢复正确数据/账号，而不是自动重建。
