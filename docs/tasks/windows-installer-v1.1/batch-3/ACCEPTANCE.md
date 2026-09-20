# Batch 3 验收

正式任务书I01—I32逐项记录在 INSTALLER-TEST-REPORT.json / .md，不能省略或把PENDING写PASS。
I01可见Setup；I02免提权；I03默认目录；I04目录隔离；I05桌面；I06开始菜单；I07启动；I08无CMD；I09浏览器；I10Admin；I11包内Node；I12离线核心；I13中文用户/路径（区分实际用户名与模拟目录）；I14空格；I15非x64拒绝；I16hash；I17不写业务实例；I18保留实例；I19拒绝已有安装；I20运行中拒绝安装/卸载；I21未知目录；I22权限；I23空间；I24取消回滚；I25篡改；I26卸载；I27数据保留；I28快捷方式移除；I29登记移除；I30重装登录；I31数据保留；I32敏感信息检查。
每项注明方法（实际EXE/故障注入/静态/人工）、commit、证据，不用静态模拟代替未做的实机结论。
最终同commit完整公共26/742 fail0 skip0、Portable workflow、Setup workflow、原始Artifact和Win10人工10步全部通过才报告PASS。unsigned/Win11未测/Batch6干净机未认证/未复现的独立flake不阻塞。
