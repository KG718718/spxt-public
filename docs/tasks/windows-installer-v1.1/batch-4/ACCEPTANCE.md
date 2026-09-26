# Batch 4 Acceptance — 验收标准与结果入口
U系列单独计数，不改变26 suites /742 checks语义。F3原始报告U01—U30全部PASS；整体独立QA首轮FAIL（CI静态门禁假绿），正在原T4返工；不得将产品自动报告当作整体QA通过。详见RESULT.md、ARTIFACT-VERIFICATION.md与tasks/B4-QA-RESULT.md。下表保留逐项标准，Win10人工尚未执行。
| ID | 必须证明 |
| --- | --- |
| U01 | beta.1 合法安装识别 |
| U02 | 运行中拒绝升级 |
| U03 | Portable 拒绝自动升级 |
| U04 | legacy v1.0.0 拒绝自动升级 |
| U05 | 同版本拒绝覆盖 |
| U06 | beta.2 已装运行旧 beta.1 Setup 拒绝降级 |
| U07 | 原 instance binding 保持 |
| U08 | 升级无数据选择页 |
| U09 | 无 UAC |
| U10 | 真实 beta.1→beta.2 成功 |
| U11 | 新 program 完整性 PASS |
| U12 | 原 Admin 登录 |
| U13 | 原附件读取/下载 |
| U14 | 安装结束首次启动前业务实例字节保持 |
| U15 | 损坏 data/config 在 program 改写前拒绝 |
| U16 | 缺 binding 安全拒绝 |
| U17 | 篡改 program 安全拒绝 |
| U18 | 磁盘不足旧版保持 |
| U19 | 权限不足旧版保持 |
| U20 | 用户取消旧版保持 |
| U21 | copy 故障恢复旧版 |
| U22 | 错误payload/program manifest hash在实际旧program替换前拒绝，故障后program/installer metadata/registration/binding/shortcuts/business instance精确保持或恢复；不绑定PrepareToInstall或旧prepare marker |
| U23 | post-copy verify 故障恢复旧版 |
| U24 | 快捷方式指向正确 Launcher/instance |
| U25 | Windows 安装登记唯一 |
| U26 | 升级后卸载保留 instance |
| U27 | 卸载后 fresh beta.2 可选择原 instance |
| U28 | 重装原 Admin/附件保持 |
| U29 | 断网核心升级通过 |
| U30 | 日志/Artifact 无 secret/业务正文 |

真实生命周期：e9417f0 fresh 重建并安装 beta.1→合成 Admin/业务/附件→停止→beta.2 升级→完整性/原账号附件→卸载保留→fresh beta.2 选原 instance→原账号附件。伪造 registry 不能替代。
保留 I01—I32、D01—D13 关键语义及 Runtime/Launcher/Portable/Setup 安装专项，公开 26/26、742、fail0 skip0；与新规则明确冲突的旧“拒绝所有升级”断言须映射新受控升级及非法来源拒绝，不得删去失败保护来变绿。
QA 必查真实升级、不伪装fresh、instance不改/无第二空实例、完整性不削弱、降级拒绝、故障恢复、唯一登记、binding/shortcuts、测试不削弱、privacy、Git/Actions身份。生产代码只读，返工退执行。
自动化 + QA + Actions + Win10人工十步均通过才最终 PASS；否则据实 PENDING/FAIL/BLOCKED。
