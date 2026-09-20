# Batch 3 安装专项测试记录

## Batch 3-R1 续行：Setup UX Finalization（2026-09-20）

用户已确认旧 Actions 原始 Setup 的 Win10 人工1—10步正常、无UAC/CMD、卸载保留数据及重装原账号可登录。这是旧受测ff75923 / Artifact10604780606的补充人工证据，覆盖下文旧时点“人工未验”的当前状态；不改写旧Artifact JSON，更不替代R1新包的六步验收。

代码事实：原脚本已有DisableDirPage=yes及DisableProgramGroupPage=yes，DisableReadyPage=no保留了安装前路径确认页。本次仅改为yes，保留InfoBefore重要Beta/数据保留提示，并按Inno官方CurPageChanged机制将该页动作标题改为安装。不隐藏错误、安全或未来许可证提示。

失败优先：先收紧contract，旧实现准确失败于DisableReadyPage=yes；修改后INSTALLER CONTRACT PASS。git diff --check通过；显式E盘缓存/临时目录下Go TestRelativePathSafety通过，仅编译/静态测试，不冒充本机安装。

受测代码b5b912eb63e299e8e382648f7425011877f04b79。保留所有自定义中文/空格路径及原生命周期门禁；新增不传/DIR的实际默认目录安装、payload完整性、两个快捷方式目标及卸载保留数据检查。I03由静态/人工待验强化为自动化实测，I01/I02/I09仍待新包人工。默认目录检查仅在一次性runner当前用户真实LocalAppData执行；自定义路径、实例、日志和构建仍在E盘，不对本机进行安装，不做系统目录或注册表重定向。

R1首轮b5b912e / Setup35508680286失败：I21—I24、安装完整性、离线核心、卸载保留、重装原Admin、篡改/缺文件拒绝均已通过；在已有安装卸载后重新启动Portable、等待第三次READY（原有I20测试）25秒超时。新增默认路径用例尚未执行，不能报告通过。失败Artifact10604443806保留。相同commit独立Runtime35508680355、Launcher35508680302、Portable35508680227成功，26/742 fail0 skip0，但不代替失败Setup。

追加仅测试诊断：启动Portable前再次验证完整性；失败时记录白名单大写事件/错误码，不输出实例、路径、账号或整份日志。未加sleep、延长超时、删断言或修改Launcher生产契约。根因尚未确定，不称为已知flake，不把一次新运行通过说成修复已证实。

诊断提交c5705447b93ee64a6be56cbc67779ba844c2bfe8仅修改setup_windows_test.go。Git HTTPS发生connection reset，转官方Git数据API逐个验证原始blob/tree/commit，以force=false快进同一开发分支；远端回读SHA一致。随后本地origin跟踪ref因仍落后在297e282更新失败，已用已核验的旧ref值显式修正；不是远端提交失败，没有force push。诊断提交本地E盘Go静态测试再次通过。

最终c570544 / Setup35509078762 attempt1 SUCCESS，安装专项49.92秒完成；29 PASS，I01/I02/I09人工PENDING。I20实际Portable运行门禁通过；I03不传/DIR的真实默认目录安装、快捷方式及卸载保留通过；I13/I14中文/空格自定义路径通过。完整26套742项fail0 skip0，网络恢复及Artifact白名单门禁通过。相同commit独立Portable35509078684、Launcher35509078698、Runtime35509078708均SUCCESS。首轮启动超时本轮未复现，根因仍未确定；诊断改进不是生产故障修复证明。

最终Artifact10604748884；EXE SHA256 25b52591ecb0783869ef08d5f599d0d3fffd94cebd98a38d94e4657732ae4c40，32,983,565 bytes。旧hash与首次失败均保留，不把旧人工反馈套用到新包。以下原始失败及旧包身份作为历史保留。

## 证据口径

只针对 KG718718/spxt-public 的 codex/windows-installer-v1.1。当前不是 Batch 3 PASS。
构建产物、自动化、可见 Win10 安装向导、整机断外网分别记录；不互相替代。
所有 CI 账号、附件、配置均为临时合成测试数据，不进入 Artifact。

## 最终自动化通过 / 人工待验（2026-09-20）

受测代码 ff759238b59f3a6076524f82b81d56690ae4e3d3；后续报告提交不是重新构建。
同commit Setup [35506827438](https://github.com/KG718718/spxt-public/actions/runs/35506827438)、
Portable35506827492、Launcher35506827463、公开 Runtime35506827449 均SUCCESS。
Setup自身重新构建Runtime/Launcher/Portable，真实断网安装/启动/核心/卸载/重装及26套742项全回归通过。
Artifact10604780606，K-SESSION-setup-win-x64-ff759238b59f3a6076524f82b81d56690ae4e3d3。
发布前Artifact白名单门禁要求32记录：28项PASS、I01/I02/I03/I09四项PENDING，不能视为Batch3 PASS。

已实际验证原生Unicode快捷方式目标、安装后1042文件hash、包内Node、无CMD、首次合成Admin、
离线英文/中文/多页PDF、Excel、上传、结构化备份、运行中拒绝安装与卸载、其他Node保持运行、
卸载登记/快捷方式清理、所有外置实例文件逐hash保留、重装原Admin/数据、缺失及篡改程序拒绝。
当前需下载核验最终原始Artifact并进行 HUMAN-ACCEPTANCE.md 十步验收；没有本机可见Setup成功记录。

最终下载状态：gh run download 长时间无进展，停止本次下载进程；官方Artifact API替代下载150秒超时，没有原始ZIP/EXE落地。
32,983,233bytes及EXE SHA256来自最终成功CI，Artifact ZIP大小/digest来自GitHub元数据，尚无本机复算证据。
本轮不将该网络阻塞隐去，不重打包替代，不宣称人工验收完成。

## 保留的首次失败

1. 0211b074d2cb1597703bc1c3d04d404b81d577fc / Setup run [35502435793](https://github.com/KG718718/spxt-public/actions/runs/35502435793)：
   fresh Runtime、Launcher、Portable 两次验证通过；Inno 编译失败，Pascal Script 不支持 GetObject。
   改为官方 COM WbemScripting.SWbemLocator。未生成合格 Setup。
2. 45a4fd89501ede5b17ebef3bb7918bf1354e4979 / Setup run [35502559641](https://github.com/KG718718/spxt-public/actions/runs/35502559641)：
   生成 32,983,534 bytes 的候选 EXE，SHA256
   fe1ccee949efc59641912ad85e6065f9533e400010c64e40df91613a8b6541b0；
   但正常安装退出码1，安装专项失败，禁止交付该 EXE。
   该轮负面用例仅检查失败退出及无残留，不能证明触发了目标门禁：
   日志曾标记的 I21—I24 PASS 现撤回为“原因未验证”，不得作为最终验收证据。
   原始 CI 运行与失败摘要保留，不删除、不隐藏。

## 针对测试误判的收紧

0dae937：安装器记录固定拒绝原因码；未知目录、写权限、空间不足、文件复制中取消用例必须命中各自原因码。
禁止用任意非零退出码替代具体安全门禁通过。仅输出必要原因，不公开整份实例或原始安装日志。

4f23d6f：额外启动测试拥有的非 K-SESSION Node，验证不误拦截、不终止；
卸载后逐文件比较外置合成 instance 内容；Artifact 校验要求全部32项有明确状态，
五个人工/整机断网待验项必须明确 PENDING，不能写 PASS。

## 安装前参数修复与取消测试修复

d62c540 / run35503888709 明确显示权限探针前出现脚本 Runtime error。
官方 GetDateTimeString 签名两个分隔符为 Char；原调用传空字符串。ba0fa92 改为合法字符并增加固定断言。
run35504220459 中未知目录、权限、空间门禁均命中其原因码；取消测试反而安装成功，故整轮失败。
核对官方 is-6_7_3 的 Setup.MainForm.pas：取消需要进度窗口可见且按钮可聚焦；
完全静默模式不满足条件。42be62e 仅将隔离取消夹具用 /SILENT 可见进度运行、一次触发原取消事件，
正式候选没有测试开关，失败夹具不发放。42be62e及774210f实际执行已确认 I21/I22/I23/I24 正确原因码、取消回滚通过。

同提交 ba0fa92 完整回归已保存首次 archive.updatedAt 跨秒失败，确认仅该字段一秒差异后一次重跑成功。
详见独立 TEST-FLAKE 任务，未修复、未删断言。该问题已在本批复现，不能写“本轮未复现”。

42be62e 起设计并执行独立runner整机网卡隔离，是否真正成功以 offline-network.json 和安装专项结果为准；
不再把单独PDF网络探针当成完整离线证明。

## 中文快捷方式与网络阻塞续行

- 42be62e / Setup35504674971、774210f / Setup35505029664：正常安装、完整安装后hash、I04目录分离、I17不创建实例通过；随后快捷方式检查失败。后续启动/核心/卸载/重装没有因此通过。
- 774210f 将快捷方式 COM 目标值以 UTF-8/base64 传输后，实际诊断仍为 desktop/start 空字符串，因此不能把问题归结为仅中文编码。
- 9b5eff077bdf278753a47109a6ba3b3a35dd7e21 使用官方 GetFolderPath DoNotVerify 获取尚不存在目录的路径，并校验解码与绝对路径；修复是否有效以该提交CI为准，不能凭静态推断通过。
- 同时增补“无安装登记、Portable正在运行”独立测试，避免运行中拒绝被已有登记门禁遮盖；卸载运行中也必须命中专用原因码。
- 42be62e 的整机外网隔离实际禁用4个一次性runner网卡、外网探测从可连接变为失败、最终恢复成功，无防火墙修改。但安装专项仍失败，offline整体FAIL，不能声称完整离线核心已通过。
- 774210f 公开 Runtime35505029815、Launcher35505029643、Portable35505029661通过；Setup35505029664失败。失败摘要Artifact10603538273保留。
- 本地9b5eff0推送多次连接重置/443连接失败，GitHub API仍可用。恢复只允许原SHA/原tree/原parent逐一一致的非强制快进；任何不一致都停止，不创建替代历史。
- 9b5eff0、5041030 已通过官方Git数据接口上传原始blob/tree/commit，全部SHA与本地一致，以force=false快进唯一开发分支。9b5eff0远端成功后本地跟踪ref不存在，更新本地跟踪失败已单独修复；不是远端提交失败。
- 5041030 / Setup35506360967 证实两个快捷方式实际存在，安装器记录的位置与系统目录一致，但 WScript.Shell 返回空目标。之前“目录不存在/仅输出编码”的推测不成立。
- 本地E盘合成复现：WScript.Shell 创建名称含U+207A的快捷方式时把“⁺”变“?”；ASCII文件复制为Unicode文件名后，用原生IShellLinkW/IPersistFile读取可正确得到既定notepad.exe目标。只创建隔离测试lnk，不启动notepad，不触及用户桌面。
- ff75923 测试改用原生Unicode读取接口，未改变安装器快捷方式/产品名称。该修复有本地反例证据，但整链仍以新CI为准。

本地检查记录：一次contract命令误在Launcher目录运行，报MODULE_NOT_FOUND；改到仓库根目录后通过。
一次Go静态测试未显式设置缓存/临时目录，使用默认用户缓存/临时路径，属于测试路径约束偏差；没有读取业务数据。
已随后改用E盘显式GOCACHE/GOPATH/TEMP/TMP重跑；正式安装及实例测试始终仅在E盘隔离CI。不得把前一次写成全程E盘。

## 当前人工与环境边界（以最新实测为准）

- CI 使用 GitHub Windows Server runner，不等于 Win10/Win11 实机。
- I01 可见向导、I02 标准用户无 UAC、I03 默认目录、I09 真实浏览器显示：尚待最终原始 Artifact 人工验收。
- I12 整机断外网由最新同commit的 offline-network.json 与安装专项共同判定；单独隔离成功不算核心通过。
- 中文安装路径及模拟中文 LOCALAPPDATA 不等于真实中文 Windows 登录用户名认证。
- 非 x64 拒绝目前为 ArchitecturesAllowed=x64os 编译契约，非 ARM/32-bit 实机结果。
- 未签名；不要求关闭安全防护。Win11 和干净机认证未完成。
- full regression、Portable、Setup 必须以最终受测代码 commit 对齐，不引用 Batch 2B 代替。

## 恢复与验收顺序

正常安装与专项阻塞已在ff75923解决；当前下载原始 Setup Artifact 核验 hash，随后交用户进行 Win10 可见安装验收。
CI离线核心已通过，但不替代Win10人工记录。
结果明确前不创建 Release、PR、tag，不修改 main/v1.0.0，不进入 Batch 4。
