# 第16批｜在线安装候选最终回单

日期：2026-09-11。用户确认“首次联网取得官方锁定运行依赖、之后本机运行”；继续原公开版目标，不创建新任务/Agent/工作树。

## 结论与定位

在线安装候选已实现并在 GitHub 托管 Windows 实际完成安装、启动、浏览器、完整回归与恢复验收。代码 d2553434aa24b30339a9a24a2bdbed08f126a80b；[CI 34605839563](https://github.com/KG718718/spxt-public/actions/runs/34605839563) 的 windows-core、online-installer、optional-ocr 全部成功。随后仅同步治理 Markdown，不改变受测 payload、安装脚本、许可文件或 ZIP。

本轮无本地公开仓库/源码/日志/产物落盘，只有内存中的文件转换、ZIP检验及 GitHub API。所有文件、安装目录、合成账号、截图与运行环境仅在云端。未读取或修改真实业务资产或真实SMTP；无 PR/main合并/Release/部署。

## 实际交付

- Install.cmd：Windows x64 自举入口，无需预装 Node；严格 HTTPS 官方地址、固定版本、归档/可执行文件 SHA256，不降低 TLS、PowerShell 或系统安全策略。
- installer.js / install-common.js：源码白名单与哈希、官方 npm 锁文件、依赖文件库存、目标保护、安装与运行互斥、阶段目录和最后切换 active 指针。
- Start.cmd / launcher.js：实际本机启动，默认回环；用户明确选择 --lan 才监听其他网卡；自己的停止和锁释放，不停止他人服务。
- distribution.json：Node 24.21.0 / win-x64 官方来源与校验值。
- tools/build-online-package.js：只在托管环境生成源码在线安装 ZIP、PACKAGE-MANIFEST.json 和 SHA256SUMS.txt；核对解包逐文件字节。
- README-install.md：中文安装、启动、配置、备份/恢复、缓存/异常锁、邮件、可选OCR及LAN边界。
- tools/tests/online-installation.js 和云端工作流：真实安装与失败保护，不以源码静态断言代替实际运行。

实例与版本布局：runtime 保存官方运行环境；versions/<digest>/app 保存程序和已装依赖；instance 保存使用者数据/配置/附件；active.json 最后提交。只支持识别的本产品目录与相同实例结构，拒绝陌生非空目录及结构不兼容升级。不同版本旧程序和缓存不会静默删除。

## 失败优先与修复过程

1. 先提交安装测试 e147f44，CI 34599910859 按预期因安装实现缺失失败；未当成功。
2. 实际云端自举暴露 CMD 参数引号、云端 WinPS 缺 Get-FileHash、tar 非ASCII绝对路径、write-excel-file 的导出入口差异。分别以真实命令调用、.NET SHA256、tar当前目录相对路径、write-excel-file/node 修正，不改系统策略或使用本地绕过。
3. 安装19项首次通过后，人工读取云端截图发现新 Admin 在税率未填时出现初始化失败，未据“自动测试绿”停止。先补反例 cbf465d / CI 34603668031，确认失败。
4. approval.html 接受 API 的明确未配置契约 taxRate:null、taxRateConfigured:false；缺税率时列表仍可读，员工计算显示待配置，不将 null 转成 0。明确 taxRate:0 有效，既有计算公式/历史快照不变。
5. 增加员工真实表单与失焦触发、显式0刷新、ZIP与实际安装源文件一致性等检查，扩至23项。既有 onchange 规则保持。
6. 读取员工截图发现日历图标黑底偏暗；仅中央样式给原生日历图标可读金底，并保留日期输入规则，重跑同一完整云端门禁与截图。

## 最终实测

| 范围 | 结果 |
| --- | --- |
| 公开核心 | 25份测试，734项套件报告检查，失败0 |
| 实际在线安装 | 23项通过 |
| 可选 OCR | CPython3.11.9 / PaddleOCR3.6.0 / Paddle3.2.0，合成识别6项通过 |
| 依赖审计 | 0漏洞（本次已安装锁定依赖） |
| 页面 | 安装后的首Admin、Admin空审批、未配员工、显式0刷新；console/pageerror为0 |
| 实际部署环境 | 未操作 |

23项安装检查涵盖：非法路径；源码零二进制/零实例；ZIP逐文件字节一致；真实官方下载/npm安装；版本/哈希/许可；陌生非空目录零变；本机初始化；首Admin前所有业务表空；未配置Admin可查看空列表；未配置员工不算0；Admin显式0；正常0税率页面；运行时拒绝双开/安装；浏览器无脚本异常；同版本重装保留实例；重启保留配置/关闭初始化；payload篡改；npm依赖篡改；非法端口；非官方npmURL；真实npm integrity失败；同结构程序升级；停机完整副本恢复。

全部账号与业务夹具明确为合成数据。安装检查为演示首次登录后另建合成员工做权限检查，该测试实例不进入 ZIP；不是预置用户。恢复是同云端 Windows 身份的隔离副本，不声称异机 DPAPI 恢复成功。

## 下载与可追溯证据

[在线安装候选](https://github.com/KG718718/spxt-public/actions/runs/34605839563/artifacts/10266950988)（Actions保留30天）。外层 artifact 内含：

- K-SESSION-online-setup.zip、SHA256SUMS.txt、PACKAGE-MANIFEST.json。
- report.json、bootstrap.log、expected-integrity-failure.log。
- 01-installed-first-admin.png、02-installed-login.png、03-unconfigured-employee.png。

内层安装 ZIP：342132 字节，43个文件（42项清单记录加根清单），其中32份白名单运行源码；没有实例/测试/截图/运行二进制。SHA256：

```text
8d251676da49d87b5d2c06a4b128ef79143963b53d18f66c6968e8346adbe2c8
```

三张安装截图已实际查看：首Admin创建入口；新Admin未配税率正常空审批；员工未配税率提示和原生日历图标。截图证明其显示状态，不保证所有硬件/浏览器完全一致。完整五页与跨模块浏览器、依赖原始许可证、OCR证据另随同一CI产物保存。

Node官方归档SHA256：158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541。
node.exe SHA256：ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32。
固定官方来源：https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip 。

## 权限、许可与剩余边界

用户批准联网方案不是批准 main 合并或正式部署。main 保持 7eb1ebe17450301aa0f290d55a5a0d3dd7ff2a6e；本轮只推 codex/public-v1 并触发授权的托管CI。无本地公开副本或额外代理。

根 MIT 原文保持，第三方声明随包，下载依赖保留上游原始许可；不将未完整审查的原生二进制再次打入本ZIP。在线安装不是许可豁免。无代码签名，哈希不是签名。

真实双机LAN、HTTPS/防火墙、系统服务、任意旧版本迁移、异机密钥恢复、离线整包、正式Release另定范围。安装失败缓存、旧版本与异常锁保留并在指南说明；不自动删除用户数据。当前门禁通过不等于所有未来输入无bug，也不授权在实际运行实例上进行试装。
