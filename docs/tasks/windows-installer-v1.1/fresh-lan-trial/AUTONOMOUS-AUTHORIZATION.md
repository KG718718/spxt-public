# Fresh LAN Trial — 自主工程最终授权

日期2026-10-14；来源：用户在唯一Master对话直接提供的最终授权。状态APPROVED — AUTONOMOUS ENGINEERING & BOUNDED HOSTED VALIDATION。本决定取代MINIMAL-ACCEPTANCE-PLAN.md中“待批准”、Candidate1+QA1及手动网卡方案的当前效力；该方案与所有历史FAIL保留，不追溯改写。

## 身份与基线

- 仅公开仓库KG718718/spxt-public；唯一Master/回单目标01a0db0e-c950-79e0-8e11-07155e0742f2；旧Master永久只读。
- 已核验local/origin/GitHub原开发HEAD一致：3f4f63089106ddd3cf34e3d0573cbb0a67963d16。从此建立唯一集成分支codex/lan-fresh-trial-v1.1；旧codex/lan2-manual-host-v1.1及现场保留。
- 禁止普通sub-agent/collaboration.spawn_agent/后代Thread；Master派单、Review、集成、Git/Actions/治理；长期Execution独立worktree/local branch实施，独立长期QA只读验收。

## 固定产品目标

fresh-only K-SESSION-Fresh-Trial-1.1.0-beta.4.exe。只有Host安装，客户无需任何开发工具。沿用现有业务、Runtime、Launcher、Firewall helper、业务schema/dataContract与安装身份契约。

自动发现合格物理Private LAN及RFC1918 IPv4：唯一候选自动预选，多候选必须选择；预选不是开启。首次必须用户明确可信网络确认与必要授权。自动安全选择并持久化端口，后台、LAN URL及复制；首Admin仅loopback；多账号、数据与附件。再次运行恢复受信配置；Windows开机或登录后自启属于目标，不能以手动Launcher重启冒充。采用哪种现有权限内接线必须先核实；未真实验证标HUMAN_PENDING。

配置损坏、地址改变、端口冲突、不可信网络均fail closed，不自动开放公网，不静默换端口/网卡。物理/Private证据不得以名称、RFC1918、用户勾选或Hosted虚拟网卡替代。不得忽略PowerShell stderr来恢复旧失败路线。

新Setup严格拒绝已有登记、旧Binding、已有业务instance、非空或不安全目标、同名快捷方式、运行冲突；不覆盖/迁移/删除原数据。标准beta.2及历史标准构建/身份/事务/rollback不改。旧升级、卸载重装、LC01 GUI及U27失败保留result=FAIL、workStatus=DEFERRED；不计本轮PASS。

## 自动验收F01—F09

复用旧方案矩阵且扩展自动部署：F01真实fresh安装及严格拒绝；F02安装后全Runtime/program/manifest/SHA身份、无预置账号或业务；F03实际Launcher/唯一Node/独占锁、loopback初始化和远程拒绝；F04合格LAN自动发现/唯一预选/多候选和不安全拒绝、双监听/端口/subnet/config；F05实际安装payload通过无头浏览器完成登录、两个独立账号/会话、保存回读、附件上传下载；F06正常停止与再次启动、数据/config保持及登录自启接线；F07既有Private最窄Firewall；F08核心26 suites/742 checks fail0skip0；F09严格Artifact隐私、来源、文件清单和EXE SHA。

真实GUI/UAC、物理网卡、防火墙授权、双物理设备、Windows开机/登录实际自启与第二Launcher交互必须HUMAN_PENDING；合成/静态不能冒充真实认证。不得删除安全项目获取PASS。

## 循环、预算与停止

普通工程问题自主Execution→本地反例/修复/复测→Master独立Review→集成→Candidate；无需再申请相同工程授权。任何Hosted失败必须先固定安全证据/根因、实际修改、本地门禁与Review，无修改不得retry。

新Candidate最多3 Run，独立FinalQA最多1 Run，合计最多4；run_attempt也计数，建议各45分钟硬超时。首Candidate完整PASS立即进入独立QA，不浪费剩余额度。QA必须下载同一个Candidate EXE核验相同字节，不重建。旧Full/U27/LC01/Diagnostic全部0，不触发旧workflow。每轮须来源绑定、具体固定阶段/错误和cleanup；失败不可上传为成功包。

强制停止：需要整体架构/安装权限/原安全契约改变；数据损坏/敏感泄露/账号越权风险；需要处理未知所有权或原数据；公网/宽泛Firewall/绕过授权；Runner隔离/恢复/收尾未证；无法真实证明必须自动安全项目；Candidate3全FAIL或QA FAIL；需要main/tag/Release/内部SPXT。普通已有机制实现缺口先核对，不能凭缺口自动断言必须改变架构，也不能以新目标名义放宽旧安全。

仅Candidate+QA PASS后交唯一EXE、Run/Artifact/source/EXE SHA/结果/人工待验/简明说明，状态FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING。最终真实Win10+第二设备一轮验收后才可用于公司内部fresh试用；不宣称企业正式认证。保留所有原工作树、未知文件和失败，不清理、不发布。
