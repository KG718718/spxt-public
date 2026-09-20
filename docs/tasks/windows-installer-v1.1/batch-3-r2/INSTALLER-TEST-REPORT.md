# R2 安装与数据路径检查

## 范围与证据

公开仓库KG718718/spxt-public，codex/windows-installer-v1.1，基线a9104f8。未读取或运行其他用途版本。
本地仅Go路径单元测试及静态契约，不运行Setup、不改本机注册表/已有实例、不安装产品；显式E盘缓存/temp。
首次R2代码f940f6882ab413587d7370b87308c23944a4b55a；原生路径测试及contract/diff-check通过。
本轮未先记录生产修改前的失败输出，不把新增测试声称为已执行的失败优先证据。

## 新增门禁

D01无INSTANCE参数默认目录，D02真实一次性runner D盘新目录，D03中文空格，D04交叠，D05拒绝ACL写，D06未知非空保留，D07合法实例，D08/D09原生Unicode快捷方式参数，D10真实可见Setup完成页执行Run，D11直接EXE绑定/缺绑定和参数冲突拒绝，D12卸载所有外置文件hash保持，D13重装原Admin/附件数据。
I01—I32保留。I17因本轮明确产品需求改为“不创建data.json/预置账号”，允许所选空目录和非业务标记；不冒充与R1完全相同。
主流程在E盘构建/程序/日志，D02/D03只用一次性GitHub runner的专属全新D路径；默认程序目录专项在该runner真实LocalAppData。本机不操作D盘。
网络恢复watchdog由180秒改240秒，TestSetup整套预算2分钟改3分钟，以覆盖额外三次安装和可见完成页；单次READY条件仍25秒，不靠增加单次启动等待掩盖R1超时。
只输出白名单非敏感证据，不导出合成身份数据文件。

## 状态

首轮f940f68 / Setup35511898512失败：编译与Portable通过，首次安装向导阶段报“app constant before it was initialized”，程序复制尚未开始。数据页插在目录页之前（目录页继续隐藏），原校验使用ExpandConstant('{app}')过早。官方WizardDirValue明确支持此阶段，改用其当前默认或/DIR值，加入固定契约断言。参考 https://jrsoftware.org/ishelp/topic_isxfunc_wizarddirvalue.htm 。首次失败保留，不能算D/I通过。

第二轮ae867533 / Setup35512364618失败：D01实际默认数据位置安装/卸载通过，D06未知非空目录反例卡在runSetup直到3分钟超时。NextButtonClick的自定义MsgBox不随/SUPPRESSMSGBOXES抑制；修正为静默模式在PrepareToInstall统一返回拒绝错误，交互模式保留可见错误提示。不延长超时、不削弱未知目录拒绝。

第二轮非敏感失败Artifact 10605988375；Go全局超时不会执行报告defer，因此不能把缺少D06报告误读成无失败。相同commit的独立Runtime35512364619、Launcher35512593702、Portable35512596984通过，只代表该commit各自门禁，不替代最终Setup复验。

83484e58的独立公开回归35512785421已通过：26/26套、742项、fail0、skip0，Windows Server runner实际文件/目录symlink preflight通过。仍不代替Win10人工验收。

最终CI及Artifact身份见文末和RESULT.md；人工十步待验。旧R1人工/自动化不能替代本批。R1首轮启动超时未确定根因，不能写成已修复。

第四轮2cca1bf / Setup35513429695仍卡D10：诊断确认TWizardForm存在，但未找到匹配按钮，页面仅到wpInfoBefore(4)，尚未进入数据页；因此前述BM_CLICK非活动推测没有得到确认。测试改用有界WM_GETTEXT读取跨进程VCL按钮文案（不读取输入框），增加可见/启用状态，保持仅允许Next/Install/Finish。Setup workflow扩大路径触发到Launcher目录，避免仅UI测试辅助文件变化时未重建Setup。生产逻辑未再改动。

第五轮0ef7785 / Setup35513798073的诊断明确显示：control="Next" visible=true enabled=true，但匹配白名单仅有"Next >"，所以没有触发Next。确认的根因是新版实际文案与测试旧文案不一致；增加精确"Next"，仍不允许其他风险/错误按钮，不改产品业务流程。之前BM_CLICK推测不能称为根因。

第六轮8522db7 / Setup35514192336仍失败：Next匹配并发出通知，但页面不前进。标准WM_COMMAND的BN_CLICKED要求高16位为0，原控制ID未截取低16位。修正测试驱动为id&0xffff，未改安装器产品逻辑、未延长单次等待。

## 最终通过（第七轮）

e9417f036d0cdf736ff84682556a994040f0de0b / Setup35514357007 attempt1 SUCCESS。D01—D13全部PASS；I01—I32共29 PASS、I01/I02/I09人工待验；同提交26/26套742项fail0 skip0。独立Runtime35514356958、Launcher35514356976、Portable35514356966也成功。

D10真实可见向导经过数据页及完成页Run，第四次Launcher READY指向自定义D盘实例，默认data未生成；D08/D09是原生读取快捷方式目标/参数验证，不能说成用户已手工点击。D12逐文件hash保留，D13原合成Admin登录和附件保留。路径单元、静态contract、git diff --check通过。所有业务测试只用合成数据。

Artifact10606870944，候选EXE SHA256 49d28d4dbd131b0dd0890e44aea358d75a8406803ff10df808f073d5c2a72af8。构建记录、上传digest、API元数据已核对；本机独立内存下载因网络未完成而终止，未声称二次复算成功。完整原始JSON及非敏感日志/hash保留在Actions Artifact；失败run保留原始记录。

结论：自动化通过，不等于Win10用户验收通过。没有Win11或干净消费级机器认证；没有解决历史archive.updatedAt时间边界专项。Batch3仍等待本包十步人工验收。

第三轮83484e58 / Setup35512785478：D01—D09、D11—D13实际通过，包括直接EXE、卸载/重装账号附件；I03实际默认程序目录通过。D10等待可见Setup完成超时，无第四次Launcher START。不能据此判定产品完成页已通过。续修为测试层改用标准WM_COMMAND/BN_CLICKED通知可见且启用的Next/Install/Finish按钮，并增加仅公开窗口类名、固定按钮名、页面编号诊断；不点击风险/错误弹窗，不加生产绕过参数，不延长25秒等待。微软文档指出非活动对话框BM_CLICK可能失败，但本次根因仍待诊断证据确认：https://learn.microsoft.com/en-us/windows/win32/controls/bm-click 、https://learn.microsoft.com/en-us/windows/win32/controls/bn-clicked 。
