# Portable Beta Contract
本批仅公开版 Windows x64。根目录 K-SESSION.exe 与 runtime/app/manifest/licenses/hashes，另有 build-info.json；没有实例/账号/业务数据/缓存。
默认 %LOCALAPPDATA%/K-SESSION/Beta/instance，日志位于该外置instance/launcher-logs/launcher.log，临时文件instance/temp。不是Batch4最终安装升级路径。拒绝与程序目录重叠和重解析路径。--instance保留为测试/高级参数；普通用户双击无需配置。自动测试将LOCALAPPDATA定向全新E隔离目录，不写已有Beta数据。
首轮23dab7e曾将Launcher日志放入业务logs，触发现有server.js的孤立安装保护（priorDirectories），Node在首次初始化前退出。保持业务保护与源码不变，只将Launcher日志独立；失败候选不用于验收。
复制/移动程序后复用同一外置instance；A未停止时B不得强夺实例。旧Node死亡后同owner安全释放旧句柄，再启动当前包内Node；无无限自动重试。
程序完整性：manifest精确hash嵌入EXE，schema/platform/commit/Node版本与hash/受管文件集合校验；启动前失败。普通root额外文件也拒绝。build-info与EXE的对应由整包验证器验证；unsigned不构成抗恶意重签信任链。
停止为Job进程级终止，请先保存，不承诺在途请求无损。浏览器关闭不停止后台。邮件与OCR继续关闭。

## 测试夹具修正（不修改业务行为）
- cb661bf 首次只读测试错误使用通用 WRITE 拒绝，连带 SYNCHRONIZE 导致 CreateProcess 被拒绝；改用 WD/AD/WEA/WA/DE/DC 精确写入/删除权限。验证新建文件和以写模式打开已有 server.js 均被拒绝，但读取/执行仍允许。依据：[Microsoft 文件访问权说明](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights)。
- 合成中文 Type0/CIDFont PDF 缺少 FontDescriptor，解析器回退后字节被误解码；补齐该必需字体描述，不更改中文期望值、不改解析代码。修正后辅助诊断 P01—P25、S01/S02 全过。
- 上述辅助诊断使用本地 cb661bf 成对程序包与更新中的测试，**不代表最终同 commit Actions 验收**。最终必须重新构建整包并解压复验。
- cb661bf 独立 Runtime CI 的 public-full-browser 出现页面加载20秒超时，26套中25套通过；保留失败记录，不引用其为完整回归通过。
