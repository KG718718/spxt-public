# FAST INSTALL RECOVERY R2 — Master 独立 Review

2026-10-16。结论：**有限实现 Review PASS，真实安装与完整恢复 NOT PROVEN；Hosted 继续冻结。**

唯一 Master `01a0db0e-c950-79e0-8e11-07155e0742f2`；原 FRESH-T2 正式 RETURN 后冻结，未使用普通 sub-agent 或后代。实现 `4e7f58e8341bc69822570838a1716667fb8e654b`；Execution 报告 `b748b359d2f97dd53e9856ace501b6c741abba50`。Master 以 ff-only 整合，未更写受测来源。

## 独立审查结论

- `setup-beta4.iss` 仅 Fresh 分支增加固定阶段、上下文与首个失败诊断，将相同安全谓词分阶段求值；目录链、属性、SHA256、完整 COM 三字段、无覆盖移动和未知身份不删除均保留。没有证据证明历史 F01 产品根因，不能称本轮已经修复该根因。
- Setup 开始前已经注册收尾 collector，逐项观察 ProductKey、Binding、Startup/Desktop/Programs、程序文件及外层工具/规则/全局状态。完整安装身份通过前，不调用宽泛卸载或删除部分安装。无生产者 receipt 的未知资源保留并失败。
- 自建 fixture 在独占创建前记录预期字节；不完整写入、外来改变、失效/退休 receipt、缺失/非法观测不能追认所有权。当前 Startup receipt 来自生产者 INI，不以失败后自算 hash 代替。
- schema2 在实际 bootstrap、Go core、reader、CI finally、finalizer 和 artifact 入口贯通。当前报告拒绝降级；历史 schema1 FAIL 仍原样可读。所有恢复字段严格枚举，原始输出仅在 RAM；缺失、矛盾、额外敏感字段不能成为 PASS。
- CI 先标记 ENV/DEPENDENCY_UNPROVEN，再做恢复前态采集；finally 中单项失败仍尝试环境恢复与固定报告。工具文件与产品登记分别核验，未借拆分绕过全局注册表/规则比较。
- 原生产 Launcher/Helper/Node/业务/版本/信任/事务/rollback 没有修改；workflow、trigger 与旧预算/历史失败未修改。GitHub 三条 fresh push workflow 均受固定 trigger 路径约束，本轮不修改它们。

## Master 独立实际验证

下列测试均在冻结实现 SHA 下执行，前后源码绑定检查通过，原始 stdout/stderr 不落盘：

| 验证 | 实际结果 |
| --- | --- |
| R2 CJS / 现有 root | 28/28 与 134/134，fail0skip0 |
| Windows Go Recovery | 5 个顶层目标全部 PASS，fail0skip0；实际编译 installed overlay；含系统四视图只读 Registry 和真实 owned Inno INI 读取；未运行整安装测试 |
| PowerShell / 实际 finally AST | 22 项恢复反例、7 类注入故障，fail0skip0；相关 PS parse 0 errors |
| 上述三个受控 Job | 正常退出、stderr 空、管道/句柄关闭、Job empty，无 force；Go/PS 环境恢复 true |
| 真实 Inno/COM 14 场景 | 独立读取矩阵、driver 与 scope；源码规范化 hash 与实际实现相同，未知/篡改/锁定资源保全；这不是实际产品安装 |
| 完整构建独立身份 | 实际 EXE SHA/字节数、source/tree、程序清单与完整 payload inventory 逐项一致，重新调用原 package verifier PASS；1049 文件/20 依赖 |

Execution 的完整 P0 也真实执行 Helper 原13/Fresh2、Launcher28/Fresh2、Node44，全部 fail0skip0；原 LAN50/权限47 是 Execution 本轮局部门禁，并非安装后浏览器或核心26/742证据。

## 准确限制

历史 R1C2 / Run38767500533 F01 仍 FAIL，最初出错子阶段 UNKNOWN。原函数在当前 Win10 owned baseline 通过，不能推断 Hosted 唯一首因。当前机器不是获证专用产品安装隔离环境，因此没有运行真实 Fresh Setup；没有以 driver/overlay 冒充安装。

真实防火墙只读 collector 为 QUERY_CIM_FAILED / OBSERVATION_FAILED / NOT_PROVEN；该探针无规则修改、环境恢复、Job empty 且无 force，但受控非零退出的 scope 为 FAIL，不能汇入通过总数。未进一步修改权限、服务、网络或规则。未知的早期安装资源不会清理，完整失败安装恢复仍未证明。

因此 Review PASS 仅批准本轮实现集成，不授予 Candidate 运行/用户包交付资格。新增 Hosted 0；旧 Candidate2/2 FAIL、QA0/1 冻结，历史 Smoke/R3/Full/U27/LC01 结论永久保留。
