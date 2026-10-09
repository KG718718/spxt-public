# GitHub 优先验收 Master Review / 认证停点

2026-10-09，唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`。结论：测试/CI准备 Review PASS；自动验收尚未运行，`BLOCKED — GITHUB WRITE AUTHENTICATION REQUIRED`。

## 实际整合与测试身份

原冻结公开基线 `5121d8195c1986c83dca9ad0f681463868084f04`。LC01原f52测试修复整合b76ef4e；新local7190535/b226d98/f879eac整合3b14c70/d28e8cd/ef51b16。原T3新增会话与CI localb024c31/5627bc8整合fdc830f/f1e0415。受审代码HEAD `ef51b16a3c293da624cada8a3e2268b0a2a34c64`。所有Execution来源提交和旧工作树保留，未清理；两条原线程已回单后冻结。

LC01只统一测试30秒截止、接入原受验F3和固定生命周期证明：exit0派发成功或精确自有INSTANCE_BUSY窗关闭后自然exit1，其他均FAIL。超过截止、未知窗口、任意非零、强制清理均不能计PASS。30秒覆盖原源码名义查窗约10秒加派发15秒，但不证明外部浏览器调用有30秒上限，更不证明历史超时唯一根因。共同adapter的ShowWindow/其余行为不变，专项与Candidate引用同源测试。

T3新增schema2封闭测试注入、一次性Runner自有私网socket、独立双Bearer/角色/单会话退出、12并发只读auth请求、员工合成PDF上传及附件字节核对。不能称并发写事务验证。报告含sourceCommit，生成前查repo HEAD/CI Commit/GITHUB_SHA，Artifact verifier再比candidate commit，拒绝缺失/伪造/不同SHA及额外敏感字段。loopback只能做本地反例，不生成私网PASS报告。源码API测试不等同浏览器UI与物理LAN认证。

相对冻结基线，生产Launcher、Setup源、beta4可信身份/事务/rollback、server.js、LAN生产模块及业务schema零diff；只改测试、CI、治理。历史beta.2程序未修改，也未混搭新Launcher。新Artifact白名单显式新增一份固定会话报告；其他privacy与26/742要求未放宽。

## 主控实际复验

- 初次f52整合相关Node77/77 fail0skip0。
- 新整合89项首轮88PASS/1FAIL：唯一失败是已批准wrapper的CRLF静态误报；原LC01追加f879修正后专项8/8 fail0skip0。没有把首轮89项记录改成PASS。
- 独立纯Go策略65PASS（含子测试），fail0skip0；25秒成功、超过30秒失败和晚窗不确认反例。
- 主控专项Go test -c仅编译PASS，Windows测试EXE未运行。Execution共同Full overlay编译PASS，未运行产品。
- T3固定报告/接线/触发反例主控3/3、合成loopback会话与业务1/1 PASS；不宣称Runner私网已证。
- 三份workflow YAML、CI与专项/生成PowerShell Parser、diff-check PASS。

核心26 suites/742 checks、真实Setup/Launcher专项、最终privacy/独立QA均待GitHub运行；本地准入不是HostedPASS。

## F3 来源复核

原Run `36246132535` / Artifact `10907910968`，source `c8886e6b6d413c2fd73d6716621d07a80b337e58`。GitHub API本轮复核expired=false，expiresAt=`2026-10-26T13:55:32Z`，ZIP长度32538249、digest `e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6`。Setup SHA `877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6` 及仓库五锚/1042inventory/Node身份由原identity流程在一次性Runner复核。没有重新编译F3、安装本机、研究解包、安装VM或Windows Sandbox。Artifact有限期，不承诺永久可获取。

## 认证与预算

普通git push：Authentication failed；gh auth status：现有keyring token invalid；已连接GitHub create_blob：403 Resource not accessible by integration。未读取、记录或改写任何token。API写入全部被拒，未更新远端ref；最后匿名ls-remote与本地tracking均 `5121d8195c1986c83dca9ad0f681463868084f04`，本地受审代码未push，不能称三方HEAD一致。

| 新门禁 | 已用/上限 | 当前 |
| --- | --- | --- |
| 独立Launcher专项Actions | 0/1 | 源码Review PASS，待认证/同步/单独trigger |
| Full Candidate | 0/1 | 测试准备Review PASS，仍待专项闭合 |
| 独立Final QA | 0/1 | 待Full完整PASS，不调试 |

需要用户恢复GitHub CLI登录及Git凭据助手；不需要新的工程授权。不得索取token正文。恢复后精确核对开发ref未变，先非force同步已审代码/治理；再以单独专项trigger提交登记source和预算，运行一次。若专项PASS才Candidate一次，随后独立QA一次。任何FAIL停止，不追加/挪预算，不进入Full #5旧流程。专项和Full/QA trigger路径/marker互不重叠，run_attempt=1；Execution未创建专项trigger，Full trigger说明未启用。

[GitHub官方push语义](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#push)允许分支尚未合并main的workflow；branches和paths同时满足才运行。[skip指令](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)会抑制push运行，因此代码/治理同步与实际trigger须分开push，避免skip提交吞掉唯一触发。

## 保持的停止边界

历史Full #1—#4 FAIL不变，Full #4具体根因UNKNOWN。尚无beta.4最终Setup包/下载SHA/新Run，当前用户正式基线仍受验beta.2单机版。交互式安装/浏览器UI/显式物理网卡选择与开启、真实Firewall授权、第二物理设备留一次最终人工验收；用户双设备PASS前不宣称企业LAN认证。无main/tag/Release/Batch5/OCR/私有SPXT修改，无工作树清理。
