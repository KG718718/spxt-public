# FINAL DELIVERY CLOSURE V1 — 本地授权

2026-10-17，用户完整续篇已收到。唯一Master为01a0db0e-c950-79e0-8e11-07155e0742f2，原FRESH-T2线程01a13948-7433-7571-8330-a09bfd12a0dc、bea7工作树及codex/fresh-t2-installer-ci继续使用。基线公开开发HEAD ea8bb0caa06fb08f2459cb8fc88a916c64e37f05；原线程HEAD4f8f32d802bade53fc1dc7f49112b4f995be9a93，tracked clean，未知未跟踪现场保留。

本轮只有一个连续本地交付任务，不建立微型研究Batch。实施→反例→真实本地测试/构建→Master独立Review→必要返工→整合→统一返回。

## 合并范围

- P0：compiler前后观察统一使用经过验证的physical work，保留CANONICAL/reparse/所有权要求。覆盖真实物理盘、受控SUBST、未知映射、缺失路径、reparse、权限与恢复异常，不无条件信任别名。Run39005740755仍FAIL，其实际映射类别未记录，不能追认为唯一根因已证。
- P1：CreateFreshStartup/FreshStartupMatches/DeinitializeSetup，验证实际Windows快捷方式创建、hash、COM、目标/参数/工作目录、INI及异常处理。已证普通缺陷可最小修复，身份谓词不得删除或放宽。Run38767500533首因仍UNKNOWN，不因本机反例通过改写历史。
- P2：分别核验登记、启动项、快捷方式、程序文件、工具链与恢复；仅精确证明本次受控所有权的资源允许收尾，未知或外部修改保留并FAIL/UNKNOWN，不采纳失败后自算hash作为所有权。

本地必须真实构建Runtime/Firewall Helper/Launcher/完整Setup，执行受控Windows快捷方式及安装失败恢复反例，保持原Firewall/LAN/Launcher/业务安全门禁，验证环境、句柄、进程与受控资源恢复；fail0skip0，Master独立Review。

真实产品安装仅可在已证明安全隔离且授权的Windows环境进行。没有该环境记NOT VERIFIED，不在日常业务机安装或清理，不以链接harness、合成、编译或源码测试冒充实际产品安装。先完成能够安全执行的本地工作；环境缺失如阻碍进一步验证，准确统一返回。

## 预算及停止

本轮Hosted新增0，QA继续冻结。禁止触发/重跑Candidate、Smoke、Full、R3、LC01/U27或任何专项；不修改实际trigger获取运行。历史预算/FAIL永久保留。完成本地闭环后统一返回，由用户决定最终验证预算。

安全/权限/数据契约改变、未知文件或业务数据需覆盖/删除、放宽网络/Firewall/绕过授权、系统资源所有权或恢复不可证、安全实测环境缺失阻碍验证、需额外Hosted、main/tag/Release/内部SPXT均立即停止并报告。普通本地工程问题自主循环，不逐次请示。

禁止普通sub-agent、后代Thread；Master负责Review/集成/非force同步，Execution不得push；保持现有长期线程、工作树、历史证据和数据。最终统一提交修复SHA、真实验证、未验证项、风险与最小后续预算建议，不宣称安装/LAN交付PASS。
