# R3 Master Review qualification — temporary raw output storage

2026-10-15，Run38737813798运行期间复核。此文件更正Master准入Review中的一项遗漏，不能用旧Review PASS覆盖本限制；不修改历史Run、测试期望或受测源码。

## 已确认事实

用户本轮明确要求：不得保存原始stdout/stderr。Master派单沿用了R2工程惯例，将边界误写为raw仅Runner私有、不得上传，因此此次封装仍有临时落盘：

- tools/tests/fresh-lan-trial/firewall-r3/runner.cjs 的command将Go原始stdout/stderr写入control下private.jsonl。
- driver.ps1将runner stdout/stderr重定向至control私有文件，workflow同样将各控制命令输出重定向至私有日志。
- owned-work会在Job empty后清理，但control目录为证据保留，未逐项擦除这些raw私有文件。
- Artifact接线仅允许单个firewall-r3-report.json；是否实际满足Artifact白名单仍需Run结束后的独立下载校验，不能提前宣称通过。

这属于测试封装对用户“不保存”边界的偏差，不是已证明的生产防火墙缺陷。该遗漏由Master负责，不能归因为Execution擅自修改安全条件。没有据此新增运行或修改正在受测的来源；唯一预算仍1/1。

## 结果表述边界

真实测试矩阵、固定场景诊断、Job/owned-work/环境恢复和Artifact privacy必须依据实际报告分别登记。即使这些通过，也不能把本轮整体称无条件满足所有授权要求，不能宣称未保存任何raw输出或全部control临时文件已经清除。

本次仅完成既定受控Run收尾和安全Artifact读取，不追加Hosted/Candidate/QA、不修改生产。后续如继续工程，最小封装修正方向为仅在内存中解析子进程原始输出、写白名单固定报告，控制输出不作raw落盘；无证据时继续UNKNOWN，不能删除关键测试或降低原接受条件。该建议没有实施或Hosted验证，下一阶段范围与预算交网页版统一决定，不再拆出自动追加微专项。