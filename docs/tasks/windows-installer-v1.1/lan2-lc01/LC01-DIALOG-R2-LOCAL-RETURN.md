# LC01-DIALOG-R2 LOCAL RETURN

**状态：LOCAL RETURN — MASTER REVIEW PENDING**

## 本地提交

- 严格策略提交：`887ff66`（`test: define strict LC01 dialog control policy`）
- 实现与门禁提交：`553d082`（`test: harden LC01 dialog adapter diagnostics`）
- Master 预审修正提交：`77758f2`（`test: preserve LC01 dialog failure provenance`）
- 分支：`codex/lan2-lc01-launcher-lifecycle`
- Master 基线：`0e077658317ec5b0f1a21173dbe425412610d55a`

## 已确认事实

1. 历史 Run `38362515475` 固定为 `DIALOG_MISMATCH`；F3 身份通过。现有历史报告没有逐字段值，具体失败字段和根因仍为 `UNKNOWN`。
2. 本轮仅修改 LC01 研究/策略、Windows 测试 adapter、Hosted 测试生成器、报告校验及其测试；生产 Launcher 与 `.github` workflow 无差异。
3. R2 对 MessageBox 子控件使用完整 style 白名单，不使用 `SS_TYPEMASK` 或 `BS_TYPEMASK`：
   - 正文 Static：`0x50000000`、`0x50020000`、`0x50000080`、`0x50020080`；ID 仅允许 `-1` 或 `65535`。
   - 图标 Static：`0x50000003`、`0x50020003`；ID 必须为 `20`。这是本测试边界内的受控契约，不是对 Windows 的一般保证。
   - OK Button：`0x50010000`、`0x50010001`、`0x50030000`、`0x50030001`；ID 必须为 `1`。
4. 图标语义要求 `STM_GETICON` 与 `STM_GETIMAGE(IMAGE_ICON)` 两次调用均成功、返回非零且句柄相同；不调用 `GetIconInfo`，不引入 GDI 资源。
5. adapter 在内存中保存并按 HWND 排序完整原始快照：HWND、class、完整 style、ID、parent、PID、text、icon handles、visible/enabled 与各 API 观测标志。原始值不得输出、哈希或进入报告。
6. `GetWindowLongPtrW` 返回零时，因为全部允许 style 都非零，固定判为 API 未证明；不依赖跨 OS thread 的 LastError。`GetDlgCtrlID` 或 `GetParent` 返回零同样固定为 API 未证明；非零但错误才是已观测不匹配。
7. `EnumChildWindows` 的返回值不用于成功判定；仅依据 callback 失败、边界超限和非空枚举判断。全局顶层枚举忽略无关窗口的 PID 查询失败、其他 PID 窗口和目标进程隐藏辅助窗口；严格约束只施加于选中的可见目标模态窗及其全部子控件。
8. 首次识别与确认前复核各自保存独立诊断。确认后清理或后续扫描不能覆盖先前失败。复核使用完整原始快照比较，任一字段或观测标志变化都拒绝确认。
9. 报告升级为 schema 3，诊断为固定 key、JSON boolean、`Observed`/`Match` 与 one-hot 状态；schema 1/2 保持原有解释。Publisher 对合法 FAIL 保留诊断，对非法诊断将 lifecycle 置空并保留已验证 identity。
10. Master 预审指出的两项真实接线缺陷已经闭合：成功复核先补齐 `structureMatch` 并原子形成 `DIALOG_MATCH` 后才发送唯一 IDOK；首次成功快照保持可替换，确认后的首次真实 API/控件异常会覆盖并冻结，而预期的弹窗消失、第二进程正常退出和后续清理不会覆盖成功证明或已冻结失败。

## 基于证据的推测

R1 的最强假设仍是图标 Static 与正文 Static 被旧文本折叠逻辑混计；本轮严格分类可以消除这类歧义，但没有新的真实 Windows 控件树证据，不能据此把该假设升级为历史失败根因。

## 固定安全失败样例摘录

以下只是安全摘录；实际 schema 3 报告必须包含全部精确 boolean key，完整性由 Publisher 测试验证。

```json
{
  "schema": 3,
  "status": "FAIL",
  "stage": "LC01_LIFECYCLE",
  "reason": "LIFECYCLE_FAILED",
  "identity": { "status": "PASS" },
  "lifecycle": {
    "status": "FAIL",
    "stage": "SECOND",
    "second": {
      "Status": "FAIL",
      "Path": "DIALOG_MISMATCH",
      "BusyClosed": false,
      "NaturalExit": false,
      "CleanupTerminated": true,
      "HandlesClosed": true,
      "ExitCode": 259,
      "DialogReason": "UNKNOWN_STATIC_STYLE",
      "DialogFirst": {
        "schemaLC01DialogR2": true,
        "reached": true,
        "stageEnumChildren": true,
        "classificationUnknown": true,
        "controlSetMatchObserved": true,
        "controlSetMatchMatch": false,
        "bodyStyleMatchObserved": false,
        "bodyStyleMatchMatch": false
      },
      "DialogRecheck": { "stageNotReached": true }
    }
  }
}
```

## 本地验证

- 固定 Go 1.27.1，`GOTOOLCHAIN=local`、`GOPROXY=off`、`GOSUMDB=off`：`go test -count=1 -tags lc01dialogresearch .` 顶层 52/52 PASS。
- Node：`lc01-hosted.test.cjs` 与 `second-launcher.test.cjs` 合计 25/25 PASS，fail 0、skip 0。
- 两条真实生成器路径生成 Windows amd64 overlay 后均离线编译 PASS：LC01 Hosted harness 与 beta2-to-beta4 upgrade harness。
- 新增反例覆盖成功复核到 IDOK 的完整 MATCH 收敛、IDOK 后首次异常冻结、预期退出/清理不覆盖失败，以及 Publisher 对复核失败和确认后失败从同一诊断源保留。
- 源 `lc01-hosted.ps1` 和生成的 `invoke-lc01.ps1` 均经 PowerShell parser 验证 PASS；相关 CJS 均经 `node --check` PASS。
- `git diff --check` PASS；生产 Launcher diff 为空；`.github` diff 为空。

## 参考依据

- [Static Control Styles](https://learn.microsoft.com/en-us/windows/win32/controls/static-control-styles)
- [GetWindowLongPtrW](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindowlongptrw)
- [STM_GETICON](https://learn.microsoft.com/en-us/windows/win32/controls/stm-geticon)
- [STM_GETIMAGE](https://learn.microsoft.com/en-us/windows/win32/controls/stm-getimage)
- [EnumChildWindows](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumchildwindows)
- [WM_GETTEXT](https://learn.microsoft.com/en-us/windows/win32/winmsg/wm-gettext)

## 边界

本轮没有运行真实 Windows probe、F3、Launcher、安装/解包、VM、网络、Actions、Hosted、Full 或 QA；没有推送、同步、合并或清理。Hosted 预算仍冻结。R2 只是待 Master 独立 Review 的本地测试/诊断实现，不构成 Hosted PASS、产品缺陷定论或 beta.4 最终包。
