# Batch 00 — 公开版基线冻结

核验日期：2026-09-16。仅查询公开 GitHub 仓库、公开发行资产及既有公开源码副本；没有检查其他用途版本。

## 身份核验结果

| 项目 | 用户指定基线 | 重新只读核验结果 |
| --- | --- | --- |
| 仓库 | KG718718/spxt-public | 一致，公开仓库，默认分支 main |
| main commit | 84cbb324a4f63bef094d2c21d70eba841205a7a7 | 一致：GitHub commits API 与 git ls-remote |
| tag | v1.0.0 | 直接指向 commit 84cbb324a4f63bef094d2c21d70eba841205a7a7 |
| 最新正式 Release | K⁺-SESSION 1.0.0 | 一致；tag v1.0.0；非草稿、非预发布 |
| 普通用户安装资产 | K-SESSION-online-setup.zip | 一致；342209 字节 |
| 安装 ZIP SHA256 | c5c7e55e7c4182a3fa98e817ae7e967328bdc67bd14f7e13f4da1a3d8d1d98b0 | 一致；GitHub digest 与本轮独立读取下载流计算的 SHA256 均匹配 |

任意身份不一致即停止、不创建开发轨道；本轮所有指定项匹配后才建立分支。

## 可复核的公开来源

- [仓库](https://github.com/KG718718/spxt-public)
- [基线提交](https://github.com/KG718718/spxt-public/commit/84cbb324a4f63bef094d2c21d70eba841205a7a7)
- [v1.0.0 Release](https://github.com/KG718718/spxt-public/releases/tag/v1.0.0)
- [历史在线安装 ZIP](https://github.com/KG718718/spxt-public/releases/download/v1.0.0/K-SESSION-online-setup.zip)

Release ID：387424742；发布时间：2026-09-12T02:14:36Z；target_commitish：84cbb324a4f63bef094d2c21d70eba841205a7a7。

## 已发行资产快照

| 资产 | ID | 字节数 | SHA256 |
| --- | --- | ---: | --- |
| INSTALLATION.md | 558431154 | 7348 | 41c6df2bb469712e7b56ac137bfbc21ecbcaa89932b67a365076f850d4e9b9c9 |
| K-SESSION-online-setup.zip | 558432120 | 342209 | c5c7e55e7c4182a3fa98e817ae7e967328bdc67bd14f7e13f4da1a3d8d1d98b0 |
| PACKAGE-MANIFEST.json | 558432166 | 6904 | d4760749c4c4851a042312f1939810a462937eb866e50c32a3da0419f33cc568 |
| SHA256SUMS.txt | 558432235 | 345 | 86547ccf4b95184f2cc1ec764ad5b13440ba2fcf8bf1de59b132050afda78fbc |
| VALIDATION.json | 558432215 | 1977 | 2a3aa82dfd83622d2129db05cc7b2cf05c196af835384fae0fafab1bff318ea0 |

除 ZIP 另行以实际下载流核验外，上表其余哈希取自本轮 GitHub Release assets digest。只读核验未替换或重新生成任何资产。

## 冻结与新轨道

v1.0.0 定义为历史在线安装版。禁止修改或删除 tag/Release、替换或覆盖资产、使用同名发行物覆盖、重写历史、force push。冻结是本轨道执行约束，不代表本轮已经修改 GitHub 仓库保护或服务器不可变设置。

新分支：codex/windows-installer-v1.1。
起点：公开 main 84cbb324a4f63bef094d2c21d70eba841205a7a7。

Batch 0 不修复旧 Install.cmd，不修改任何业务源码，不打包，不测试兼容性，不创建新 Release，不合并 main。原版本运行方式不因这些规划文档而改变。

最终执行回单 BATCH-00-RESULT.md 单独交付，记录提交完成后的完整 HEAD、差异、推送与工作区状态；不把本机审计临时产物加入公开分支。
