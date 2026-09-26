# Batch 4 F3 Artifact 独立核验

状态：**Artifact identity/privacy PASS；B4-QA 首轮 FAIL，CI 门禁返工中。** 本文不把工作流绿色等同于最终 QA 通过。

- 公开仓库：KG718718/spxt-public；候选分支 codex/windows-installer-v1.1。
- 受测来源：`c8886e6b6d413c2fd73d6716621d07a80b337e58`，tree `0f298af80c1cbdf3835f39aca265cbcdb859bea6`。
- F3：[run 36246132535](https://github.com/KG718718/spxt-public/actions/runs/36246132535)，setup job108415569184，11m44s。
- Artifact：[10907910968](https://github.com/KG718718/spxt-public/actions/runs/36246132535/artifacts/10907910968)，名称 `K-SESSION-setup-win-x64-c8886e6b6d413c2fd73d6716621d07a80b337e58`。
- ZIP：32,538,249 bytes；实际SHA256 `e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6`。
- EXE：`K-SESSION-Setup-1.1.0-beta.2.exe`，33,018,840 bytes；实际SHA256 `877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6`。
- Node24.21.0 / Go1.27.1 / Inno6.7.3；unsigned开发Artifact。安装program为1,042 files / 143,784,221 bytes；这不是独立Runtime统计。npm版本、独立Runtime大小/文件数和生产依赖总数本次未单独核实，记N/A。
- program manifest SHA256 `4681b44bb6a70926f0efba7e2f98701bc1cc12981618774cd5345aa1dc993d2c`。
- runtime manifest SHA256 `9cbae719e33456290c5c12d71b27e1fe4db0bc93f4e6b25f771ddf6bc6075671`；Launcher SHA256 `0abe466cf580673e436deb9283dbd551ad1cb4b89f15b4c1cba5b60e66983b89`。

主控通过GitHub API以内存接收完整ZIP，独立重算ZIP及EXE字节哈希，并核对严格12文件allowlist、各报告source和敏感字段禁入；开发机仅保留安全JSON报告，没有保存EXE或发行ZIP。先以HTTP范围读取的六份报告随后与完整已验ZIP逐字节比较相等。网络读取超时/慢速处理不创建新的Hosted run、不扣Hosted预算。

## 原始报告核验

- U01—U30全PASS；U22明确错误manifest hash在旧program替换前拒绝，故障后完整owned state及business instance byte-identical。
- I01/I02/I09仍PENDING；其余29个I项与D01—D13 PASS。Win10人工未执行。
- 公开回归26 suites / 742 checks / fail0 / skip0，source精确一致。
- Portable staging/extracted均PASS；F3同一构建链包含Runtime、Launcher、Portable和Setup，包内各manifest/Launcher哈希身份一致。
- offline status PASS，externalBefore=true、externalDuring=false、restored=true、firewallChanged=false。
- Artifact隐私与固定内容白名单PASS；不包含真实业务数据、账户凭据、原始安装日志或身份bundle。

## 必须保留的反证

F3 historical-identity job108415569036在2026-09-26T13:44:18Z真实记录70 tests /69 pass /1 fail，失败为旧workflow条件断言；后续命令成功掩盖前序非零，使job/run仍显示success。该缺陷由独立QA确认，首次报告commit36fbb7b7ac54db0c08cca9f0855fbc0583d18fa5已保留。它不推翻上述实际生命周期/Artifact数据，但阻断整体QA PASS。

原T4正在严格限定的CI/静态测试范围修复，产品、构建、payload、身份与生命周期代码冻结。独立QA同意：只有证明Artifact影响输入逐字节不变并通过专用QA Hosted首失败停止反例及正例，才可保留本F3 Artifact并完成后续QA；不得用QA额度重跑Full或伪称该Artifact来自后续修复commit。

