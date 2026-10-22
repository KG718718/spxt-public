# 既有唯一 A/B Candidate — 审批前停止

**STOP — HISTORY_SNAPSHOT_UNKNOWN / CANCELLED；没有合格用户安装包。**

- Run [39747285185](https://github.com/KG718718/spxt-public/actions/runs/39747285185) / attempt1；受测Source 3d256a019f99126ac25298955a7ef9bb229eeb07，控制提交 7c9aa11cdc9205186b5321a31c487a0cb17f7401，授权与Review b9018c23b841bc38b8371634fcfd124e4d7075d3。本次trigger-only push仅一次，实际可见同控制Run只有1条。
- 已保存的真实Environment、唯一reviewer、禁止admin bypass、分支规则与读取能力通过前检。本地同源EXE/独立Review PASS保持，仅为BUILD资格。
- 审批前，现有 source-gate.cjs 的重复全量历史快照检查返回 HISTORY_SNAPSHOT_UNKNOWN。原生审批请求0次，审批历史为空；600秒有限监督内立即按失败拒绝规则取消，已确认终态completed/cancelled。不是审批权限已证失败，也不是产品安装失败。
- A 119718802735 / B 119718841761 均cancelled、steps=[]。BUILD、Fresh安装、F01—F09、安装后业务、26/742和QA均未开始，无Artifact。未执行的Runner恢复不记PASS。
- 精确快照差异（数量、分页内容或运行状态变化）本轮没有保留细项，保持UNKNOWN。代码确实要求两次完整快照连同status/conclusion一致，但不能据此断言本次一定由状态转换触发；不得猜测GitHub内部故障。停止后重新读取的3条历史稳定，其中旧两条cancelled、新一条cancelled；没有发现本次重复Run，不保证未来绝不重复。
- 沿用用户已批准的本次唯一额度，实际Workflow Run已创建：Candidate1/1已用，原QA0/1 UNUSED—FROZEN；不retry、不新增FC4或专项、不借QA。旧两Run与全部FAIL/UNKNOWN保持原状。
- 最小后续阻塞是审批前快照一致性的可观测性及稳定身份/可变调度状态语义；本次不继续改实现、不重新触发。源码仍3d256a01，后续只记录治理，不main/tag/Release/内部SPXT/未知清理。

安全固定证据：AB-EXACT-RUN-HOSTED-RESULT.json。原长期FRESH-T2与工作树继续冻结，未创建普通sub-agent。
