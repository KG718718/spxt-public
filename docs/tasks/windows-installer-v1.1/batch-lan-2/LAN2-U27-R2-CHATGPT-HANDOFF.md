# LAN2-U27-R2 — 专项失败，返回网页版决定

日期：2026-10-14

## 结论

已查明本次fresh beta.4 Setup非零的直接原因：卸载后安装根仍非空，program仍存在，Setup按安全条件拒绝。未修改生产，不追加运行；LAN-2继续冻结。

## 可核验证据

仓库：KG718718/spxt-public
分支：codex/lan2-manual-host-v1.1
Run：38429594054，attempt1，FAIL
受测source：a2094f38943b7380eb52c5eac828b16093cf96fb
固定Artifact：11830434469（单个U27-SPECIALTY-REPORT.json，严格source/schema/privacy核验通过）
Run链接：https://github.com/KG718718/spxt-public/actions/runs/38429594054
Artifact链接：https://github.com/KG718718/spxt-public/actions/runs/38429594054/artifacts/11830434469

F3实际metadata、原ZIP及Setup SHA256校验通过；仍为Run36246132535 / Artifact10907910968 / sourcec8886e6b6d413c2fd73d6716621d07a80b337e58，未重编或混搭beta.2。

完整TestSetup及正常U26前缀PASS。专项保留历史两个独立Go进程、全部7构建/fault/rollback链、原受控退出和inventory时序，U27后停止。

fresh前：ProductKey ABSENT；Binding EXPECTED；uninstaller及两快捷方式ABSENT；受控Launcher/Node EXITED；锁EXCLUSIVE_OPEN_CLOSED；instance UNCHANGED；但安装根NONEMPTY_DIRECTORY、program PRESENT；clone收尾UNKNOWN。

fresh实际启动，内层固定结果：PREINSTALL_REJECTED / INNO_EXIT_PREPARE_REJECTED，唯一标记KSESSION_REJECT_NONEMPTY；copy/post校验NOT_OBSERVED。后续fresh inventory比较没有执行，不能扩称全部重装或数据验收PASS。

另有network restoration FAILED / isolation UNKNOWN，cleanup仅CONTROLLED_ONLY；外层EXECUTION_FAILURE。不能宣称恢复/cleanup PASS，也不能从能够上传推导全部adapter恢复已证。本轮仅一次性GitHub Runner。

## 已做与未证

仅8个测试/报告/接线文件及治理。Master独立99/99、历史26/26 fail0skip0、实际Go纯反例、overlay只编译、PS/结构Review及提交范围diff PASS。受审代码83caf72；结果治理a699e4c。生产Launcher/Setup/Node、接受条件、身份/事务/rollback/schema均未修改。

本次拒绝点已证；具体残留文件、clone竞态或卸载所有权覆盖缺口仍UNKNOWN。历史Run38402818839的真实exit/marker未保存，不能称其唯一根因已证。原Full #4及所有LC01 FAIL不改写。

## 下一步最小建议与预算

建议先批准只读源码审查：核对beta.4升级后的最终program文件与Inno卸载登记的所有权关系，补无安装合成反例；再决定最小生产修复是否必要。同时单独界定恢复校验失败的测试驱动修正范围。

不得直接删除program/未知文件、放宽NONEMPTY拒绝或把恢复FAILED改为PASS。当前不具备直接进入Final Full的条件。

U27-R2 Hosted1/1已用完；本轮Full0、QA0、LC010。没有重跑、真实本机安装、内部SPXT操作、main/tag/Release或最终beta.4包。原Thread/工作树/历史证据保留。Master完成治理同步即STOP，等待网页版新范围与预算。
