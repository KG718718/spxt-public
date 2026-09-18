# Batch 2B Portable 测试报告

## 验收对象与限制

最终对象为cfc329f的GitHub Actions整包ZIP，run 35294691905 attempt2 / Artifact10527372359。内层ZIP SHA256 `35bda7ac54150622be6673570f065f753d2a6b3665ecd8619678abd771c6db44`；本地包不替代正式对象。

## 已发现并修复的问题

1. `23dab7e`：Launcher 在业务 `logs` 写日志，触发无 data.json 时的孤立安装保护；仅改 Launcher 日志到外置 `instance/launcher-logs`。未修改 server.js 或降低业务保护。
2. `cb661bf`：只读程序测试使用通用 WRITE 拒绝，连带拒绝 SYNCHRONIZE，EXE 无法执行。改成 WD/AD/WEA/WA/DE/DC 的精确拒绝，并验证新建文件失败、已有程序文件写模式打开失败、读模式成功。参考 Microsoft [访问权说明](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights)。
3. 合成中文 CIDFont PDF 缺 FontDescriptor，发生字体回退与解码异常；补齐测试字体描述，原中文/金额断言不变，业务 PDF 路径不变。
4. `cb661bf` Runtime CI `35179679823`：public-full-browser 页面加载20秒超时，其余25套成功，不能记完整回归通过。最终新 commit 必须全套重跑。
5. `cfc329f` Portable run `35294691905` attempt1：staging 与 ZIP 新路径实际 EXE 各27项通过；后续全回归 public-workflow-http 第56行失败，项目 JSON 唯一变化为 archive.updatedAt 从09:20:03到09:20:04。源码既有归档更新使用墙钟时间；业务/测试文件相对2A无差异。同commit独立回归 `35294691886` 为26套742项0失败0跳过。没有删断言或修改业务，原样重跑整个Portable工作流并保留attempt1。此为已观察到的时间边界脆弱性，不以一次绿色结果宣称稳定性问题已修复。

## 本机辅助证据

- Win10 开发机，`local-02/readonly-diagnostic-02`：实际 cb661bf 配对 Runtime/EXE + 后续夹具修正，P01—P25 与 S01/S02 共27项通过；另验证自有 Node 异常终止后下一次启动恢复。
- 此次辅助检查不是同 commit 最终正式验收，没有作为 Actions Artifact 上传。
- `local-03`：cfc329f fresh 构建在 npm 生产依赖阶段180秒超时，没有生成有效候选或 ZIP；保留失败证据，未使用已有 node_modules 冒充 fresh 构建。
- 所有自动测试实例、缓存、附件均为 E 盘新建隔离合成内容；没有访问其他用途版本。

## 测试解释

P03 检查真实进程未出现控制台窗口；P04 自动化只断言系统接受默认浏览器打开请求，用户可见页面须人工确认。P10—P12 对包内原始 PDF 提取函数进行真实普通文本、中文和多页调用，不是模拟返回；另校验页数，禁止 native addon 和外部网络。P13/P14/P15 使用实际已启动 Node 的原导出、上传和结构化备份接口。

S01 空闲停止、S02 取得页面且无在途提交时停止。没有模拟“任意业务请求提交中强停保证无损”；Job 进程级终止不是事务排空，Batch4 再评估退出和升级策略。

## 最终自动化与下载校验

| 对象 | 结果 |
| --- | --- |
| Actions staging 实际 EXE | P01—P25 + S01/S02，27/27 PASS |
| Actions ZIP全新中文空格解包实际EXE | 同27/27 PASS |
| L01—L17 + 6反例 | 23/23 PASS |
| 同commit公共全回归 | 26/26套，742项，fail0 skip0 |
| 只读程序ACL | 创建/已有文件写入拒绝；启动/PDF/上传/Excel/备份正常 |
| 完整复制程序到B | 使用B包内Node和原外置实例；账号/数据保留 |
| 异常退出恢复 | 再次启动只重建自己的Node |
| 程序hash/数据污染 | 前后1042文件一致，无实例进入ZIP |
| 本机下载Actions外层Artifact | SHA256与GitHub digest一致 |
| 本机内层ZIP | 51,285,232 bytes，SHA256与CI一致 |
| 本机解包完整性 | 1042文件，manifest/EXE配对校验PASS |
| 本次整包Win10人工 | 2026-09-18 用户重新执行 1–8 步全部正常，正式批准 PASS；不是沿用2A反馈 |

2026-09-18 用户补充完整验收：K-SESSION.exe 启动、自动浏览器开页、原账号登录、仅关闭浏览器后的后台行为、退出/停止后页面不可访问、再双击恢复、账号和数据保留、启动无影响使用异常，1–8 步全部正常。证据类型为用户人工验收声明；本次未重新执行自动化，不改原始 Artifact 内生成时的 PENDING 字段。

已批准独立待办 TEST-FLAKE — archive.updatedAt second-boundary stability（../test-flake-archive-updated-at/TASK.md）。不作为 Batch 3 阻塞，但不豁免后续 CI 门禁；不能删除原断言、静默忽略失败或用简单 sleep 掩盖。此前失败与重跑结果继续保留。

原始证据见该Actions Artifact内portable-test-report.json、integration.json、public-regression.json、build-info.json、runtime-manifest.json、zip-identity.json、SHA256SUMS.txt、license-summary.json；自动化是Hosted Windows Server，不等于Win11或干净机验收。
