# Batch 4 Win10 人工验收 — 待用户执行

工程自动化与独立QA已通过；最终状态为BLOCKED — AUTOMATION PASS / QA PASS / HUMAN PENDING。下列人工项没有代填PASS。

## 唯一受验Artifact

- [GitHub原始Artifact10907910968](https://github.com/KG718718/spxt-public/actions/runs/36246132535/artifacts/10907910968)
- source c8886e6b6d413c2fd73d6716621d07a80b337e58；run36246132535。
- 包名K-SESSION-setup-win-x64-c8886e6b6d413c2fd73d6716621d07a80b337e58。
- EXE K-SESSION-Setup-1.1.0-beta.2.exe；SHA256 877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6。
- ZIP SHA256 e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6。
- unsigned开发Artifact；GitHub保留至北京时间2026-10-26 21:55:32。后续QA静态修复没有重建或更名本Artifact。

## 十步记录（全部待人工确认）

1. beta.1测试账号和附件仍在，记录本次受验Artifact身份。
2. 停止K⁺-SESSION。
3. 双击beta.2 Setup。
4. 显示升级，不要求卸载beta.1。
5. 显示并沿用原业务数据目录，不重新选择。
6. 无UAC、无CMD。
7. 升级完成并启动。
8. 原账号登录、原附件可用。
9. 停止并卸载，业务目录保留。
10. fresh重装beta.2选择原instance，账号/附件仍在。

请记录Win10实际结果、失败步骤及对应Artifact身份；不得替用户填写通过。I01/I02/I09仍PENDING。本轮不认证Win11/签名/干净机，不进入Batch4.5/main/tag/Release。自动测试只使用合成身份/业务/附件，其通过不替代这些可见界面与实际设备确认。
