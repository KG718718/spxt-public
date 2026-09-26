# Batch 4.5 Orchestration

方案A已批准，IN PROGRESS。唯一Master/回单01a0db0e-c950-79e0-8e11-07155e0742f2；旧Master永久只读。集成codex/lan-host-v1.1；Primary public-source。

|Task|Thread|worktree/branch|状态|依赖|
|---|---|---|---|---|
|B45-T5-PREFLIGHT|01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9|b4-qa/codex/b45-t5-preflight|已整合7bfbfd3；c06dcfe历史冻结|方案A已解除原阻塞|
|B45-T5-IDENTITY|01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9|b4-qa/codex/b45-t5|DISPATCHED @abb4959|先实现最小取证，再Review才专项1|
|B45-T1|01a0e002-cbb8-77f1-bf0b-505a7a327007|f8bd/codex/b45-t1|DISPATCHED @abb4959|网络/config/port独立模块，与取证无共享文件|
|B45-T2|待派发|待分配|WAITING|T1接口|
|B45-T3|待派发|待分配|WAITING|T1/T2|
|B45-T4|待派发|待分配|WAITING|T1契约；共享Launcher串行|
|B45-T5-INTEGRATION|同T5|同T5|WAITING|取证/T1—T4|
|B45-QA|待派发|待分配|WAITING|整合与实际证据|

预算：专项0/4、Full0/2、QA0/2。身份取证计专项；不得运行无关Full。每次run前登记精确source/mode/budget，后记录result/Artifact，无修改不retry。

Execution local commit→主动send_message_to_thread准确Master；Master wait/read/RESULT/worktree/commit兜底，失败恢复记DELIVERY_RECOVERED。Review后才整合。旧预检主动回单已收、独立21/40/41反例与双server无listen检查通过；仅预检，不代替产品验证。
