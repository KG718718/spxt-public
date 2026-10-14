# FRESH-T2 C1 普通工程返工 — RETURN

2026-10-14。状态：LOCAL RETURN / MASTER REVIEW PENDING。本次没有 Hosted / C2 / QA / Diagnostic / 安装 / push。

## 原证据不改写

C1 Run38566205060 attempt1，testedSource76f574cad1ba68f488a406ffa87ef9ebcb0568be，control71ce988199b13a8ab47d4191cae66a2a0e09a087，固定安全 Artifact11896545773。Master 已核验 status FAIL / stage BUILD / reason BUILD_PORTABLE_FAILED，buildDiagnostic LAUNCHER/COMMAND_FAILED；setupSha null、checks空，安装/ISCC/业务未到达，cleanup10/10true。预算由中央管理：Candidate1/3、QA0/1。

原 LAUNCHER phase 覆盖 builder、旧28、package finish、LAN44、payload report，无法区分实际首个失败点。只读取得公开 job115859405357日志（GitHub connector transport失败后使用gh读取，没有运行Actions）；workflow将完整ci输出重定向至私有文件，公开job不含子命令失败信息，Artifact只含固定报告。不能恢复真实首个Go测试名/exit/失败命令，C1具体原因仍 UNKNOWN。私有本地观察文件仅在.test-work保留，不提交/上传。

## 已证缺陷与最小修复

1. 原 Fresh wrapper 的 Runtime dependency guard 将 require.resolve结果与未物理化 NODE_PATH 做词法startsWith。实际本地自建合成 package + owned junction 证明：legacyPrefixAccepted=false，但canonicalSourceMatches=true。该反例证明合法别名表示可导致封装误拒；不能直接证明它触发了C1。
2. Fresh独立 build-payload 对 NODE_PATH先调用已有 Resolve-KSessionFirewallPhysicalPath，并要求 CANONICAL；新增工具侧 runtime-dependency.cjs 校验物理root/实际file一致、Windows目录边界、每段无symlink且file/dir类型正确。越界、相似前缀目录、root及内部新链接一律拒绝；保留仅能从已构建Runtime取得依赖要求，未知不被realpath合法化。仅CLI输出固定PASS或REJECTED，exit23，无路径/raw日志。原standard ci-lan不改，新文件不进入客户38项闭包。
3. Fresh Launcher builder scratch/env使用已物理解析的目录；原standard路径及生产canonical/安全规则不变。本地执行实际PS分支的模拟SUBST反例证明TEMP/TMP/GOTMPDIR/GOCACHE接线一致，未知resolver异常失败。此项是明确测试边界接线，不称C1已复现。早期“Go canonical必定解析SUBST导致拒绝”推断已撤回；Go1.27.1 EvalSymlinks并无该必然关系。本地8.3 alias不可用，未伪称实际alias Go反例PASS。
4. 真实builder新增固定安全phase：LAUNCHER_IDENTITY、LAUNCHER_STANDARD_TESTS、LAUNCHER_FRESH_TESTS、LAUNCHER_COMPILE、LAUNCHER_UNIT、PAYLOAD_ASSEMBLY、LAN_NODE、PAYLOAD_REPORT；原LAUNCHER保留用于历史报告。失败前写COMMAND_FAILED、不吞异常、不变接受谓词、不将准备动作算成功。report/buildDiagnostic严格白名单同步，raw额外字段仍拒绝。

## Node实现证据与推测限制

核对固定Node24.21源码：CommonJS [loader](https://raw.githubusercontent.com/nodejs/node/v24.21.0/lib/internal/modules/cjs/loader.js) 的 tryFile/toRealPath 通过 [helpers](https://raw.githubusercontent.com/nodejs/node/v24.21.0/lib/internal/modules/helpers.js) 调用 fs.realpathSync；[fs.js](https://raw.githubusercontent.com/nodejs/node/v24.21.0/lib/fs.js) 的普通realpathSync为JS walk，而native为binding调用。只有 [uv Windows fs.c](https://raw.githubusercontent.com/nodejs/node/v24.21.0/deps/uv/src/win/fs.c) native路径使用GetFinalPathNameByHandleW。因此不能把本地junction反例直接等同于E SUBST必然变为D的module路径。新物理边界避免这类表示差异，但C1唯一根因未证。

## 本地验证

- Fresh Node118/118 fail0skip0；原beta.4 compatibility20/20 fail0skip0。
- 新3项构建接线反例：实际PS fresh物理目录分支与standard保持、native pwsh -File switch true/false（均正确，未归咎switch传参）、新增失败phase/报告白名单。
- 新3项实际Node依赖反例：旧合法alias拒绝复现；物理化后接受；outside/相似前缀/内部junction拒绝、大小写接受；实际CLI true PASS/outside exit23固定拒绝。
- 实际launcher build.ps1用明确合成minimal fresh manifest/marker、真实Go1.27.1完成原固定28测试、新精确2测试和fresh linker编译，buildInfo fresh marker1。产物只在.test-work，未运行产品EXE，不称真实Runtime identity/payload构建PASS。
- 安装态完整Go overlay仅test-c与vet PASS，未执行安装态测试。CJS syntax、两PS AST parse、diff-check PASS。workflow零改，可沿用Master先前YAML机器解析；不是本轮重新执行YAML parse。
- 固定Node24.21.0从distribution.json官方URL下载，ZIP/EXE双SHA匹配，实际版本v24.21.0；新实际反例3/3、全Fresh118/118及旧compat20/20均fail0skip0。前序24.14验证也保留，最终采用固定版本结果。未安装到global或客户payload。

## RETURN边界

原38客户文件、业务、旧可信身份、生产安全、rollback、Setup接受条件、旧Full/U27/LC01/workflows零改。所有修改只在工具build接线和安全诊断/反例，base为T2 a767d10；T1依赖不重复整合。当前C1FAIL及预算保留，C2只能由Master独立Review后中央决定；本次不执行retry。真实ISCC/安装/26-742/QA均未到达或NOT_RUN，人机物理LAN条件仍HUMAN_PENDING。
