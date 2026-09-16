# Launcher 生命周期 / L2 Plan
用户已批准Batch2A，执行当前任务串行，不新建Agent/工作树。
1. 先保存R5A验收文档检查点，建立GitHub-first规范。
2. 实现Go标准库原型、原生状态窗口（打开页面/停止服务按钮），GUI子系统无控制台。
3. CreateProcessW以CREATE_SUSPENDED | CREATE_NO_WINDOW启动**绝对包内Node**；加入KILL_ON_JOB_CLOSE Job Object后才ResumeThread，消除未入Job孤儿窗口。持有不可继承的Job/进程句柄。
4. 独占锁失败时只寻找同实例窗口、验证其EXE身份并请求owner重新验证健康；不得凭端口/PID文件复用。窗口消息不接受URL、命令行或路径。
5. 8080—8099有限范围逐个探测。空闲与bind间竞态时只终止自身子进程后换下个端口；外部进程不终止。
6. ready后ShellExecuteW系统默认HTTP处理器。浏览器关闭服务继续；浏览器失败服务保留，窗口展示URL、错误码。
7. 窗口“停止服务”显式确认、停止Job后等待子进程退出再释放锁；关闭控制窗口同理。--stop仅给测试/未来快捷方式，普通用户使用按钮。
8. 定时检查Node句柄异常退出，显示中文故障；不自动重启无限loop。Launcher崩溃/强退/注销由内核关闭Job回收自己的Node。WM_QUERYENDSESSION/WM_ENDSESSION正常响应。服务终止不是事务级优雅shutdown保证，本批不改server接口。
9. .launcher.lock残留文件不作为“仍在运行”依据，内核共享模式锁才是；无PID文件可误杀。业务data/附件永不删除。
10. 日志仅固定事件+时间、版本、PID/端口、包路径、错误分类；Node业务stdout/stderr不收入launcher.log。明确TEMP在包外，环境白名单无NODE_OPTIONS/凭据继承。
11. 先Go单测，再隔离Win10 EXE L01—L17及崩溃/并发/错误反例；Actions重构建和自动集成。二进制仅Artifact。
12. 代码、测试、工作流commit/push开发分支；结果文档另提交并引用受测code SHA，不能声称文档提交重编译。仅验收通过才PASS并停止。
普通用户停止入口：保留的小型原生控制窗口。无需托盘、命令行或Task Manager。高级 --stop 不作为普通用户唯一入口。
