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

最终CI及Artifact身份待核验补入；人工十步待验。旧R1人工/自动化不能替代本批。R1首轮启动超时未确定根因，不能写成已修复。
