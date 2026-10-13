# LC01-DIALOG-R2 Master Review

2026-10-13。REVIEW PASS — TEST ADAPTER ONLY。LAN-2仍冻结，本轮专项尚未运行0/1，Full0、QA0。

受审集成代码2da7513ba7c8a96dbb25e27120ca3f292d403dbf；基线0e077658317ec5b0f1a21173dbe425412610d55a。原LC01 Thread01a11f35-5133-7ab0-9101-d9d01a69ccea、原工作树/任务分支回单887ff66/553d082/77758f2/c2f81b6，整合089ff3b/6272c45/39471f4/38e5f52；快速退出补充090b432/a24c39c整合68277eb/2da7513。Execution local-only，无push/真实运行，现冻结。

## 独立门禁

- Master在最终2da7513执行Node两个专项suite：26/26 PASS，fail0skip0；包括两个自然成功路径、快速exit0、partial/later FAIL保留、非法/敏感字段拒绝和schema1/2兼容。
- 固定Go1.27.1、CGO0/offline，纯策略及研究测试54个顶层PASS、含子测试206项PASS，fail0skip0；vet PASS。
- Master从整合代码实际生成LC01 Hosted harness与beta2-to-beta4升级overlay，均Windows amd64离线go test -c PASS，生成EXE未运行。快速退出最后补充仅改report/CJS测试与纯Go fake，两个生成器、adapter及其嵌入策略源码未改，已编译字节源仍适用。
- 源及生成PowerShell parser PASS，生成器/static wiring检查PASS，git diff --check PASS。无本机安装或真实窗口探针。
- 保存的历史Run37909613607 schema1与38362515475 schema2报告用新版CLI独立验证通过，其原FAIL、UNKNOWN及原字段含义未改。
- 对基线diff核对：生产Launcher、Setup/历史F3 identity实现与profile、Runtime/Node、事务/rollback/业务及.github workflow均无diff。只修改Windows测试适配器、对应纯策略/测试、必要生成/报告接线和治理。

## 安全与样式Review

图标分类按实际class、完整GWL_STYLE、ID、直接parent、所属进程及两路有界STM_GETICON/STM_GETIMAGE(IMAGE_ICON)的非零相同对象交叉证明，不使用SS_TYPEMASK或BS_TYPEMASK。正文四种、图标两种、Button四种完整样式白名单；正文IDC_STATIC明确-1/65535表示，图标ID20是保守适配契约，不是微软承诺所有MessageBox布局。表外或多余控件仍FAIL，不临场扩表重跑。

保留PID/原handle创建时间/映像/存活、完整窗口标题与原F3 busy正文、唯一正文/图标/IDOK、所有必要控件可见可用与直接parent。图标不读取WM_GETTEXT正文；unknown class/style/重复/missing/读取失败一律拒绝。立即重读时比较排序后的完整原始控件集合及身份，不仅比较布尔摘要；原始值仅内存、不记录、不hash。

GetWindowLongPtr的0style、ID/parent的0返回及读取后失效均保守未证明；不依赖跨线程LastError。EnumChildWindows按微软规范不以返回值判成功，靠有界callback与完整捕获/重读门禁；顶层保持原归属/可见筛选，无关窗口绝不成为发送目标，被选中的目标模态窗及全部child严格校验。

schema3只增固定reason及纯布尔Observed/Match、阶段/分类one-hot，含icon style/semantic/count和body count。未知与不符合分离，全部key/type/one-hot/跨字段一致性验证；合法FAIL保留同源诊断与已验证身份，非法或敏感字段不发布。首个真实失败冻结，后续成功/预期消失/cleanup不能覆盖。

成功重读与structureMatch闭合后才唯一Post IDOK，随后自然退出/明确码/第一Launcher与Node存活/锁独占/noSecondBackend/正常退出及cleanup都保留。任何强制结束或句柄失败不能PASS。快速自然exit0发生在首次Inspect之前是既有DISPATCH_SUCCESS：只在原全部生命周期门禁成立时接受精确SECOND_NOT_LIVE安全证据，不伪造窗查询或MATCH；同形exit1/259、未知窗、非自然/force/guard失败仍拒绝。

上述关闭了本次本地预审的API返回值、无关窗口、ID/parent未知语义、成功重读reason、后续失败丢失和快速退出报告问题，不代表已确定历史Run38362515475或Full #4根因。

## 唯一后续与停点

先非force同步codex/lan2-manual-host-v1.1并核对local/origin/GitHub相同，才可用单独trigger提交运行一次LC01-DIALOG-R2。受验F3仍固定Run36246132535/Artifact10907910968/source c8886e6b6d413c2fd73d6716621d07a80b337e58/原EXE SHA256；无重建替代。

专项PASS或FAIL均STOP回网页版，LAN-2不自动恢复；PASS只提交申请下一阶段准入，FAIL保存固定原因/布尔/生命周期/cleanup，不retry，不挪用Full或QA。main/tag/Release/内部SPXT零操作。

规范依据：[Static Control Styles](https://learn.microsoft.com/en-us/windows/win32/controls/static-control-styles)、[Button Styles](https://learn.microsoft.com/en-us/windows/win32/controls/button-styles)、[WinUser.h](https://raw.githubusercontent.com/microsoft/win32metadata/main/generation/WinSDK/RecompiledIdlHeaders/um/WinUser.h)、[STM_GETICON](https://learn.microsoft.com/en-us/windows/win32/controls/stm-geticon)、[STM_GETIMAGE](https://learn.microsoft.com/en-us/windows/win32/controls/stm-getimage)、[EnumChildWindows](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumchildwindows)。
