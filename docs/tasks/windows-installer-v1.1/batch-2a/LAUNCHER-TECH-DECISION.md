# Batch 2A — 技术决策 / L2 Spec
日期：2026-09-17。用户正式任务书批准本批实现，仅公开版 Launcher。
## 比较与决定
|方案|用户额外Runtime|维护/产物|决定|
|---|---|---|---|
|Go Windows GUI / CGO=0|无，使用系统Win32 DLL|标准库单EXE，需少量显式Win32生命周期代码|采用|
|C# self-contained win-x64|无外装.NET|携带.NET运行时，体积及发布面较大|可行但本批不采用|
|普通C#、Python、VBS/CMD、Electron|额外依赖或偏离边界|不满足任务|排除|
固定 Go **1.27.1**，GOOS=windows、GOARCH=amd64、CGO_ENABLED=0、GOTOOLCHAIN=local；Go官方2026-09-17下载API确认正式版本。ZIP SHA256 a3911b5e0e1b1053f25ed0675f4c1c6aad1e2bfcf253df2b9be4caabd2edd95d。标准库，无Go外部模块。
依据：https://go.dev/dl/?mode=json 、https://go.dev/wiki/Windows 、https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects 。
## Runtime契约
沿用已验收37586d24fe0d26da398d67b62fb1ed06fc19bd94应用及Runtime构建器。EXE置于root/launcher/K-SESSION.exe，自身路径定位root/runtime/node.exe、root/app/server.js。不查询系统Node，不修改server。
构建时把对应runtime-manifest SHA256嵌入EXE。启动先验manifest再验全部受管文件hash、文件集合和路径；拒绝链接/重解析路径。不是签名信任链，unsigned Prototype仍需外部SHA校验。
源码/Node/依赖保持R5A结构。Actions可从固定Runtime源码新建相同技术结构并记录新manifest，不冒称与旧ZIP逐字节相同。
## 实例与健康
包外默认测试instance为包目录同级“包名-instance”；高级测试参数 --instance 可指定包外目录，不能指向包内或其父目录。Batch4再确定正式用户目录，不先占用Program Files/注册表。
Windows独占文件句柄锁负责跨进程/会话写入互斥；命名窗口由canonical instance hash标识。二次启动只向同EXE路径的已存窗口发消息，由持有Node句柄的owner复核健康并打开浏览器；跨session/不同包争用拒绝，绝不接管PID文件。
Windows TCP owner PID与所持Node进程句柄一致、仅127.0.0.1监听，并且GET /login.html字节hash匹配包内文件才ready。无新health endpoint。
## 非目标
不改业务/Node/HTML/依赖/权限/数据。不做Setup、OCR、服务、自启动、防火墙、LAN、main/tag/Release。仅操作新建合成实例，邮件关闭，无真实数据。
