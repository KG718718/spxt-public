# LC01-DIALOG-R1 源码评审、合成反例与诊断设计

## 结论

当前只能确认：Run `38362515475` 在首次对话框精确识别时得到 `DIALOG_MISMATCH`。`BusyClosed=false` 表明 `Confirm` 未成功执行，因此不是关闭后再次发现同一窗口的分支。现有报告没有逐字段观测，不能恢复具体哪个字段不匹配，也不能把故障归因为产品、Hosted 桌面或某个 Win32 控件。

源码静态核对排除了一个直接假设：受验 F3 的 `product`、`INSTANCE_BUSY` 消息、错误编号拼接格式，与当前 `lcProductTitle`、`lcBusyText` 逐字一致。当前 policy/Windows adapter 也与受验 source `95a03c484d` 及 Master baseline `e2a5d10e496` 相同，无需同步或修改既有验收策略。

最强的待证假设是 adapter 对 MessageBox 子控件的折叠规则过强：它把每个“class 为 `Static` 且 `WM_GETTEXT` 缓冲区非空”的控件都计入 `TextCount`，并以最后一次枚举结果覆盖 `d.Text`；policy 又要求 `TextCount==1`。F3 使用 `MB_ICONERROR`。微软文档说明非文字 Static 通常不返回字符串，但 `SS_ICON` 存在把图标句柄写入缓冲区前四字节的特殊语义。若实际 MessageBox 图标 Static 被当前 UTF-16 转换判为非空，adapter 会得到两个文本 Static，且 `d.Text` 还受枚举顺序影响。该路径已能用纯合成反例稳定复现，但没有真实 Windows 观测，故仍是基于证据的假设，不是根因结论。

同一失败路径仍可能由创建时间、标题、正文、正文计数、Button 句柄/class/ID/数量、Button 所属进程/父窗口或聚合可见/启用状态不匹配导致。旧报告不足以区分这些字段。`WM_GETTEXT` 读取失败、子窗口枚举失败、多顶层窗口或非 `#32770` 顶层窗口按现代码会进入 `WINDOW_IDENTITY_FAILED`，不是这次 `DIALOG_MISMATCH` 的直接候选。

## 已确认的现行验收语义

首次识别必须同时满足 PID、原进程句柄对应的创建时间、进程映像、存活、顶层 HWND、`#32770` class、精确标题、精确正文、唯一正文计数、唯一 Button、Button class、IDOK=`1`、Button 所属 PID、直接父窗口、可见和启用。确认前还会立即重读并要求完整 `lcDialog` 结构逐字段相同，然后才异步发送 `WM_COMMAND/IDOK`。

`ThreadOK` 的实际含义只是 `GetWindowThreadProcessId` 返回非零线程 ID 且 PID 非零；它没有证明该窗口属于第二 Launcher 的初始主线程。`ButtonOwnerOK` 是子控件所属进程核对；`ParentOK` 是 Button 直接父窗口核对。F3 的 MessageBox 使用 `hWnd=0`，因此顶层对话框无 owner window 是产品现状，不能新增“必须由第一 Launcher 拥有”的条件。

`PostMessageW` 成功只证明消息进入异步队列，不能证明按钮已处理或进程已自然退出。现有 policy 后续仍要求第二 Launcher 自然退出且退出码为 `1`；强制 cleanup 不能计 PASS。

## 本地合成反例

研究测试由显式 build tag `lc01dialogresearch` 隔离，不进入普通 suite 或 beta4 overlay。它固定验证：

- 图标 Static 文本为空时，正文、图标和 Button 的合成枚举顺序不影响现有精确识别。
- 图标 Static 被模型化为非空时，两种顺序均产生 `TextCount==2` 并 fail closed；最后保存的 `d.Text` 会随顺序改变。
- 额外非空 Static、重复 Button、错误 ID/父窗口/所属进程、隐藏或禁用 Button 均拒绝。
- 确认前 PID、创建时间、HWND、线程查询、映像、存活、标题、正文、计数、Button identity 任一变化均拒绝。
- confirmed-window 跳过只适用于相同 HWND 且仍然精确匹配；同 HWND 状态变化或新 HWND 不会被跳过。
- 诊断记录仅允许固定字段、固定 stage 和固定分类；缺字段、未知字段或无法观察都归 `UNKNOWN`，未到达必须显式为 `NOT_REACHED`，不能默认成 `false` 或推断为 PASS。

这些测试只证明规则及反例，不证明 Hosted 上的实际控件结构。

## 若未来获批，真实 Windows 最小观察设计

在运行第二 Launcher 前固定已受验的进程句柄、PID、创建时间和映像。公开观察载荷必须只包含固定 key 和 JSON boolean value，不包含字符串、`null`、数字、数组、对象，也不记录标题、正文、路径、PID、HWND、句柄值、窗口树、网络身份或其哈希/长度。

固定公共字段如下：

- schema：`schemaLC01DialogR1`
- 到达状态：`reached`
- stage one-hot：`stageEnumToplevel`、`stageReadDialog`、`stageEnumChildren`、`stageRecheck`、`stagePostIDOK`、`stageWaitExit`
- classification one-hot：`classificationMatch`、`classificationMismatch`、`classificationUnknown`、`classificationNotReached`
- 每项条件各两个布尔：`<condition>Observed` 与 `<condition>Match`
- 条件名固定为 `dialogPresent`、`dialogHandlePresent`、`threadQueryOK`、`ownerPIDMatch`、`creationMatch`、`imageMatch`、`liveMatch`、`classMatch`、`titleMatch`、`textMatch`、`buttonHandlePresent`、`buttonIDMatch`、`buttonClassMatch`、`buttonOwnerMatch`、`buttonParentMatch`、`visibleMatch`、`enabledMatch`、`textCountMatch`、`buttonCountMatch`
- 分支信息同样使用两个布尔：`dialogAlreadyConfirmedObserved` 与 `dialogAlreadyConfirmedMatch`

内部研究模型可以用 `*bool` 表示三态，但不得直接输出。未知条件公开为 `Observed=false`、`Match=false`；后者不得解释为不匹配。MATCH 要求全部必需条件 `Observed=true` 且 `Match=true`；MISMATCH 要求全部必需条件已观察且至少一个 `Match=false`；有任何未观察、API 失败、超限或竞态只能是 UNKNOWN；未到达只能是 NOT_REACHED、`reached=false` 且全部 `Observed=false`。stage 和 classification 分别必须恰好一个 one-hot 为 true。`dialogAlreadyConfirmed` 只记录 policy 分支状态，不参与控件匹配判定。缺 key、额外 key、非 boolean、one-hot 矛盾、`Match=true/Observed=false` 或分类与证据矛盾都必须拒绝。

观察实现应内部读取但不输出：顶层窗口 class/可见性、所属 PID、创建时间、映像；每个子控件的 class、style/`SS_TYPEMASK`、control ID、直接父窗口、所属进程、`WM_GETTEXT` 返回长度、可见/启用；正文 Static 和图标 Static 的数量；立即重读前后是否完全相同。子控件必须按无序集合分类，不能依赖 `EnumChildWindows` 顺序。

在精确身份和控件语义未全部证明前不得发送消息。即使 `POST_IDOK` 成功，也必须继续区分消息已投递、自然退出、退出码及 cleanup；只有自然退出可闭合该门禁。本任务只定义并合成验证公共 schema，没有批准实施或运行实际 collector。

## 最小修改建议（未实施）

先实施上述白名单诊断并取得一次获批的真实 Windows 观察，再决定是否改验收。若观察证实图标 Static 被误计，最小修正方向是按无序集合识别“恰好一个正文与 `lcBusyText` 完全相同的 Static”，并用已观察且稳定的 class/style/ID 规则单独识别预期图标；任何额外文字 Static、未知 style、重复正文或读取失败仍 fail closed。不能简单取消 `TextCount`、忽略额外 Static、使用子串、依赖枚举顺序或把 `DIALOG_MISMATCH` 当成成功。

没有对话框、第二 Launcher 自然 exit0 且全部会话/锁/无第二后台门禁通过，是既有 DISPATCH_SUCCESS 路径，无须新产品契约。没有对话框却 exit1 或其他非零退出，不能当作 INSTANCE_BUSY_REJECTED；不能将超时、强制终止或缺少必要拒绝证明改判为 PASS。

## Hosted 与人工验证边界

GitHub Windows runner 是否提供稳定的交互桌面、MessageBox 控件树是否受 Server 版本、主题、DPI 或系统实现影响，当前未证。F3 的标题和正文由程序显式提供，系统控件结构仍可能变化。ownerless MessageBox 能否在该会话稳定出现也需真实观测。一次 Hosted 结果不能替代物理 Win10 可见桌面验证。

未来人工验证至少需要在物理 Win10 可见桌面保持第一 Launcher 和私有 Node 运行，手工启动第二 Launcher，区分无弹窗正常派发与忙碌拒绝。若出现 INSTANCE_BUSY 模态窗，再核对内容与按钮行为，点击 OK；两条路线都需确认第二 Launcher 自然退出、第一 Launcher 继续运行、没有第二后台、业务数据不变。不得为了验收强行要求正常派发也显示错误弹窗。双设备 LAN、真实防火墙授权和跨设备行为继续单独保持 HUMAN PENDING。

## 引用

- Microsoft [`MessageBoxW`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-messageboxw)：`MB_ICONERROR` 与 `IDOK=1`。
- Microsoft [`WM_GETTEXT`](https://learn.microsoft.com/en-us/windows/win32/winmsg/wm-gettext)：非文字 Static 与 `SS_ICON` 特例。
- Microsoft [`GetWindowTextW`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindowtextw)：跨进程控件文本应使用 `WM_GETTEXT`。
- Microsoft [`EnumChildWindows`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumchildwindows)：枚举子窗口及后代窗口；文档没有提供可作为控件语义的稳定顺序保证。
- Microsoft [`GetWindowThreadProcessId`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindowthreadprocessid)：返回创建窗口的线程 ID，并可取得进程 ID。

本轮没有运行真实 Launcher、安装包、F3、网络、VM、Actions、Full 或 QA，没有改生产、policy、Windows adapter 或 workflow。
