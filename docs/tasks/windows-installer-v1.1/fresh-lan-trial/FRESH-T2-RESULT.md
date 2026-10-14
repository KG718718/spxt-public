# FRESH-T2 — 执行现场

日期：2026-10-14。状态：IN_PROGRESS；不是正式 RETURN，不具备 Hosted 准入。

公开工作树 bea7，任务分支 codex/fresh-t2-installer-ci，基线 0eee621；origin 为 KG718718/spxt-public。无 push、Hosted、真实本机安装、生产 EXE 执行、Registry/Firewall/网络配置修改。未创建 trigger 文件或 trigger 提交。未访问内部 SPXT，旧工作树/FAIL 未修改。

已实施草稿：FreshTrial 编译模式与 fresh-only 只读拒绝；标准 ISS 去除新增 FreshTrial 条件后与原基线相同（仅 CRLF 规范化）；原 38 项 Runtime 闭包保留，清单前精确一次 marker 派生与 Launcher/helper 两个 linker fresh 标记；原 13/28 与新增 tagged 2/2 分别运行。独立安装态 Go overlay、实际安装 payload 两浏览器 contexts 驱动、受控隔离 socket、独立规则门禁、严格报告/Setup 调用诊断/Artifact verifier、单一路径 push 预算与 QA immutable EXE 契约。

本地目前 Node 92/92 fail0skip0。早期安装态 Windows Go overlay 已仅编译 PASS；后续修改须重新编译。CJS/PS parse/diff-check 已局部通过；完整最终验证待续。没有本机已受验 ISCC，真实 ISCC 编译 NOT_RUN，只能静态检查，留给已批准 Candidate BUILD，不能宣称编译通过。

仍在完成：完整 Hosted 执行/汇总入口；已证明 owned 安装登记/快捷方式/工具链收尾；SUBST always 所有权核验与撤销、physical Artifact 转存；early/failure JSON 严格验证。任何未知所有权/残留必须 FAIL，并按 STOP5 交 Master，不允许自动挪预算。T1 已审依赖将仅按 Master 指定五笔 cherry-pick；本 WIP 与 T1 依赖提交须单列，Master 不重复整合 T1。

真实 GUI/UAC、物理 Private adapter、Firewall 必要授权、双物理设备、实际 Windows 登录与第二 Launcher GUI 均 HUMAN_PENDING。Installed Loopback 使用 --logon 抑制未知默认浏览器；实际 OS 登录未测试。端口/binding 持久化用明确 enabled=false 的合成绑定状态，不能冒充物理 LAN 授权或开启。隔离 socket 来自 installed request gate + synthetic discovery state，不能冒充生产物理信任。旧升级/卸载重装/LC01/U27 result FAIL、workStatus DEFERRED 保留。
