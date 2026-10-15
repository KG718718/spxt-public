# FAST DELIVERY V1 — P0 LOCAL BUILD PASS

2026-10-15。原 FRESH-T2 正式 P0 回单，随后继续同一 Thread 完成 Candidate/QA 接线；未 push/trigger/Hosted，未实际安装或运行产品 EXE、未变更网卡/Firewall/Registry。历史 FAIL 保留。本回单仅证明构建，不是安装/业务/LAN验收通过。

- 实际 clean 受测源码 `2f40a30ddfc0d60e3d40f662181d68c6ea1ddf93`；sourceTree `66170985e806e4c26c3c32710204da9fb36134cd`；codeFingerprint `d3378589a6970b42c3dbbab8f829e85d89067fd58a86e587a27acd1420c88c61`。
- 真实 Setup：`E:\CodexWorkspace\outputs\fresh-fast-p0-job-e19df66959b14c038bab00be9a30ad42\setup\artifact\K-SESSION-Fresh-Trial-1.1.0-beta.4.exe`，33,553,023 bytes，SHA256 `acee90c0c98fa6111f6b6f21e38bd2b723b5fa61949b0625856a3d850d493456`。
- 同目录 `build-info.json`、`installer-manifest.json`、EXE 与 SHA256 文件的来源/字节/hash已交叉复核。programManifestHash `3ada0ae56ddfb8071170ad36507500d7142ba2054cc86103568a649fe6e55b64`。Runtime/Helper/Launcher/payload 同源；完整 payload 1049 文件、20 依赖，包身份重新 verify PASS。
- 固定 Node24.21.0、Go1.27.1；Inno6.7.3 原固定 hash `9c73c3bae7ed48d44112a0f48e66742c00090bdb5bef71d9d3c056c66e97b732` 与 Valid/Pyrsys B.V. 签名已核实，使用上游 portable 模式准备工具，不伪造 Hosted 环境。
- 实际原 Helper13/Fresh2（全12）/故障反例4、Launcher28/Fresh2、重复单位13/28、Node44 均通过、fail0/skip0。保留20秒，Fresh 改为短 stdin loader+显式UTF8+owned profile；MISSING_MOCK 必须真实26/固定 guard-only trace，启动/超时/其他码不能作成功拒绝。此为本地证明，R3历史内部首因仍 UNKNOWN。
- 实际 Job 在 worker gate 前 Assign；构建及后代自然退出0、stderr空、Job empty=true、forcedTermination=false、外层环境恢复true。owned 构建目录和产物保留，不把 memory helper 的 DescendantsEmpty=UNKNOWN 直接当成功。
- raw stdout/stderr 仅内存解析；当前 owned 输出树扫描到的受禁 raw 文件数量0（含 npm _logs、Go JSON/TAP、compiler stdout/stderr 等固定名称）。只写固定安全报告、模拟事件/token、来源/manifest/hash等构建产物。
- 安全原始 P0 报告副本：`FAST-P0-LOCAL-PROOF.json`，SHA256 `84d59e1fb147f4c000e766d1e1b9866a0049498f6f60b0ca73545793bd19b32d`。同一 owned 根的 `p0-result.json`、`worker-state.json`、`build-diagnostic.json`、`portable/artifact/fresh-payload-report.json` 可复核。

实际命令为 `pwsh -NoProfile -File tools/windows-installer/fresh-trial/local-p0.ps1 -Root <上述新owned根> -Node <hash固定Node24.21 node.exe> -GoRoot <已核验公开审计Go1.27.1根> -Compiler <固定hash工具的inno/compiler>`。内部真实调用 build-payload.ps1，再 fresh-trial/build.cjs→ISCC；没有仅生成空壳或跳过原构建门禁。

普通失败保留：首轮 Runtime 工具 CRLF 与精确 Git blob 不同；第二轮异步 VoidTaskResult 混入函数结果；f526c637轮 Go UTF8中文 GOROOT 被 CP936 管道误解导致LICENSE复制失败（已最小双路径反例证明并修复）。f526c637固定失败报告仍在原目录，Job empty/环境恢复均true，未强杀。以上不改写 R1/R3历史 FAIL。

实现提交47e72505、d9e6b316（旧R3路径恢复历史、不再完善）、f526c637、2f40a30d；本文件与安全报告另作报告提交。Master 已指出根层 Fresh 测试131项仍有5失败，尚待精确安全ID及等价内存接线闭合；Candidate新授权契约、完整26/742无raw路径与独立QA同一EXE仍在准备。因此不声明可触发Hosted。生产Go/业务/安装安全模型未改；如后续构建代码变化，须对应新source/指纹再完成真实本地构建和Master独立Review。
