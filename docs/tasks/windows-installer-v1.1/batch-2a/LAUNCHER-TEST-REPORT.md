# Batch 2A — Launcher Test Report

日期：2026-09-17。结论：**PASS（Windows 10 x64 Beta Track）**。
受测代码：`1dc0efc0209aebb40916ccd94d0fd2b423ed9705`。
Runtime 应用来源：`37586d24fe0d26da398d67b62fb1ed06fc19bd94`。
这是原型验收，不是 Setup、正式发布或干净机器认证。

## 可复核证据

- [Launcher CI 35127971944](https://github.com/KG718718/spxt-public/actions/runs/35127971944)：success，同一受测代码；固定 Go 1.27.1，单元测试、go vet、实际 EXE 集成均通过。
- [原公开版回归 35127971754](https://github.com/KG718718/spxt-public/actions/runs/35127971754)：success，26/26 套、742 项、0 失败、0 跳过；文件和目录 symlink 检查通过。不是把旧 R5A 结果冒充本轮重跑。
- [正式审查 Artifact](https://github.com/KG718718/spxt-public/actions/runs/35127971944/artifacts/10460551550)：名称 K-SESSION-launcher-win-x64-1dc0efc0209aebb40916ccd94d0fd2b423ed9705，54,089,080 字节，30 天保留；EXE、build-info、SHA256、许可、集成报告、构建报告及配对 Runtime ZIP。不是 Release。
- 外层 Artifact SHA256（GitHub API digest）：`e72a67890b886fd09e3216415cdb8762ee849b7adc119848e0e71445c6aac0b6`。本轮未成功下载完整外层包再次本地复算；远端存在性与 CI 结果已核实。
- 本机原始证据保留在 E 盘 Batch 2A 隔离输出的 integration-05/integration.json、prototype-03 的 launcher/build-info.json、visual-instance-final/launcher.log。下表完整摘录判定，供网页直接审查；没有把本地路径或真实数据上传。
- Hosted 为 Windows Server runner，不替代 Windows 10/11 消费版实测。

## Windows 10 实测身份

Microsoft Windows 10 Pro x64，build 19045，开发机（不是干净机）。
Launcher：Go 1.27.1 windows/amd64、CGO=0、GUI 子系统。Node 24.21.0/npm 11.19.0，生产依赖 20 个。
受测 EXE 6,926,336 字节；本机 SHA256：
`05c037554a1c1155fe5cadb8804a0c2a1a7071e4e040115ba29498835658febe`。
包内 Node 路径由 EXE 相对定位后变成绝对路径，Windows 文件身份核对，不从 PATH 选择。
自动集成首个 Node PID 7712 / 127.0.0.1:8080；人工复验 Node PID 6328，属于另一次隔离启动。PID 均只描述当次运行，不作跨时刻身份依据。

## L01—L17

|编号|实际检查|结果|
|---|---|---|
|L01|真实 EXE 首次启动、ready|PASS|
|L02|绝对包内 Node，文件身份一致|PASS|
|L03|GUI 子系统、console window 不可见；人工确认无 CMD|PASS|
|L04|READY 后 ShellExecute；用户确认页面可打开|PASS|
|L05|第二次运行 EXE 不新建后台|PASS|
|L06|已有 owner 重新验证健康并打开页面|PASS|
|L07|外部占用 8080 自动选择有限范围其他端口|PASS|
|L08|8080 外部占用者仍存活|PASS|
|L09|人为终止已核实自己的 Node，Launcher 识别异常|PASS|
|L10|缺 Node，显示错误且不启动后台|PASS|
|L11|非法实例路径和真实拒写 ACL 明确失败|PASS|
|L12|中文路径|PASS|
|L13|空格路径|PASS|
|L14|固定字段日志，父环境污染排除，无凭据或业务内容|PASS|
|L15|TCP owner PID 与子进程一致，仅 127.0.0.1|PASS|
|L16|只停止自己持有的 Node；用户确认停止后页面无法连接|PASS|
|L17|完整 Runtime manifest 和受管文件 hash 前后不变|PASS|

额外 6 项均 PASS：X01 Launcher 崩溃时 Job 回收 Node、残留锁可重启；X02 新测试目录真实 ACL 拒写；X03 父进程要求隐藏时控制窗口仍可见；X04 并发首次启动只有一个后台；X05 manifest 篡改在 Node 启动前阻止；X06 100 个允许端口全部占用时失败且不杀占用者。
本机 integration-05 共 23 项；Hosted 同一套自动化检查通过。

## 人工验收（用户回报，不冒充自动截图）

2026-09-17，用户明确回复：
1. “打开系统页面可以”。
2. “启动中没有cmd窗口”。
3. 对“停止服务并退出后窗口关闭、刷新页面无法连接”的检查回复“对”。

辅助日志：最终源码 1dc0efc，READY/BROWSER_OPEN 后，2026-09-17T01:48:45Z 再次 BROWSER_OPEN，01:50:35Z STOPPED（PID 6328）。收口只读进程检查未发现 K-SESSION.exe。
此前自动 UI 工具因 Windows 浏览器 URL 识别不足安全停止，没有绕过限制；截图接口也不可用，**无有效截图交付**。最终可见界面门禁采用上述用户人工验收，不再是缺失项。自动 ShellExecute 接受本身不等于网页可见。

## 两个 EXE 不能混用

|构建|EXE SHA256|嵌入 Runtime manifest SHA256|
|---|---|---|
|CI 1dc0efc|17393312a0788a45d1bd3ebb98ca074a203960f126a97bb382ae3f047041121a|32e09367600eba1fd3206a6c3f742ebaa47943e556dc17dd076933af6f165ecf|
|Win10 本机 1dc0efc|05c037554a1c1155fe5cadb8804a0c2a1a7071e4e040115ba29498835658febe|ec00f453d0b158adaabf16f4120506b997bb0dfaf6b4fff8de3bd38f085dec99|

两者均 6,926,336 字节，同一 Launcher 源码；配对 Runtime 的构建元数据不同，嵌入 manifest hash 不同，因此不能宣称 EXE 位级一致。使用完整对应包，不能把一个 EXE 放入另一 Runtime 后声称验证成功。CI EXE 数字来自该次构建记录，本地人工没有测试那个 CI 二进制。

## 已修复的失败与仍未覆盖事项

- 初次 CI 因 CRLF checkout 改变冻结构建器字节失败；仅在新工作流 checkout 前固定 LF。
- 后次 CI 因 E: SUBST 与物理路径字符串不等而失败；使用 Windows 文件身份比较。没有降低包内 Node 门禁。
- 早期构建输出曾包含 Go cache；最终构建已将 cache/scratch 移出 runtime/artifact，只传允许的产物。失败 Artifact 不是当前审查产物。
- 首次窗口受父级 Hidden 影响、早期测试错误把“无可见 console”要求写成“无 console 内核对象”均已纠正并复测。Node 不显示黑框，不声称没有任何 console 内核对象。
- 未实际注销/关机；代码有会话退出处理及 Job 回收，崩溃回收已实测，不能代替 OS 完整关机认证。
- 未破坏系统默认浏览器注册制造打开失败；该错误分支仅静态核对。
- 未做干净 Win10、Win11、ARM 实机验证，未签名，未做 Setup、OCR、升级/卸载。
- 主动停止是进程级 Job 终止，不保证在途业务请求优雅排空；用户停止前应保存操作。本轮不改业务服务。
