# FRESH-T2 C2 普通工程返工 — RETURN

2026-10-14。状态：LOCAL RETURN / MASTER REVIEW PENDING。仅原bea7工作树/任务分支继续，base68880d6；未运行Hosted、C3、QA、Diagnostic、安装、产品EXE或push，未建Thread/agent。

## 不改写的C2事实

Run38572354045 attempt1，testedSourceca8302c32976645a83174d055dc22d1f620e5ea3，control6483c9108ad3e7c764eba0a262836f0ea428b026，safeArtifact11897209874。Master严格核验FAIL / BUILD / BUILD_PORTABLE_FAILED，buildDiagnostic LAUNCHER_UNIT / COMMAND_FAILED，setupSha null / checks空，10个cleanup全部true。内部Launcher identity/旧28/fresh2/compile已返回，父层重复旧28或报告环节未闭合；PAYLOAD_ASSEMBLY/LAN_NODE/ISCC/安装尚未到达。Candidate2/3、QA0/1由中央管理。

公开tested build-payload blob与T2返回HEAD逐byte相同，没有此文件整合漂移。C1 UNKNOWN原样保留；C2真实首个失败命令、具体Go测试及唯一原因仍 UNKNOWN，不把C1 Node alias修复、BOM、CGO或路径假设当作C2因果。

## 本地实际调查

- 固定Node24.21.0、Go1.27.1：完整四步政策28/native GoJSON管道/Set-Content UTF8/原go-test-report全部PASS；原28严格报告PASS，UTF8无BOM。
- owned junction TEMP纯反例也28/28和原报告PASS，未将其归咎于C2。
- 实际launcher build.ps1以明确合成minimal fresh profile完成内部原28、新2及链接（EXE未运行），经实际Invoke-KSessionWithRestoredEnvironment返回，环境全恢复；随后父层四步28/28与原报告PASS。实际Run-Checked原函数及原参数数组也生成严格28报告。
- 因本地未复现Hosted首个失败，修复范围仅为下列可独立证明的工具封装缺口，不声称修复了已知C2产品故障。

## 已证缺陷与修改

1. 原父LAUNCHER_UNIT恢复Builder环境后未明确固定Go参数，也未在本块建立owned cache/temp。实际C2源68880d6的完整unit块在native Go mock下继承CGO=1、GOTOOLCHAIN=auto、非空GOFLAGS及未知global cache，这是已证执行边界不等价；mock不运行真实Go或写未知global cache。

   Fresh父层继续保留重复28门禁，使用已有Enter-KSessionLanCandidateTestEnvironment在已验证物理taskWork中建立独立cache/temp，明确windows/amd64、CGO0、local、GOPROXY/GOSUMDB off、GOENV/GOWORK off、GOFLAGS/GOEXPERIMENT空。snapshot和双层finally确保Exit异常时仍恢复完整父环境，并验证恢复；未知恢复写ENV_RESTORE_FAILED并拒绝。未清理或改写未知用户cache。标准ci-lan、旧28名单/测试、原go-test-report成功谓词与文件零改。

2. 原LAUNCHER_UNIT合并政策读取、Go JSON执行/文件保存和严格report失败；父throw只留COMMAND_FAILED，丢失可白名单分类的实际子结果。新增真实子phase LAUNCHER_UNIT_ENVIRONMENT / POLICY / GO_JSON / REPORT，历史LAUNCHER_UNIT仍受支持。

   新unit-diagnostic.cjs读取私有原GoJSON与实际exit，仅生成现有四字段固定诊断。区分GO_JSON_MISSING、UNREADABLE、INVALID、COMMAND_FAILED、TESTS_FAILED、TESTS_SKIPPED、PACKAGE_FAILED、EXPECTED_SET_MISMATCH。只有实际单一固定top-level失败才编码原28白名单Test名；多个/未知/只有subtest失败用泛型，不输出未知名称、Output、路径/PID或原始日志。诊断分支不能改变实际exit，非零/缺失/非法/未知不可PASS。原严格report依旧必须实际运行并成功，新helper不能替代原report；report既存冲突仍拒绝并保留sentinel。

   buildDiagnostic原四字段/schema保持，新增枚举按unit阶段约束。最终整体PASS仍必须全部真实门禁/cleanup及COMPLETE/PASS；本块诊断PASS只表示unit Go证据闭合，不表示Payload/安装验收通过。

## 局部门禁

- 固定Node24.21.0全Fresh123/123、旧compat20/20，fail0skip0；最后追加FailedBuild显式失败反例后相关diagnostic3/3复验PASS。
- 实际C2旧source native mock污染观察与新实际parent unit块正常/Go非零/非法JSON/report冲突：旧source继承污染，新source各情形均固定隔离、finally恢复父环境，原严格28不减；失败不创建PASS报告；Exit异常仍恢复父环境并FAIL，恢复错误固定ENV_RESTORE_FAILED且FAIL。
- 新实际diagnostic CLI：正常、非零、missing、directory-unreadable、malformed、unknown均输出严格四字段且正确exit，零raw输出。所有原28固定测试逐一fail/name反例，未知/多个失败保留泛型；额外敏感字段、未知Action/BOM/malformed不能PASS；exit0/完整28 PASS混入build-fail或非空FailedBuild也固定GO_COMMAND_FAILED。
- 实际新owned物理环境下真实Go重复28/28、原report PASS，fail0skip0；污染父环境完整恢复true，产品EXE不执行。
- 安装态完整Go overlay test-c/vet PASS（未执行安装态测试）。PS AST parse/CJS syntax/diff-check PASS。workflow零改，不虚称本轮重跑YAML；可沿用Master此前解析证据。

## 交接与风险

C2首个实际原因仍UNKNOWN。已证明并闭合的是测试环境确定性边界和安全子结果丢失这两项封装缺口，是否足够准入最后一次完整C3由Master独立Review裁决；不是C3触发或预算授权。本线程不自行Hosted/重跑、不建立新Diagnostic、不挪用QA。

没有修改业务、客户38项、生产信任/身份/安全、Setup接受条件、数据、rollback、旧Full/LC01/U27结果或历史workflow。真实ISCC/安装/26-742及QA仍待验证，物理LAN人工项仍HUMAN_PENDING。所有本地私有日志、合成fixture及编译产物仅在.test-work保留，不提交/上传。

验证过程保留：新增Exit/Restore模拟注入最初因测试字符串替换的PowerShell $' 模式造成mock语法失败，改为回调替换后5/5局部及全123通过；仅修反例生成器，未放宽实现或条件。
