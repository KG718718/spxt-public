# B4-T1A Result — Historical beta.1 identity evidence capability

状态：**PASS（仅本地取证能力候选）**。尚未由主控整合、push 或触发 GitHub Actions；未下载历史 Artifact、未实际安装 beta.1、未取得历史 identity anchors，不能据此放行 T3 或报告 Batch 4 PASS。

## 已完成

- 新增独立 `workflow_dispatch`：固定公开仓库、开发分支、Run 35514357007、Artifact 10606870944、artifact 名称/大小/digest、attempt 1、成功状态、head SHA、未过期状态及固定 API 下载 URL；权限仅 `contents: read`、`actions: read`。
- 下载、解包和安装只在 GitHub 托管 Windows runner 的合成 E 盘工作目录；严格定位唯一 `K-SESSION-Setup-1.1.0-beta.1.exe`，固定 32,988,254 bytes 和 SHA256 `49d28d4dbd131b0dd0890e44aea358d75a8406803ff10df808f073d5c2a72af8`。
- 使用 beta.1 已有静默参数安装到隔离 program/instance 路径；不启动业务服务、不创建账号/业务/附件、不发邮件。安装前拒绝既有登记、binding 或同名快捷方式。
- 从真实安装根的 `uninstall/installer-manifest.json`、`uninstall/build-info.json`、`program/manifest/runtime-manifest.json` 和 `program/K-SESSION.exe` 提取五个精确锚；不会读取 Artifact 外层 `build-info.json` 代替安装内身份。
- PowerShell 显式查询 HKCU 64/32 两视图，生成仅供私有临时调用的最小 snapshot；要求唯一登记和唯一 binding 且同 view，再调用现有 T1 `validate(snapshot, historical policy)`。缺失、冲突或多 view 均停止。
- 输出 profile 直接兼容后续 beta.2 identity bundle 的 `{id,sources,policy}` 输入。最终 evidence 为封闭 schema，仅含公开 ID、版本、固定键名、hash、计数和 PASS 结论；不含本地路径、用户名、环境变量、token、密码、registry 值或业务/附件正文。
- 卸载后验证 program、卸载登记和两个快捷方式清除，同时验证 beta.1 按产品契约保留 binding/instance；随后测试夹具仅删除自身精确 binding/instance 和下载/Setup/安装临时内容。预检发现的既有目录、输出或快捷方式不归任务所有，finally 不删除。
- workflow 只在成功时上传小型 `historical-identity-evidence.json`，保留 30 天；不上传 Artifact ZIP、Setup、安装目录、日志或 snapshot。Job Summary 仅写非敏感 ID/hash/结论。

## 本地验证

首次专项运行：12 项中 11 PASS、1 FAIL。失败为 evidence 严格 schema 反例向外透出 T1 `Rejection` 类型；已仅在新模块边界转换为稳定 `HistoricalIdentityError`，未修改 T1 或测试断言。

最终本地结果：

- historical-identity 专项：12 PASS，0 FAIL，0 SKIP。
- 既有 T1 upgrade-detection：43 PASS，0 FAIL，0 SKIP。
- 既有 T2 upgrade-preflight：19 PASS，0 FAIL，1 SKIP；SKIP 为当前开发机无 Windows file-symlink 创建权限，junction/深层链接反例仍通过，必须由 hosted Windows workflow 补实测。
- installer contract：`INSTALLER CONTRACT PASS`、`R2 DATA LOCATION CONTRACT PASS`。
- Node 三文件语法检查、PowerShell AST parse、workflow 静态权限/上传范围检查及 `git diff --check`：PASS。

## 未验证与风险

- 本任务未在开发机下载 Artifact 或保存发行包，亦未运行云端 workflow；历史 profile 中五个 hash 目前仍未知。只有主控整合并 push 后的实际 workflow 成功 JSON 才能固化这些锚。
- [Microsoft WOW64 registry 文档](https://learn.microsoft.com/en-us/windows/win32/winprog64/shared-registry-keys)说明共享键可把同一物理副本映射到两个逻辑视图；已批准 T1 契约要求 snapshot 中唯一 view，本实现不擅自把两个结果去重。若 hosted runner 实测同时返回两份，workflow 将 `BLOCKED`，需主控依据原始非敏感计数判断是否退回 T1/上报决策，不能放宽为 commit/tree。
- GitHub Artifact API 若 digest/大小/attempt/expiry 等任一固定元数据变化、Artifact 已过期、下载 ZIP digest 或 Setup hash 不符、真实安装参数失败、安装内锚冲突、T1 单 policy 不通过或清理不完整，均 fail closed；不产出成功 evidence。
- 两代 Setup 仍为 unsigned development artifact。本任务只证明相对固定公开 Artifact 和 beta.2 未来内置锚的一致性，不提供发布者签名保证。

## 主控后续

Review 本任务 local commit 后再整合到开发分支并手动触发 `Setup B4 historical identity evidence`。必须审查实际 Actions JSON、Run ID、Artifact ID、五个安装后 anchors、T1 PASS 和 cleanup PASS；云端失败则按稳定 BLOCKED 结论处理。本任务不接续 T3/T4。
