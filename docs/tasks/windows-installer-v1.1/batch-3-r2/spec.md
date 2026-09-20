# R2 Spec

## 已核实事实与最小契约

原Launcher instancePath默认LOCALAPPDATA/K-SESSION/Beta/instance，childEnvironment把data/config/attachments/backups/logs/runtime/temp统一映射到instance；现有--instance适用于Portable。原安装快捷方式和Run无参数、没有安装绑定。public-startup.js要求users/applications/payments集合并拒绝损坏及孤立数据，不修改该业务校验。

新增官方CreateInputDirPage（在InfoBefore之后），标题业务数据与附件保存位置；保留原默认。程序目录/组/Ready隐藏不变。

绑定：{app}/uninstall/instance-binding.ini（不在program）保存schema、程序根、instance；当前用户HKCU64 Software/KSESSION/Beta/InstallerBinding记住上次InstallRoot/Instance，卸载仅保留这两个路径偏好，不保留卸载登记。此为正常应用设置，不请求管理员权限。桌面、菜单、完成启动都显式传--instance；直接EXE也读取绑定，参数冲突、绑定缺失/损坏时停止，不回退空目录。Portable无安装标识时沿用原契约。识别安装模式依据安装绑定文件、相邻uninstall清单或匹配已记忆安装根，防止单一配置丢失时回退。

路径：绝对本地固定盘、非盘根、非Windows/Program Files/程序根及其交叠路径、拒绝重解析点/链接、可写；未知非空拒绝。已有JSON仅识别合法集合形态，不替代应用完整业务校验。安装器的独立校验通过同Launcher隐藏辅助模式实现，避免两套路径规则。仅检查结构，不记录账号/附件正文。

新空目录可创建非业务身份标记.ksession-instance-v1；用于识别未完成首次Admin创建的自有空实例。已有业务数据保留，不初始化、改写、迁移；缺数据但有附件/配置不能当空实例。卸载不删数据位置或标记。

重装优先上次位置；旧Beta没有记忆则原默认。记忆位置丢失/不可用必须报错或用户明确另选，不静默切换；不同位置明确非迁移，交互确认，静默测试须显式确认切换参数。卸载有保留数据提示。

边界：允许必要最小Launcher安装配置/校验入口与测试，不改业务源/依赖/公式/权限/Node/PDF/OCR；不做迁移、升级、签名、Release/main/tag。所有Windows真实安装在一次性CI；D盘测试仅CI专有新目录，不触及本机D盘或业务数据。
