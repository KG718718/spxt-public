# Duplicate Run & Source Gate Closure — 本地授权

2026-10-22 用户明确授权，只读取证两个同control Run39732016119/39732017789及push/并发/分页，然后由原FRESH-T2/bea7最小修复来源准入及分类，本地反例和Master独立Review后非force同步。基线5c5038074b86d73642f6ec0348c0960b51a8561a。

历史Run、FAIL/UNKNOWN、旧预算和原trigger/authorization均保留，不能删记录/清零/忽略重复；concurrency只用于执行并发控制，不称防重复触发。未来准入必须明确绑定新授权control、唯一RunID、Source、attempt与实际Job状态。同授权多Run时fail closed，不允许两个进入安装。分类须区分API查询失败、历史数量异常、授权不匹配和Job验证失败；缺失/分页不全保留UNKNOWN。

至少覆盖唯一合法Run、同control重复、不同Source、错误control/attempt、缺失/未完成/失败Job、API缺失/分页不全、历史与授权不匹配。旧两Run精确保留并验证，不自动选择更小RunID。当前无法预知未来RunID，不得以自报RunID冒充外部授权；若需未来精确绑定凭证，应只实现最小本地合同和反例，不创建真实Run批准或预算。

Hosted0、Candidate旧槽位已用、QA冻结；不触发或取消/删除其他Actions，不触碰main/tag/Release/内部SPXT/真实数据/未知资源，不普通sub-agent或后代。Master只读取证、Review、集成/非force同步；Execution实施并local commit正式RETURN。普通测试实现问题自主返工，不新增研究Batch。重复底层无证则UNKNOWN。
