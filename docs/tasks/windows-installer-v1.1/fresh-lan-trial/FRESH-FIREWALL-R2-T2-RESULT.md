# FRESH-T2 / Fresh Firewall Targeted Recovery R2 — RESULT

状态：LOCAL_TARGETED_RETURN / HOSTED_ROOT_CAUSE_UNKNOWN / MASTER_REVIEW_PENDING。日期2026-10-15。

## TASK / 来源

原bea7/public-source、codex/fresh-t2-installer-ci，起点efaf1890；核验origin=https://github.com/KG718718/spxt-public.git、tracked clean/.test-work保留。安全merge主控a331390e，无冲突，现场锚e1943299390d719b5fbb6154025a98fcd36dfe2a。准确Master/return target01a0db0e-c950-79e0-8e11-07155e0742f2。

R1 Smoke Run38674907559/sourcec503fe094c07b9e1c7e33648072701461afd73be/Artifact11946315115仍FAIL，原报告仅知顶层TestFreshFirewallBindingBeforeAnyMutation失败，子场景/底层首因UNKNOWN。Smoke1/1已耗尽，Candidate0/2、QA0/1冻结；本轮新增Hosted/Actions/Full/QA=0，trigger/workflow零修改。

## 完成 / 差异结论

初始同码12/12本地PASS，未复现历史Hosted首因。针对源码已证缺口构造受控真实PS反例：原非exact predicate接受23或25且无mutation；模拟adapter读取提前中止、route记录完再中止、unknown-virtual的adapter记录后中止均可满足旧generic拒绝条件，却不是预期binding/adapter拒绝路径。此缺口可能掩盖infra错误，不是R1顶层FAIL的已证原因，更不是生产安全Bug。

保留原23/25集合及原成功/mutation断言为ExpectationMatched，增加独立PathProven：仅在内存核对原生产Stop-With固定白名单码/预期退出类别或原ENABLED成功协议；不保存raw输出。读取轨迹按独立整行token严格解析、未知/重复token拒绝；测试前验证所有生产Net命令均为本次inline function mock，缺失/外部定义时在生产脚本前拒绝。受控MISSING_MOCK反例未触达真实Net*。

原13共享harness最终零diff；读取记录器及包装器只在fresh overlay内复用原mock ScriptBlock。生产firewall_windows.go、其他生产Go、身份/安全/Private/binding/rollback/业务均零diff；timeout仍20秒、窄显式子环境保留，没有用放宽时限或继承用户环境猜修复。

## 文件 / 固定诊断

- fresh_behavior_windows_test.go.in：12场景不减；Go启动/PS执行/timeout/assert/COMPLETE阶段，固定exitClass、mock/read/mutation/期望/path布尔。四个新增负例另为独立本地top测试，原Fresh2精确集合不变。
- fresh-scenario-diagnostic.cjs及fixture/test：严格12场景白名单/阶段/退出类别/纯布尔，拒绝extra敏感字段、未知/重复child、矛盾COMPLETE及缺失成功observation。
- helper-go-diagnostic.cjs + build-diagnostic.cjs：沿用原4字段及历史top分类，失败可保留有限scene_phase_exitClass；known child无observation为UNKNOWN_UNKNOWN，不推断。未知child/非法/重复/敏感载荷不能PASS，FAILED_COMPLETE不受支持。
- helper-diagnostic.test.cjs、helper-build-wiring.test.cjs：Fresh成功fixture必须含真实形状的12条固定observation及child pass，未通过兼容缺失证据放宽。实际CLI及实际Helper build stub覆盖细分类接线。

没有新增Hosted模式、schema字段、trigger或workflow，不上传原始stdout/stderr/error正文、路径、网络、账号、PID或hash长度。

## 测试 / 源记录

固定Node24.21.0（原pinned EXE SHA验证）、Go1.27.1，CGO0/local/offline/GOENVoff/GOWORKoff，原owned物理fixture/cache及环境恢复。

- r2-initial-target.jsonl：原12/12本地PASS，保留初始证据。
- r2-final-target.jsonl：严格12/12、Fresh policy PASS；4个负例guid-changed_ADAPTER_ABORT、guid-changed_ROUTE_ABORT、unknown-virtual_ADAPTER_ABORT、guid-changed_MISSING_MOCK全PASS。
- r2-original13.jsonl：原13/13 fail0skip0；r2-exact-fresh2.jsonl：原精确Fresh2/2 fail0skip0；r2-actual-cli-diagnostic.json为实际helper诊断CLI对该真实GoJSON生成HELPER_FRESH_TESTS/PASS。
- r2-final-node.txt：全Fresh/R1 141/141 fail0skip0；r2-compat.txt：旧compat20/20。最后scene_phase_exitClass细化后相关实际CLI3/3复验PASS，含GO_START_START_FAILED、TIMEOUT_TIMEOUT、ASSERTION_NETWORK/BLOCKED、PS_EXECUTION_OTHER及UNKNOWN_UNKNOWN。
- Go overlay test-c/vet、gofmt、变更CJS syntax、diff-check PASS；生成overlay实际用于上述目标与原Fresh2。PS/workflow未改，原13 harness零diff。
- r2-safe-local-summary.json：仅12固定observation/4负例ID及历史UNKNOWN/本轮Hosted0等固定摘要。

上述文件均在本工作树.test-work内，不提交raw。可复验：node24.21 --test tools/tests/fresh-lan-trial/fresh-scenario-diagnostic.test.cjs tools/tests/fresh-lan-trial/helper-diagnostic.test.cjs tools/tests/fresh-lan-trial/helper-build-wiring.test.cjs；Go使用prepare-policy-overlay.cjs FIREWALL产生overlay，在原Enter-KSessionFirewallTestEnvironment中分别-run原13名单、精确Fresh2、独立TestFreshFirewallHarnessCannotMaskInfrastructureFailure。环境/目录必须新建owned，不复用已有输出。

初期测试包装中PS换行反引号进入Go raw literal导致gofmt解析失败，改用char10后编译通过；读轨迹不足以证明拒绝原因的route-after-read反例由Master提出并已纳入。没有删用例或将FAIL/UNKNOWN转PASS。

## 本轮未做 / 风险 / 需主控

Hosted真实首因仍UNKNOWN。本轮确定修复的是测试oracle/证据丢失；不能宣称R1 Smoke修复或产品缺陷已证。根据Master有限探索/不得碰运气指示，本轮真实Helper/Launcher及完整payload NOT_RERUN；仅引用R1 source401ea7f9实际完整构建为历史证据，不当作R2构建结果。ISCC/Setup/安装/实机/网络/Firewall/Registry/Service/Startup/业务数据/新产品EXE均未执行。

因此这是定点本地结果交审，不声称R2原完整产物验收条件全部达成。请Master独立Review/整合；如认为需要远端证实，只能交用户另行决定最小独立原Fresh2/12场景验证及固定scene_phase_exit诊断，不使用已耗尽Smoke或冻结Candidate/QA，不自动创建/触发任何Run。

local commit：见本报告所属提交及准确主动回单。保持原树、分支、全部旧提交/test-work/失败证据，不push、不清理、不main/tag/Release/内部SPXT；本轮实现交审后冻结。
