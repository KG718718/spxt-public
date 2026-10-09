# LAN-2 GitHub 优先验收授权与预算

2026-10-09；用户正式授权。唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`，旧 Master 永久只读。唯一开发分支 `codex/lan2-manual-host-v1.1`。

## 当前事实

历史冻结 HEAD `5121d8195c1986c83dca9ad0f681463868084f04`；历史 Full #4 Run `36388264496` @ `2e9294d9a61426dac428f7c8ff8a12d36a4bbbb8` FAIL，第二 Launcher 超时的唯一根因 UNKNOWN，全部旧失败和预算保留。

原 LC01 local `f52f9cafdcbad2d5c434c3f7d4b97d62a51d502d` 经 Master Review，整合为 `b76ef4e8afec00a441af09405c1f12b427a1b7ca`。只修改验收测试：成功派发自然 exit0，精确 INSTANCE_BUSY 拒绝关闭归属正确的模态窗后自然 exit1；其他非零、启动失败、未知弹窗或超时均 FAIL。失败时受控强制清理不能计 PASS。相关本地 Node 77/77、fail0skip0、diff-check PASS；生产 Launcher/Setup/identity/transaction/rollback/schema 未改。

## 新预算与依赖

| 门禁 | 已用/上限 | 准入 | 当前状态 |
| --- | --- | --- | --- |
| 独立 Launcher 专项 Actions | 0/1 | 原 F3 身份、测试/CI源码及 Master Review PASS | 准备中 |
| Full Candidate | 0/1 | 专项全部批准的自动门禁闭合，Full覆盖审查 PASS | 冻结待专项 |
| 独立 Final QA | 0/1 | Full 完整 PASS | 冻结待 Full |

每次在触发前登记受测 source SHA，触发后登记 Run/Artifact/结论。失败不自动追加次数，不以 QA 调试。不恢复旧 Full #5 授权；这是新方案的单次 Candidate 预算，历史 Full #4 仍 FAIL。

## 受验程序来源

仅原 F3 beta.2：source `c8886e6b6d413c2fd73d6716621d07a80b337e58`，Run `36246132535`，Artifact `10907910968`，Setup `K-SESSION-Setup-1.1.0-beta.2.exe` SHA256 `877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6`。依照仓库固化身份锚核对安装后 Runtime/Launcher/program/metadata；不重新编译旧版本，不混搭 beta.4 或 main。Artifact 有限期，不承诺永久下载。

停止本机 F3 解包工具研究、不安装 VM/Windows Sandbox、不借用真实 instance。只复用一次性 GitHub Windows Runner 的既有下载、SHA256、安装和升级流程。

## 专项 PASS 条件

原受验 beta.2 正确安装及身份核验；第一 Launcher 与 private Node 正常启动；第二 Launcher 成功派发或精确忙碌拒绝的路径可区分且自然退出；第一 Launcher/Node 保持正确，独占锁不被第二实例取得，不产生第二后台；正常停止后进程退出、锁可独占打开且探测句柄关闭。任何关键条件未证不得 PASS。

模态窗只能在第二 Launcher 进程、窗口身份、固定预期错误全部吻合时受控关闭；不得点击其他或未知窗口。Hosted 不能可靠完成交互则记录未验证，并停止后续 Full；强制结束不能冒充正常退出。固定结果报告不能带真实业务、路径、账号、token、环境或窗口正文。

## Full 与人工验收边界

Full 覆盖下载/安装/启动/创建Admin/显式选择LAN网卡/开启LAN/浏览器访问与登录/基本业务，以及升级rollback、卸载重装保数据、独立客户端会话和模拟并发、地址端口与访问限制、防火墙最小规则、26 suites/742 checks fail0skip0、Artifact privacy、Setup SHA256。既有实现能证明的范围必须列源码和运行证据；合成验证不等同真实企业 LAN 认证。

真实交互式桌面、真实防火墙授权、第二物理设备/真实网络路径分别 HUMAN PENDING，不假称 GitHub 已证明。只有自动门禁与独立 QA 达到批准条件后才提供 beta.4 人工验收包及下载链接/source SHA/Run/EXE SHA/未验证项/最终双设备步骤。真实用户双设备 PASS 前不能宣称企业 LAN 已认证。

## 执行与停止

禁止普通 sub-agent，沿用原长期 Execution/QA Thread，Execution 不创建后代、不 push；Master 独立 Review/integration/Git/Actions。禁止修改原 beta.2 程序、内部 SPXT、真实数据、main/tag/Release，禁止清理旧现场，禁止 Batch5/OCR。普通测试工程问题在预算内自主闭合；产品/安全边界变更或专项/Full/QA FAIL 停止返回决策，完成后停 `BLOCKED — AUTOMATION PASS / QA PASS / LAN HUMAN PENDING`。
