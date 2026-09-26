# Batch 4 当前结果
状态：IN PROGRESS — D4 最小 Hosted 诊断PASS，等待F2；不是 Batch PASS。

2026-09-26 唯一工程主控01a0db0e-c950-79e0-8e11-07155e0742f2已接管；旧主控019fa7e9-f46b-7192-9052-cd0aac7c2cc5永久RETIRED — READ ONLY HISTORY。治理提交已Review并仅同步开发分支；Primary保持public-source。原B4-T4和f8bd工作树复用，T1/T1A/T2/T3未重开。

本次恢复已解决并验证pre-baseline夹具父目录冲突、Inno JSON Unicode编码、真实copy故障注入与失败退出语义、中文路径契约测试问题。最新修复更正事务消费者读取既有programManifestHash字段，保留严格hash校验和拒绝旧别名；本地反例及主控23/23专项、纯Go/PS AST通过，已取得真实D4的19阶段PASS。

Hosted事实：D1在BASELINE失败；D2全部17阶段PASS；F1 fresh Setup29自动PASS/3人工PENDING、D13/13及U01/U02/U15—U18/U20通过，U21失败；D3前17阶段及U21通过，U23=POST_COPY_MARKER_MISSING/UNCHANGED；D4 run36213904038@d7ef3964b8fdbf1979dc527e0b65fa202c398ab0已19阶段PASS。不得将这些不同受测身份拼成最终U01—U30 PASS。

最小诊断4/4已使用，完整Setup1/2已使用，QA0/2。D4已满足最后F2准入，完整Setup仍只有1次余额。完整26/26、742、fail0/skip0、最终Artifact privacy、独立B4-QA及最终beta.2 Artifact均未取得，Win10人工未开始。

详细逐轮SHA、Run、Artifact和预算见AUTONOMOUS-EXECUTION.md；任务回单/Review链见ORCHESTRATION.md和tasks/B4-T4-RESULT.md。未进入Batch4.5，未修改main/tag/Release。远端main及v1.0.0核验仍为84cbb324a4f63bef094d2c21d70eba841205a7a7。
