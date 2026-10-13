# LAN2-ACCEPTANCE-SPLIT-R1 Full Candidate 结果与止损

2026-10-13。FAIL。状态BLOCKED — ACCEPTANCE SPLIT FULL CANDIDATE FAILED / OFFLINE_LIFECYCLE。

## 运行与预算

- 唯一Full Candidate Run38402818839，attempt1，GitHub conclusion=failure。
- 受测source27de942346b511c17a651d20e8e766173bc241f0；受审代码2150b8250047c67ac3932d4e0815fe420e6d31df，Review同步72ea03ff419feede7873c74c52a058e270895626。触发前local/origin/GitHub一致，API逐blob/tree/commit相同SHA核验后仅非force快进。
- 唯一失败Artifact11816921345，名称lan-host-failure-full-27de942346b511c17a651d20e8e766173bc241f0-1，只有6份固定JSON，没有成功候选安装包。
- Full1/1已用，Final QA0/1未用且冻结；LC01/额外诊断0。按用户“任一阶段FAIL即STOP”停止，无retry、无修复、无QA，不自动追加预算。

## 已完成的本地工程

原LC01长期Thread/原工作树local282e9be/7845866/3cc99ff经MasterReview整合aed3627/88ca759/2150b82；独立81/81 fail0skip0、Go1.27.1 Windows overlay仅编译、CJS/PS syntax及diff-check PASS。只有Full测试/验收报告/对应测试和治理改动，生产Launcher/Setup/Node、旧F3身份、事务/rollback/schema及workflow零改。历史LC01 GUI源码和FAIL保留；Full生成代码没有checkSecondLauncher、secondResult、PostMessageW或DialogReason。

该实现/Review PASS不等于Full自动验收PASS。真实第二Launcher/精确弹窗/按钮/自然退出/双启动与物理Win10/UAC/Firewall/双设备仍HUMAN_PENDING，旧静态LCK03不能代替真实运行。

## 固定结果

ci-stage=FAIL/OFFLINE_LIFECYCLE；ci-test-environment=FAIL/PIPELINE_FAILED，environmentRestored=true。offline-network=FAIL，externalBefore=true、externalDuring=false、restored=true、firewallChanged=false；适配器恢复已记录，不表示整个生命周期通过。

Setup单项报告AUTOMATED_PASS_HUMAN_PENDING：I03-I08/I10-I32共29自动PASS，I01/I02/I09保留PENDING。此为局部安装/卸载/reinstall验证，不是最终候选或LAN通过。

Upgrade总FAIL，固定报告记录24个PASS：U01、U02、U05-U26；已记录F3安装、running guard、升级、同版本/降级拒绝、原账号附件、payload检查、故障rollback及卸载保数据。U03/U04/U27-U30未记录，不能补成PASS。最后记录U26，源码下一段依次fresh Setup、persistent inventory/quiescence与精确instance比较，然后才record U27。故固定证据把阻塞区间限定为U26之后/U27记录之前；不能选择唯一失败条件或宣称是数据确实变更。

singleInstanceBaseline仍是初始FAIL/observationCount=0/false字段，只有全部7次观察及终段完成才写成功。因此该摘要未最终化，不等于已证明Launcher死亡/Node死亡/锁被夺，不能将默认false当反向事实，也不能记基线全PASS。

PRIVATE_SESSION、最终FIREWALL、核心26 suites/742 checks、最终Artifact privacy/验收总报告及独立QA未到达；没有beta4-acceptance.json的实际成功报告，无beta.4最终可交付Artifact。

6个固定文件名称/来源绑定及敏感key/用户路径扫描已核验，原字节保存于evidence/acceptance-split-r1-38402818839/。没有保存或上传原始GitHub日志。一次既有日志只读安全过滤请求超时，未取得日志或固定错误字面量；本轮不追加读取/诊断/实验。

## 已证 / 未证与停止

已证：分层后的Full不执行旧GUI门禁，本轮推进到U26后的重装验收；当前Full依然FAIL，预算用完。未证：fresh Setup返回错误、quiescent进程/锁状态或instance差异中具体哪项触发；历史Full #4和全部LC01唯一根因仍UNKNOWN，不追认历史PASS。

建议仅先由网页版决定是否授权对现有Run日志做只读U26-U27定位，不新增Hosted；根因明确后再单独决定最小测试/工程范围与预算。本轮没有申请或使用新额度，不自动继续。

原Execution及T1/T2/T3/QA原工作树/分支/旧研究/证据保留；不清理、不改main/tag/Release/内部SPXT、不进入Batch5/OCR。正式产品基线仍受验beta.2单机轨道；LAN未发布/未认证。此停点不是LAN HUMAN PENDING，暂不提供beta.4人工安装包。

Run: https://github.com/KG718718/spxt-public/actions/runs/38402818839\r\n