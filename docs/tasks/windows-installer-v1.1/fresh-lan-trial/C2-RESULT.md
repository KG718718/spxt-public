# Fresh Trial Candidate C2 — LAUNCHER_UNIT FAIL

Run `38572354045` / attempt1，source `ca8302c32976645a83174d055dc22d1f620e5ea3`，控制 `6483c9108ad3e7c764eba0a262836f0ea428b026`，安全 Artifact `11897209874` / `fresh-trial-safe-failure-38572354045`。Master验证唯一固定fresh-report JSON的白名单/来源/run/mode并保存于公开 `.test-work/fresh-c2-fixed-evidence-38572354045/`；没有客户EXE或成功包上传。

固定结论：FAIL / BUILD / BUILD_PORTABLE_FAILED，buildDiagnostic=LAUNCHER_UNIT / COMMAND_FAILED，script=null、line=null，setupSha=null、checks=[]、setupDiagnostics=[]。全部十项 owned cleanup=true，未触发 Runner 收尾无法证明的停止条件；安装/业务/QA仍未到达。

## 精确调用边界

新固定阶段表明故障在实际 Launcher builder 已返回后的重复单元组/报告辅助：固定policy参数获取 → 原28 Go JSON运行及native pipeline写入 → go-test-report.cjs严格名单解析。尚不能从该报告唯一确定 Go测试失败、参数/环境差异或报告解析失败；不能归咎Node alias。LAUNCHER_IDENTITY/STANDARD_TESTS/FRESH_TESTS/COMPILE的真实builder调用已经返回，但这不是完整客户Runtime/安装认证。

C1原LAUNCHER粗阶段历史及根因UNKNOWN继续保留。C1合法alias的本地封装缺陷修复仍有独立证据，但不得写成它解决了C2。

## 本地返工要求与预算

原FRESH-T2 / bea7 / 原任务分支已收到精确返工卡，只本地构造与该四步相同的执行及恢复环境反例，先验证实际解释器、UTF8/BOM、Go变量恢复、固定28与严格报告，不修改旧测试期望或生产安全。修复和闭合门禁后须再主动RETURN、Master独立Review才允许最后C3；不以笼统FAIL花预算猜。

当前Candidate2/3、FinalQA0/1；旧Full/U27/LC01/Diagnostic0。C3未触发，不能重跑attempt或借QA调试；C3仍未完整通过或QA FAIL即停止。强制安全/资源停止条件继续有效。
