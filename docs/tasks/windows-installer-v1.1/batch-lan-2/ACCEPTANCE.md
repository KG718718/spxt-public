# Batch LAN-2 验收矩阵

本表是目标，不能把 Batch 4.5 局部测试或 Batch 4 PASS 代入为本 Batch PASS。每项须记录源码 SHA、环境、证据与 Review；人工项单独标记。

| ID | 核心语义 | 当前 |
|---|---|---|
| L2-01 | RFC1918 合法 IPv4 候选枚举 | NOT RUN |
| L2-02 | 公网、APIPA、loopback 排除 | NOT RUN |
| L2-03 | 明显虚拟/VPN 候选排除 | NOT RUN |
| L2-04 | 单候选仍要求用户明确确认 | NOT RUN |
| L2-05 | 多候选由用户选择，不猜测 | NOT RUN |
| L2-06 | interfaceName 与选择持久化，不存 IP | NOT RUN |
| L2-07 | DHCP 变化从原接口重新获得 IP/subnet/URL | NOT RUN |
| L2-08 | 接口消失/改名/地址歧义→NETWORK_CHANGED | NOT RUN |
| L2-09 | 8080—8099 真实 bind | NOT RUN |
| L2-10 | persisted port 冲突不静默漂移 | NOT RUN |
| L2-11 | loopback + selected IP 双明确 listener | NOT RUN |
| L2-12 | 生产路径禁止 0.0.0.0 | NOT RUN |
| L2-13 | First Admin 仅 loopback | NOT RUN |
| L2-14 | remote peer selected subnet guard | NOT RUN |
| L2-15 | Firewall Private + 精确端口/程序/范围 | NOT RUN |
| L2-16 | UAC 拒绝时 Local 仍可用 | NOT RUN / HUMAN REQUIRED |
| L2-17 | Launcher 展示身份、网络、URL、状态正确 | NOT RUN |
| L2-18 | 复制 LAN URL 正确 | NOT RUN |
| L2-19 | 受验 F3 beta.2→beta.4，instance/账号/附件保持 | NOT RUN |
| L2-20 | 卸载/重装保持 instance 与 LAN config | NOT RUN |
| L2-21 | 双客户端 session 隔离 | NOT RUN |
| L2-22 | Host 重启与 DHCP 改变恢复 | NOT RUN / HUMAN REQUIRED |
| L2-23 | 核心 26 suites / 742 checks，fail 0 skip 0 | NOT RUN |
| L2-24 | 最终 Artifact privacy | NOT RUN |

附加硬门禁：beta.3/未知 beta.2 拒绝；beta.4 same-version/降级保护；失败 rollback 精确保持 beta.2；业务 schema/AppId 不变；旧 PowerShell discovery 不在有效生产调用链；Final QA PASS；最终 `K-SESSION-Setup-1.1.0-beta.4.exe` 的 SHA256 和来源 Run/Artifact 可核对。LAN URL Host 自测不等于第二设备可达。

最终用户人工 13 步：安装/升级；创建/确认 Admin；打开 LAN 设置；选网络；确认可信；点击开启；必要时同意一次 UAC；Host 打开 LAN URL；第二设备打开；登录；检查账号/附件；双客户端；Host 重启恢复。自动工程完成后才交用户。
