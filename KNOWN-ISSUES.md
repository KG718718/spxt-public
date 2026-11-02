# 已知问题与验收边界

内部技术验证于 2026-11-02 结束。历史 FAIL 表示该次验收没有通过；是否存在产品缺陷，需要结合失败发生的位置判断。

| 项目 | 已确认事实 | 分类与仍未知的部分 |
| --- | --- | --- |
| 原生登记恢复 | Run `41396108321`，`NORMAL_RECEIPT / PRESTATE_UNPROVEN`。首次四视图观察未取得已知状态，创建收据为 0，部分创建及替换场景未执行 | 验收在创建前停止。底层观察子因未知，删除、登记句柄关闭和恢复均未验证。[专项记录](https://github.com/KG718718/spxt-public/blob/d87bba40c623490f0fd682005acdcc9f83a1b3c2/docs/tasks/windows-installer-v1.1/fresh-lan-trial/final-install-lan/NATIVE-REGISTRY-RESULT.md) |
| 历史本地 v3 夹具 | 父子创建后断言失败。当次只有关闭逻辑，没有完整删除回执及恢复回读证据 | 测试收尾缺口。旧对象的归属与恢复为 UNKNOWN，后续成功不能追认。[现场记录](https://github.com/KG718718/spxt-public/blob/d87bba40c623490f0fd682005acdcc9f83a1b3c2/docs/tasks/windows-installer-v1.1/fresh-lan-trial/final-install-lan/AB-OBSERVATION-CLOSURE-RESULT.md) |
| Fresh 安装前观察 | Run `40286717015` 的 SOURCE、BUILD 通过；A 在 F01 报 `INSTALL_ADMISSION_NOT_OBSERVED`，B 跳过，缺少实际 Fresh 安装成功证据 | 报告中后续 admission 状态可遮盖较早错误是已复现的测试工具缺陷，该 Run 的底层原因仍未知。[A/B 结果](https://github.com/KG718718/spxt-public/blob/d87bba40c623490f0fd682005acdcc9f83a1b3c2/docs/tasks/windows-installer-v1.1/fresh-lan-trial/final-install-lan/AB-20261026-HOSTED-RESULT.md) |
| Fresh 启动项身份 | 更早的 FC2 已进入真实 Setup，在目标路径身份校验处报 `TARGET_MISMATCH` | 已观察到安装拒绝。后续局部修复没有取得完整 Fresh 安装通过证据。[FC2 结果](https://github.com/KG718718/spxt-public/blob/d87bba40c623490f0fd682005acdcc9f83a1b3c2/docs/tasks/windows-installer-v1.1/fresh-lan-trial/final-install-lan/FC2-HOSTED-RESULT.md) |
| beta.4 升级、卸载重装及 U27 | 历史完整生命周期 FAIL。U26 的实例保留通过后，U27 专项观察到非空目标被 `KSESSION_REJECT_NONEMPTY` 拒绝，专项恢复也未全部证明 | 拒绝符合安装保护，残留来源及更早 Run 的唯一原因未知。相关路径列为 DEFERRED。[U27 结果](https://github.com/KG718718/spxt-public/blob/d87bba40c623490f0fd682005acdcc9f83a1b3c2/docs/tasks/windows-installer-v1.1/batch-lan-2/LAN2-U27-R2-HOSTED-RESULT.md) |
| LC01 第二 Launcher | Full #4 失败。专项在第二实例弹窗匹配处报 `DIALOG_MISMATCH / UNKNOWN_STATIC_STYLE`，未确认自然退出 | 测试适配器与窗口识别的限制。真实桌面双启动行为未获完整证明，历史 FAIL / DEFERRED 保留。[Full #4](https://github.com/KG718718/spxt-public/blob/d87bba40c623490f0fd682005acdcc9f83a1b3c2/docs/tasks/windows-installer-v1.1/batch-lan-2/LAN2-FULL4-STOP-20260928.md) · [LC01](https://github.com/KG718718/spxt-public/blob/d87bba40c623490f0fd682005acdcc9f83a1b3c2/docs/tasks/windows-installer-v1.1/lan2-lc01/LC01-DIALOG-R2-HOSTED-RESULT.md) |
| Fresh 完整安装及物理 LAN | 缺少合格最新 EXE、完整 Fresh 安装、安装后浏览器业务与独立 QA 通过证据；真实公司网络、物理网卡、UAC/Firewall 授权、两台设备访问和登录自启未认证 | 未验证事项。源码含相关实现，不能据此宣称企业部署可用。[LAN 范围](LAN-DEPLOYMENT.md) |

历史 F3 beta.2 的 Windows 10 x64 单机十步验收仍有效，仅适用于其精确产物和受验路径。它没有认证 beta.4 或 LAN。[历史验收](https://github.com/KG718718/spxt-public/blob/d87bba40c623490f0fd682005acdcc9f83a1b3c2/docs/tasks/windows-installer-v1.1/batch-4/HUMAN-ACCEPTANCE.md)
