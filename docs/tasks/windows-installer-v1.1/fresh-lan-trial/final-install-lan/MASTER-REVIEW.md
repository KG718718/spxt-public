# FINAL INSTALL & LAN — Master 独立 Review

结论：最终源码1a01f8d51722d634431fdc330f5a084432be4d1e的测试与来源门禁Review通过；真实Fresh安装、浏览器业务和整体恢复须由授权Candidate证明，未以本地构建冒充。

## 范围与证据
- 唯一Master及原FRESH-T2/bea7树，未使用普通sub-agent。
- auth1e44df2a7a8a73a404b9a6ae5e17afdeceef541b→受审源码仅11个测试/报告接线文件；Setup、Launcher、Firewall、Runtime、业务、升级身份/事务/rollback零diff。
- 旧schema1授权、IC1历史触发及原报告不改。新schema2 FC1/FC2/FQ1承载用户新增Candidate最多2次及原有单次QA，历史失败不重置。
- 三条旧Candidate、旧Smoke/FAST两次Candidate和旧IC1各按精确Run/control/title/attempt/path/branch/event绑定；完整空页、丢失、替换、重复、未知历史和任何已用QA拒绝。
- FC2必须取得严格安全失败报告、全部cleanup/recovery证明、具体首因、不同代码指纹、本地同源构建及独立Review。笼统Go测试失败、未知Startup异常、无修改retry不具备资格。
- QA仅在完整Candidate PASS后允许，必须下载同一个Candidate Artifact并核验同一EXE SHA；原CI QA分支不重建EXE。
- Workflow只改3个Artifact名称表达式，保留旧前缀fallback供bootstrap失败安全报告；唯一push路径、attempt1、45分钟硬超时、互斥Job、来源/父提交/trigger-only条件均保留。
- 原F01—F09、26/742、严格报告Schema、失败收尾、Artifact精确白名单和未知不转PASS条件未放宽。

## 独立本地复验
Master在最终源码上真实Job运行目标63/63及root134/134，fail0skip0；assigned/naturalExit/stderrEmpty/pipesClosed/handlesClosed/jobEmpty全true，forcedTermination=false。Execution独立Go overlay编译/vet通过。
完整Payload及EXE身份逐字节独立核验另见MASTER-BUILD-IDENTITY.json；本地build仅BUILD资格，不运行或安装产品。

## 未证与停止条件
历史38767500533 F01实际首因仍UNKNOWN，39005740755环境观察失败仍FAIL；新Candidate不预设修复成功。物理Win10/网卡/UAC/真实防火墙授权/第二设备/登录自启/第二Launcher交互均HUMAN_PENDING。
任何安全、隔离、所有权、恢复UNKNOWN即停止；FC2或唯一QA失败停止；不使用其他Hosted、不操作main/tag/Release/内部SPXT、不清理未知现场。
