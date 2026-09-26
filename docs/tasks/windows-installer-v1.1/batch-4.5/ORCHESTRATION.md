# Batch 4.5 Orchestration

方案A已批准，IN PROGRESS。唯一Master/回单01a0db0e-c950-79e0-8e11-07155e0742f2；旧Master永久只读。集成codex/lan-host-v1.1；Primary public-source。

|Task|Thread|worktree/branch|状态|依赖|
|---|---|---|---|---|
|B45-T5-PREFLIGHT|01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9|b4-qa/codex/b45-t5-preflight|已整合7bfbfd3；c06dcfe历史冻结|方案A已解除原阻塞|
|B45-T5-IDENTITY|01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9|b4-qa/codex/b45-t5|INTEGRATED a5466ef / HOSTED_READY|仅等待专项1|
|B45-T1|01a0e002-cbb8-77f1-bf0b-505a7a327007|f8bd/codex/b45-t1|INTEGRATED 9b23ba6 / 冻结a698f94|Master15/15；T2接线|
|B45-T2|01a0e01c-ad06-7413-8572-bf1dbf2fbd11|lan-server/codex/b45-t2|DISPATCHED @9b23ba6|已整合T1接口|
|B45-T3|待派发|待分配|WAITING|T1/T2|
|B45-T4|01a0e004-98a3-75b2-a2a1-3ffd0c6506c9|lan-firewall/codex/b45-t4|DISPATCHED @abb4959|独立helper实现，与T1交换契约；Launcher接线串行|
|B45-T5-INTEGRATION|同T5|同T5|WAITING|取证/T1—T4|
|B45-QA|待派发|待分配|WAITING|整合与实际证据|

预算：专项0/4、Full0/2、QA0/2。身份取证计专项；不得运行无关Full。每次run前登记精确source/mode/budget，后记录result/Artifact，无修改不retry。

Execution local commit→主动send_message_to_thread准确Master；Master wait/read/RESULT/worktree/commit兜底，失败恢复记DELIVERY_RECOVERED。Review后才整合。旧预检主动回单已收、独立21/40/41反例与双server无listen检查通过；仅预检，不代替产品验证。

## 专项1预登记

T5主动RETURNED a5c974649627e5267cf616f757ad78ae5e648834；Master独立9/9+PS进程/AST PASS、旧workflow条件不变，Review整合a5466ef29cd1675444d9e299bb3ffda92039e833。下一次仅dispatch setup-v3.yml / codex/lan-host-v1.1 / mode=lan-identity，专项预算预留1/4；Full0/2、QA0/2。受测为包含本登记的精确HEAD（产品与a5466ef相同），dispatch后回填run/source；不因治理[skip ci]触发Full。T5代码冻结等待结果。

专项1已dispatch：Run36280286553 / source bb497a8f7ddbbd9e581db25b3f7c503270a9279f / mode=lan-identity，预算正式使用1/4，Full0/2、QA0/2；结果PENDING，禁止提前声称取证PASS。

专项1结果FAIL：Run36280286553/job108510690830，固定STATIC_GATE/BLOCKED_STATIC_GATE；Node9/9 PASS，PS process test的TEMP_PATH_UNSAFE停止，实际安装未运行。Artifact10918207525，ZIP SHA25621b1c2d82eaa974d96d5a6fb0d105c86394957711d957f1831a59fcaa97c2964，仅安全report，Master内存解包/严格schema/来源核验PASS。其他5job skipped。T5同线程R1最小修复测试临时路径假设，必须本地反例和Review后才专项2，尚未重试。预算正式专项1/4、Full0/2、QA0/2。

T1主动回单实现24a9095+报告56e6512+路径返工a698f94已Review整合def05c5/ec0800d/9b23ba6；Master独立15/15 PASS。T1冻结，T2仅自己的server/bootstrap入口接线；所有原业务权限/契约保持。
