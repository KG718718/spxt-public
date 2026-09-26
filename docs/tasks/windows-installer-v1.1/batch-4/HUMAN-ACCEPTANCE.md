# Batch 4 Win10 人工验收 — 用户报告全部 PASS

2026-09-27用户明确确认 Win10 x64 Beta Upgrade Track 人工第1—10步全部 PASS。记录依据为本次用户反馈；主控未声称亲自操作设备。最终状态：Batch 4 PASS — Windows 10 x64 Beta Upgrade Track。

## 唯一受验Artifact

- [GitHub原始Artifact10907910968](https://github.com/KG718718/spxt-public/actions/runs/36246132535/artifacts/10907910968)
- source c8886e6b6d413c2fd73d6716621d07a80b337e58；run36246132535。
- 包名K-SESSION-setup-win-x64-c8886e6b6d413c2fd73d6716621d07a80b337e58。
- EXE K-SESSION-Setup-1.1.0-beta.2.exe；SHA256 877383fe14bf089eb0a4e130641a957062c07ab258d22d59895c46f9b3f671b6。
- ZIP SHA256 e6b01fe7c4499526eb99a837892a0c0641ad2232c84981b191b2ac6f7c18f3c6。
- unsigned开发Artifact；GitHub保留至北京时间2026-10-26 21:55:32。后续QA静态修复没有重建或更名本Artifact。

## 十步记录（用户逐项确认 PASS）

1. **PASS（用户报告）** — beta.1测试账号和附件仍在，记录本次受验Artifact身份。
2. **PASS（用户报告）** — 停止K⁺-SESSION。
3. **PASS（用户报告）** — 双击beta.2 Setup。
4. **PASS（用户报告）** — 显示升级，不要求卸载beta.1。
5. **PASS（用户报告）** — 显示并沿用原业务数据目录，不重新选择。
6. **PASS（用户报告）** — 无UAC、无CMD。
7. **PASS（用户报告）** — 升级完成并启动。
8. **PASS（用户报告）** — 原账号登录、原附件可用。
9. **PASS（用户报告）** — 停止并卸载，业务目录保留。
10. **PASS（用户报告）** — fresh重装beta.2选择原instance，账号/附件仍在。

I01/I02/I09根据用户本次实机验收闭合；原始Artifact内PENDING字段作为历史保持不变。不扩大到Win11/签名/干净机认证。用户另已授权Batch4.5；main/tag/Release仍禁止。
