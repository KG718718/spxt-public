# Batch 4.5 — Controlled Windows Production Discovery Proof 止损

## 当前结论

**BLOCKED — CONTROLLED WINDOWS PRODUCTION DISCOVERY FAILED**。网页版2026-09-27《Final Cost-Controlled Validation Decision》第4节明确规定：真实Win10若得到`NETWORK_DISCOVERY_FAILED`即停止，不得进入Final Full。本机实际结果正是该固定生产错误码。H1/H2历史2/2保留；不批准H3/H4。现有Final Full0/1、QA Hosted0/1均未使用，QA2未授权。无beta.3最终Setup Artifact，未到LAN HUMAN PENDING。

## 可复核事实

- 当前受控开发机只读系统身份：Windows 10 专业版 x64，10.0.19045。原T5 thread `01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9`、原b4-qa工作树、原本地分支执行阶段A，没有新线程或工作树。
- 原T5先提交只读proof工具`26d44ab2e0bc1859d03394b7d9461c6ef8a707b1`，随后实际运行并提交固定证据与RESULT `c39cdaafa9cd8b25468009318cca4dabcd4ecb67`。Master Review后集成到公开LAN分支为`5b5de75`、`13caac8`。
- `public-lan-network.js`在原T5冻结基线、proof提交和当前集成分支的Git blob均为`4e13e944472f845675fe73d176f063c4fe97f6ed`，未改生产路径、网卡、私网、虚拟/VPN/Public判定。
- 实际调用`resolveSystemPowerShell()`成功，P01=true；首次实际调用`runWindowsDiscovery()`抛生产固定`NETWORK_DISCOVERY_FAILED`，证据只记`status=FAIL / reason=DISCOVERY_COMMAND_FAILED / P02=false`。依批准卡立即停止，没有再调用`discoverWindowsLan()`；P03—P08以及`privateCandidatePresent`均未测，JSON中的false代表未到达，不能解释成安全规则失败或本机没有private地址。
- 固定证据`evidence/controlled-windows-proof.json`经Master逐字段白名单、source SHA与状态核验，未含IP/网卡/GUID/MAC/hostname/路径/route/stdout/stderr或其hash；唯一文件hash是公开生产源码SHA256`7f2ac479b3bf2f06bf90b34257aeed59db94c3b00ddf81dabd8b997b8c1e241e`。
- 实际proof前原T5合成工具反例7/7 fail0skip0、Node语法和diff检查PASS。触发立即停止后，未运行本轮完整LAN、兼容事务或Firewall本地复验；此前LAN62/62、兼容45/45等证据保持历史，不能冒充本轮复测。没有Firewall/Registry/网卡/路由/DNS/Profile写入、listener或Hosted运行。
- H2 GitHub Hosted与本机Win10均归到生产固定`NETWORK_DISCOVERY_FAILED`，**不证明其底层子原因相同**，也不能证明LAN产品设计整体失败；但已不能将阻塞归因于Hosted独有环境。`runWindowsDiscovery`内部可能由子进程启动/超时/非零/信号、非空stderr或解析失败触发，同一闭合错误码不足以选择修复。不得直接降低生产PowerShell安全路径和网络筛选要求。

## 停止边界与后续决策

原T5已收到再次冻结通知；T1—T4/QA维持冻结，保留原工作树及历史Artifact。阶段B Hosted合成策略尚未授权执行，Final Full0/1和QA1 0/1不得用来诊断；不进入Batch5/OCR/main/tag/Release。8.3额外历史110PASS/1SKIP在本次停止点未重新判定；网页版已给出双环境确实不可用时独立记录`ENVIRONMENT_CAPABILITY_NOT_AVAILABLE`的条件授权，但核心26套742项零skip仍未运行。

网页版下一步可选择：**A** 新批准受控Win10定点、只读、闭合子阶段诊断，原T5先做本地反例，固定区分生产系统命令失败的安全类别，不输出原始路径/IP/网卡/stdout/stderr或其hash；确认根因后再决定是否需要生产修复和重新完成P01—P08 proof，未PASS前不进Final Full。**B** 维持冻结，等待另一个受控Win10环境或独立非敏感证据。当前两方案均未获新授权；不能自行把`NETWORK_DISCOVERY_FAILED`标作环境豁免或把Hosted合成测试代替真实Win10 proof。
