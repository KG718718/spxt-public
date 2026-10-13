# LAN2-U27-R2 — 唯一专项结果 / STOP

2026-10-14。BLOCKED — U27 PREINSTALL NONEMPTY REJECTED / RESTORE CHECK FAILED。

- Run：38429594054，attempt1，结论FAIL。
- 受测source：a2094f38943b7380eb52c5eac828b16093cf96fb。
- 固定Artifact：11830434469，唯一文件U27-SPECIALTY-REPORT.json。
- 本地Review：代码83caf72，Review51e4a6b；Master99/99、历史26/26 fail0skip0、实际Go纯helper/overlay只编译、PS与范围diff-check通过。
- U27-R2 Hosted1/1已用；本轮Full0、QA0、LC010，不retry，不自动修复。

## 已确认

GitHub步骤证明公开精确源码隔离和受验F3实际metadata/ZIP/Setup校验通过；构建/前缀步骤FAIL，固定报告verify与上传步骤SUCCESS。Artifact只有一份JSON，Master以严格schema、source、字段/枚举/阶段一致性及privacy白名单独立复核通过。

完整TestSetup PASS，正常生命周期前缀到U26 PASS；不是任意fresh安装。保留历史完整TestSetup、两个独立Go进程、全部7构建/fault/rollback链和U26原退出/inventory时序。复现了历史已记录的U26完成及随后的fresh拒绝区间；历史未记录的clone/残留文件细目和全部隐含状态不能称精确已知。只读采样增加耗时，不能以本轮推断历史每一瞬间完全一致。

fresh前实际固定状态：

| 项目 | 状态 |
|---|---|
| ProductKey | ABSENT |
| 保留BindingKey | EXPECTED |
| 安装根 | NONEMPTY_DIRECTORY |
| program | PRESENT |
| 原uninstaller | ABSENT |
| 两快捷方式 | ABSENT |
| 受控Launcher/Node | EXITED / EXITED |
| instance根锁 | EXCLUSIVE_OPEN_CLOSED |
| 持久业务inventory | UNCHANGED |
| 卸载clone收尾 | UNKNOWN |

fresh实际启动，安装日志已读取，内层13字段报告：statusFAIL、classificationPREINSTALL_REJECTED、exitStatusINNO_EXIT_PREPARE_REJECTED、markerStateOBSERVED、observedMarkers仅KSESSION_REJECT_NONEMPTY、preInstallStateREJECTED、copyState/postInstallVerificationState均NOT_OBSERVED。

因此本轮直接原因已确认：fresh安全前置检查拒绝非空安装目标；不是instance比较失败、不是已证账号/附件损坏，也不是新鲜F3资源损坏。拒绝符合当前产品安全条件，不得绕过。NOT_OBSERVED不改写为已执行/PASS；源码拒绝分支在native copy之前return，但本报告不伪造额外copy完成观测。

## 未证明

program的具体残留文件和来源、是否由clone继续收尾或升级新增payload未被原卸载登记覆盖，仍UNKNOWN。原历史Run38402818839没有真实exit/marker证据，不能据本轮称其唯一根因已证；本轮为相同调用点提供了具体可解释拒绝。

外层classificationEXECUTION_FAILURE/stageCOMPLETE/statusFAIL；networkState.isolationStateUNKNOWN、restorationStateFAILED，cleanupStateCONTROLLED_ONLY。恢复校验未闭合，不能宣称整个offline区间/精确恢复或cleanup PASS；能够上传不等于全部原adapter恢复已证。不得将该失败推到真实用户网络，本轮仅一次性Hosted Runner。没有读取原始日志或新增网络probe来追因。

## 最小后续建议（仅提案）

先静态审查beta4升级事务后最终program与Inno卸载日志的文件所有权对应关系，再用不安装的合成反例覆盖已知owned文件应删除、未知文件保留、完整instance保留；必要时由网页版另批固定残留类别证据，明确区分clone时序与稳定残留。不能直接删program目录、删除未知文件或放宽KSESSION_REJECT_NONEMPTY。

恢复校验失败需另行明确驱动证据修复范围；不能为此自动追加Hosted、改变系统网络或把FAILED改成PASS。尚无充分证据直接批准某个生产修复。

专项已结束，原Execution冻结，旧Full/LC01 FAIL与全部工作树保留，LAN-2/Full/QA继续冻结，无最终beta4 Artifact。不操作内部SPXT/main/tag/Release/Batch5/OCR，只治理非force同步后交网页版STOP。

[专项Run](https://github.com/KG718718/spxt-public/actions/runs/38429594054)；[固定Artifact](https://github.com/KG718718/spxt-public/actions/runs/38429594054/artifacts/11830434469)。
