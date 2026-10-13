# LAN2-ACCEPTANCE-SPLIT-R1 Master Review

2026-10-13。REVIEW PASS — TEST AND ACCEPTANCE ONLY。当前Full Candidate0/1、Final QA0/1，尚无本轮Hosted结果。

代码基线6c4677e82704cca131b19fd8f43db364485f98fc；原长期LC01 Thread01a11f35-5133-7ab0-9101-d9d01a69ccea在原lan2-lc01工作树正常merge605c52e保留历史，local实现282e9bed4c75ce76cae3f68491ac335dbd82ff96、回单7845866be5f6d5c202c125aeb7c5f6d3a51d10ea、格式3cc99ff0d481634073a0e6dc9412da34e2906668。Master只cherry-pick以上三笔获批实现/回单为aed3627/88ca759/2150b8250047c67ac3932d4e0815fe420e6d31df，没有merge原工作树其他未整合F3解包研究；原现场全部保留。Execution正式主动RETURN并冻结。

## 独立验证

Master在集成2150b82执行同一五文件Node测试81/81，fail0、skip0、cancelled0；覆盖兼容/事务、persistent inventory/锁、报告拒绝与拆分生成器。实际记录为.test-work/master-acceptance-split-r1.tap（本地spec reporter，统计已读取）。独立实际生成beta2-to-beta4 Windows overlay，用固定Go1.27.1、CGO0/offline go test -c PASS；二进制未运行，生成代码不含checkSecondLauncher/secondResult/PostMessageW/DialogReason。5个CJS syntax、现有ci-beta4 PowerShell parser、git diff-check PASS。

Execution另报历史LC0120/20及兼容75/75+生成器6/6；Master本轮81包含后两项，不把Execution20项冒充Master复测。未运行本机F3/Launcher/Setup/解包/VM或26/742。核心26/742仍须真实Full且fail0skip0。

基线到集成的文件名单仅治理、Full生成器/对应两个测试、新验收报告和Artifact verifier；生产Launcher/Firewall/Setup/Node、F3身份及profile、事务/rollback、业务schema、workflow均无修改。

## 自动门禁与人工矩阵

Full解绑真实第二Launcher/MessageBox helper，旧LC01源码/测试/证据完整保留。升级测试对三次真实单实例运行共7个前后观察点执行first Launcher/原private Node存活、根锁exclusive open必须sharing/lock violation、READY/NODE_SPAWN数量不意外增加。锁可被取得、未知错误、原进程不活或事件变化均t.Fatal；成功handle须关闭。该基线不证明双启动。既有U01-U30、coreProbe、app.Wait/锁释放、persistent inventory、U05/U06拒绝后quiescence、rollback/卸载重装/data.json/附件/LAN config byte规则不变，只排除历史已批准根.launcher.lock。

新增beta4-acceptance.json总状态严格AUTOMATION_PASS_HUMAN_PENDING。18自动字段包括Portable、真实Setup/升级30项、运行基线、兼容15项/原历史LCK03合成、offline/private session/Firewall、26/742与privacy/identity。17人工字段明确首次Admin/浏览器登录、双账号并发读取保存附件、第二启动时原后台稳定、实际第二启动/精确正文/按钮/自然退出/双启动、正常退出重启数据保持、向导/开页/物理Win10/真实网卡/UAC/Firewall/第二设备/LAN全链路，全部HUMAN_PENDING。scope固定singleInstanceBaselineOnly=true、secondLauncherStarted=false、doubleLaunchProven=false、enterpriseLanCertified=false。

lockMatrix精确LCK01-LCK14；LCK03实际双启动HUMAN_PENDING，其他自动项PASS。旧compatibility.locks.LCK03仍是node:test exact passed-subtest mapping的合成证据，verifier严格验证原PASS和method，不将静态合成推为实机双启动。

## 报告与交付安全

Artifact verifier每次先重新校验所有既有实际证据、source/F3/身份/EXE SHA及privacy；自动报告PASS且26 suites/742 checks/fail0skip0通过后才创建缺失验收报告，已有合法报告只重验不覆写。严格key/type/status/source/file-set和固定人工状态；FAIL/UNKNOWN、缺/额外、不同来源、人工伪PASS/企业认证伪声明均拒绝。本地反例覆盖创建/重验/篡改、失败不生成成功报告、原LCK03未知或伪method拒绝。成功Artifact上传仍受原workflow success()控制，失败只留固定摘要，不提供失败候选安装包。

## 预算与唯一下一步

原F3 Artifact10907910968已再核验expired=false，沿用原SHA/Run/source，不重编。先非force同步开发分支local/origin/GitHub一致，才唯一独立trigger Full Candidate1次；Full PASS后才独立Final QA1次。LC01/额外诊断0，不retry。任何Full或QA FAIL立即STOP回网页版，不继续修复；都PASS才提供人工Win10双设备安装包。人工FAIL同样停止发布，不能自动放宽或修复。历史Full #4与全部LC01 FAIL/UNKNOWN不改；不操作main/tag/Release/内部SPXT，原工作树不清理。\r\n