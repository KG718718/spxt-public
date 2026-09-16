# Batch 1C-R5 — 迁移前基线

2026-09-16；只针对公开仓库 KG718718/spxt-public。R4 报告检查点 `f7dc4745b16e30b39d6e5401390d11098e84f555` 已普通提交并仅推 codex/windows-installer-v1.1；push 成功回执后 Git 查询遇到超时/空回复，GitHub 官方 ref API 回查同 SHA。没有强推、main/tag/Release 操作。

## 冻结文件（Git blob SHA256，不混淆 Windows 换行）

| 文件 | SHA256 |
| --- | --- |
| package.json | ed2b5d3bf20450c301ae531395fe5bb95c8de07df7f181f254d47843fe928bde |
| package-lock.json | c4050d95db6d40702a222ee9da9e43d74c5d36a8e5be73583e1dc2f08d9a5bf5 |
| server.js | 11938893209c4d4b701cc0a7fc9893db8e5b342945b41b1650a9def6528568d3 |

R5 从此 commit 取上述原始字节，在 E 盘源码外全新 baseline/ 中执行锁定 Node24.21.0/npm11.19.0 的 `npm ci --omit=dev --include=optional --ignore-scripts --bin-links=false`，独立缓存/空 npm 配置。实际23生产包、1,131文件、98,604,168字节；没有复用旧 Runtime 的 node_modules。

原依赖：根 pdf-parse2.4.5 必需依赖 canvas0.1.80 和 PDF.js5.4.296；根 PDF.js5.4.296 另有 optional canvas。Windows x64 实装原生文件 `@napi-rs/canvas-win32-x64-msvc/skia.win32-x64-msvc.node`，26,272,256字节，SHA256 `30646342fc284109aa9542155287d37147c97132d5168cf621f851a9c69e0c99`。

再次搜索公开源码：业务没有 pdf-parse/PDFParse 调用；只有 modules.cjs 与 host-smoke.cjs 的旧测试调用。server 仍为 legacy PDF.js 文本提取。本轮将替换这些测试为真实业务函数/HTTP 路径，不删除覆盖来制造通过。

原始机器证据位于源码外 `output/windows-installer-v1.1/batch-1c/migration-r5-01/baseline.json`，包含完整文件哈希清单、生产锁记录、工作区换行字节哈希。此处只记迁移前事实，不宣称迁移完成。
