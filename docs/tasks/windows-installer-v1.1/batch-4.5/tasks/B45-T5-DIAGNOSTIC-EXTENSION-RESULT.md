# B45-T5 Diagnostic Extension Result

## 结论

- TASK ID：B45-T5 / D5-D6 Diagnostic Extension。
- 状态：**PASS — LOCAL ENGINEERING / READY FOR MASTER REVIEW**。这不是 D5、Full、QA 或候选通过；Hosted 预算仍为 D0/2、Full0/2、QA0/2。
- 已确认机制：当 Go 的有效临时根经 junction/reparse 别名表示时，原三项测试可精确复现 `HELPER_PATH_INVALID`、`INSTANCE_BINDING_INVALID`、`REGISTRATION_INVALID`；较长的 owned 物理根还会使 Windows PowerShell 行为测试的事件文件超过兼容路径边界。后者已在本地以 232 字符根复现为 12 个顶层 PASS、10 个 fail event、包级 FAIL。
- 未确认事实：Run36288039798 当时的 Hosted `TEMP/TMP/GOTMPDIR` 精确值及路径类型没有原始安全证据，因此不能把 junction、短名或长路径写成该历史 Run 的唯一根因。
- 修复只改变测试夹具、测试驱动和 D5 接线：实际 build 入口先记录原 `TEMP/TMP/GOTMPDIR` 固定分类，再把测试环境放到解析后的规范物理 TEMP 父目录下，以 PID+GUID 建立 owned root；生产接受条件未放宽。

## 修改文件

- `.github/workflows/lan-host-v1.1.yml`
- `.github/workflows/setup-v3.yml`
- `tools/windows-firewall/build.ps1`
- `tools/windows-firewall/test-environment.ps1`
- `tools/windows-firewall/policy_test.go`
- `tools/windows-firewall/firewall_behavior_windows_test.go`
- `tools/windows-portable/ci-lan.ps1`
- `tools/tests/lan-host/firewall-test-environment.test.ps1`
- `tools/tests/lan-host/firewall-build-driver.test.ps1`
- `tools/tests/windows-installer/beta3-upgrade/compatibility.test.cjs`
- `tools/windows-installer/beta3-upgrade/build-beta3.cjs`
- `tools/windows-installer/beta3-upgrade/verify-artifact-beta3.cjs`

## 11 类反例与对照

1. 规范绝对路径合法：owned physical root 下完整 Go 套件通过。
2. 真实 `program` 层级合法：`TestInstallIdentityAndTampering` 正例通过。
3. 独立合法 instance：`TestBoundConfigMustMatchRequest` 正例通过。
4. 精确 registration/UTF-16 INI binding：对应正例通过。
5. lexical alias：`child\\..` 与 ADS 表示继续拒绝。
6. short/equivalent alias：底层 realpath 不一致模拟继续拒绝；本机 `GetShortPathName` 返回原长路径，真实 8.3 short path 证据明确记为 `UNAVAILABLE`，未伪造实测。
7. reparse/junction：真实 owned junction 分类为 `REPARSE`；底层解析不一致由生产 `noReparseWith` 拒绝。junction `GOTMPDIR` 对照能复现历史三种错误码。
8. install/instance 重叠：相等、instance 位于 install 内（目录和配置均真实存在）、instance 包含 install 三类均固定拒绝为 `INSTANCE_BINDING_INVALID`。
9. registry/INI 不一致：原反例保留并通过。
10. helper 不在可信 `program`：除改名反例外，新增“名称正确但目录层级错误”拒绝。
11. 非预期 TEMP 表示：固定分类仅为 `CANONICAL/NONLOCAL/INVALID/NONCANONICAL/MISSING/SUBST/ALIAS/REPARSE`；未知异常固定 `INTERNAL` 且 exit 71。空 Go 输出或仅包级 PASS 即使进程 exit 0，也因缺少精确 13 个顶层测试而失败。

## 本地验证

- 固定 Go：`go version go1.27.1 windows/amd64`。
- 实际 `tools/windows-firewall/build.ps1`，`SourceCommit=7e5e7f88425cba125a68e645795a1bca70427681`：exit 0；`testsPass=13`、`testsFail=0`、`testsSkipped=0`、`packagePass=true`、`compileReached=true`、最终 `COMPLETE/PASS`。
- 全量 `go test -json -count=1 ./...`：13 个顶层 PASS、fail0、skip0、包级 PASS；另以长 owned root 成功复现修复前失败机制。
- `go vet ./...`：exit 0。
- `firewall-test-environment.test.ps1`：13/13 PASS；覆盖 subst 根/子路径拼接、规范/lexical/junction 分类、零/包级/多事件/非法 JSON、环境设置与恢复。
- `firewall-build-driver.test.ps1`：5/5 PASS；覆盖零输出 exit0、仅包级 exit0、非法 JSON、已知 fixture 失败和 compile 失败，均验证 exit71、固定 stage/reason 及单行无路径输出。
- `node --test tools/tests/windows-installer/beta3-upgrade/compatibility.test.cjs`：20/20 PASS；旧 workflow 条件和新 D5 只读、分支、模式、Artifact allowlist 门禁通过。
- PowerShell AST：所有新增/修改脚本 0 error；`git diff --check` PASS。
- D5 Artifact allowlist 仅：`stage.json`、`test-environment.json`、`build-driver.json`、`firewall-build.json`；不上传 log、Go JSONL、EXE、ZIP 或原始错误。

## 生产冻结证明

相对 baseline `17aba5da455838d7a20e75e4160f597d291200a0`，以下文件 `git diff` 为空，Git object hash 未变：

- `policy.go`：`794a1ebab564956e2f542a76b5e407c4e612b833`
- `registry_windows.go`：`36aeff8c315a87514db189506b4a96501fc7a403`
- `firewall_windows.go`：`f0ae2da08aebed31638dd72e8e11fe31a1906426`
- `main_windows.go`：`c662dfaa7ffb336a409b94ffcab02f719fe46a45`
- `go.mod`：`0785197975743f0210fd32a7ef4b2cf7d29ae229`

## Local commits

- 实现：`90cdc0febfffc866bfd124081c7c6360e8d943bf` — `test: harden firewall fixture diagnostics [skip ci]`
- 长路径修复：`7e5e7f88425cba125a68e645795a1bca70427681` — `test: handle long firewall test roots [skip ci]`
- 误 amend 产生的 `430ba7840ca459e7f43b12cfcbda7678fc207c57` 不是交付链身份；正式可达链为 `17aba5d -> 90cdc0f -> 7e5e7f8`。

## 风险、未实测与 D5 建议

- 历史 Hosted 输入路径仍未知；D5 的价值是同一安全报告中同时保存输入三类固定分类和已选 owned physical root 结果。
- 本机没有可用真实 8.3 short path；此缺口已显式保留。真实 junction、真实长物理根和真实 build 入口均已测试。
- 未运行 Hosted、Full、QA、Setup、Registry 或 Firewall；未创建发行包，临时 EXE 仅为本任务 owned 测试产物。
- 建议 Master 独立 Review 两个正式提交并在整合后的同一 commit 上，以已注册 `lan-diagnostic-extension` 手动入口运行一次 D5。D5 只执行环境契约、driver 契约及真实 Firewall build/test/compile，不重复 Setup；任何失败先读四个白名单 JSON，禁止无修改 retry。

## 需要 Master 处理

1. 对冻结工作树和正式提交链做独立 diff、长根及 driver 复验。
2. Review 通过后决定是否整合并消费 D5 1/2；Execution 未 dispatch。
3. 只有 D5 证明当前 PORTABLE 阻塞越过后，才按批准链判断 Full 准入；本 RESULT 不构成候选、QA 或 Artifact PASS。
