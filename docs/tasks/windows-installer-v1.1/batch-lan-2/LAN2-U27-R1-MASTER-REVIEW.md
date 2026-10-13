# LAN2-U27-R1 Master Review / RESULT

2026-10-13。REVIEW PASS — LOCAL TEST DIAGNOSTIC ONLY；实际拒绝根因UNKNOWN，LAN-2继续BLOCKED。新增Actions/Hosted0、Full0、QA0，无真实安装/系统probe。

## 精确位置与证据

历史Run38402818839@27de942346b511c17a651d20e8e766173bc241f0/失败Artifact11816921345不变。用户/网页版已核实日志setup candidate success=false want=true，调用为record U26之后runSetup(targetBeta4,true)，位于生成TestUpgradeLifecycle中fresh重装入口，U27尚未记录。原runSetupRaw先读取安装日志、取得exitStatus与固定markers，再由runSetup只打印成功布尔；旧报告没有保存这些字段。因此失败发生在Setup结果判断，后续persistentInventory/instance比较未执行；不能再把它直接归因为数据校验失败，也不能恢复历史具体退出类别或拒绝marker。

主控基线1c6015a；原LC01 Thread01a11f35-5133-7ab0-9101-d9d01a69ccea/原lan2-lc01工作树/任务分支正式主动RETURN后仅选择实现78e25ff/d5bb808/c8e83a5整合215bcfa/e68ba5d/abe5034；回单ab09d58/18cb08b/40f046c整合7ffdd74/5418759/78813a3a3a7af13e0b80e99a92018e3c3ed5e850。原merge13eeb7a与超范围删除bd4110d均未整合。Master要求纠正后原Thread以8506f37恢复14路径原blob/mode，14/14一致；Master独立对原13eeb7a核验LC01研究/历史文档namespace净diff0。停止研究不等于删除成果，原现场已保留。

## 独立门禁

Master在集成78813a3执行compatibility-report：92/92、fail0、skip0，C01-C15/LCK01-LCK14原映射保持；独立LC01/第二Launcher纯合成26/26、fail0skip0（显式本地test-only pwsh执行器，不冒充Hosted正式信任路径）。生成Windows overlay，Go1.27.1 windows/amd64、CGO0/offline go test -c PASS，完整harness EXE未运行。独立对该生成器实际helper提取仅标准库纯Go测试，14组输入与CJS类别/阶段/marker等价PASS，未调用Windows/安装API。7个CJS syntax和diff-check PASS。公开26/742未复测，其精确要求未改。

生产Launcher/Setup/Node、安装版本、卸载规则、历史F3身份/profile、安全、事务/rollback、业务schema、workflow与触发文件均无diff；只有7个测试/固定诊断/验证接线文件及治理，全部无[lc01-hosted]/[lan2-candidate]/[lan2-final-qa]触发提交。

## 诊断合同

runSetupRaw不再因缺日志/读取失败抢先Fatal，先形成安全状态；通用runSetup仍因缺/读取失败fail closed，既有直接Raw fault路径仍受严格marker检查。U27显式保留原exitCode==0、want=true成功判断，诊断完整性单独约束，绝不把拒绝或缺证据当成功。

报告为固定U27_PRE_INSTALL，13字段严格schema/key/type/source绑定：process/log/exit安全枚举、原完整固定marker白名单、pre/copy/post证据状态；无原始日志/退出消息、路径、PID、账号、业务正文、相关hash/长度。未知非零退出保持失败；未知/未观察不转PASS。出错前写入原升级JSON，未来允许的运行即使失败也可保留固定诊断，当前没有实际运行证据。

阶段解释经独立返工收窄：DATA_REJECT单独或与READY共现不证明后阶段；有独立POSTINSTALL_FAILED/INSTALLED_PAYLOAD_VERIFIED才承认copy/post正证据。共享POSTINSTALL_FAILED名称在fresh同样适用，不推为upgrade模式。晚非零且已验证保留阶段证据、总体FAIL；矛盾的exit0+verified+DATA_REJECT/POSTINSTALL_FAILED严格FAIL/UNKNOWN，不折叠为诊断PASS。合法但U27非预期旧fixture/sequence标记安全UNKNOWN，Go/CJS白名单逐项一致。

## 卸载与fresh预期

原受控Launcher/Node必须已退出、instance根锁可独占打开且probe关闭、业务data/附件/LAN config保持。fresh安装要求无产品登记、目标安装目录不存在或为空、无同名快捷方式、安全路径/数据绑定、无运行进程/实例锁冲突及空间/写权限可证。ProductKey登记应移除；BindingKey上次实例位置由现代码保留并供fresh重绑，不能一概要求清空或当未知安装登记。

U26现检查uninstaller.Run返回、unins000.exe消失、持久业务inventory未变，不证明全部卸载收尾/目录/登记/快捷方式状态。Inno官方明确卸载退出时clone仍可能继续收尾；它支持竞态候选，未证明此Run实际竞态。原build-beta4把fresh payload写app/program、upgrade写tmp并事务swap，升级新增文件的最终卸载日志所有权覆盖是另一个待证候选，不能仅凭源码推实际残留或直接改清理。

官方依据：[Uninstaller Exit Codes](https://jrsoftware.org/ishelp/topic_uninstexitcodes.htm)、[Setup Exit Codes](https://jrsoftware.org/ishelp/topic_setupexitcodes.htm)。0-8枚举与既有映射一致；本任务固定参数不含/HELP，不把其特殊exit0用途作为安装证明。

## 是否需要生产修复 / 下一验证建议

目前UNKNOWN，无证据批准生产修复。若以后确认只是克隆收尾时序，才考虑本地证明后的测试等待修复；若确定有已知owned payload卸载登记缺口，需另批最小生产所有权修复；若为未知文件/登记的正确安全拒绝，必须保留拒绝，不能覆盖/强删/放宽以PASS。

最低建议是另行批准1次专项Hosted，复用受验F3原Artifact/SHA及同源beta4，在隔离合成instance内复制与原U26后等价的升级→停止→卸载→fresh重装状态，并收集U27固定诊断。删减前置fault链必须先证明终态等价，不能用任意fresh安装替代。如果等价最小链路不可证明，则只能由网页版另定一次完整生命周期验证及预算。该建议不是授权，本轮没有新增workflow或专项模式、没有触发、没有Full/QA、没有提供beta.4包。结果均先看exit/markers/phase，再定最小修复，不恢复GUI研究/本地解包/VM。

仅测试/治理[skip ci]非force同步开发分支，随后STOP；旧Full/LC01 FAIL保留，不进入main/tag/Release/Batch5/OCR，不访问内部SPXT。\r\n