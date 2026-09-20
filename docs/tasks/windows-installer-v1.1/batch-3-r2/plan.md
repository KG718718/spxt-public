# R2 Plan

用户任务书已批准上述目的、最小安装绑定与D01—D13验证范围。复用Batch3流水线及I01—I32，新增R2测试，不删旧断言；I17因新需求调整为“不创建业务data/账号”，允许选择目录及非业务标记。遵守现有门禁。

1. 失败优先契约/Go路径用例。
2. 最小安装绑定与独立隐藏校验入口，覆盖读绑定失败拒绝/Portable不变。
3. Inno数据选择页、参数、绑定、卸载提示及路径前置检查，不恢复普通目录页。
4. D01—D13整链：默认、自定义D、中文空格、安全反例、三个入口及直接EXE、卸载/重装账号附件；CI断网窗口按测试实测需要明确调整上限，不能靠重试掩盖启动失败。
5. 同commit Actions fresh Runtime/Launcher/Portable/Setup + 26套742项0fail/skip。Artifacts有来源/hash/隐私校验，保留首次失败。
6. push仅开发分支，结果/人工十步/交接卡归档并剪贴板。人工未验不能最终PASS，不进入Batch4。

回滚：普通revert本轮代码；安装失败/卸载仅移除Inno拥有程序文件，不移除选择目录。无自动迁移可逆性假设，不恢复覆盖升级。官方依据 https://jrsoftware.org/ishelp/topic_isxfunc_createinputdirpage.htm 。
