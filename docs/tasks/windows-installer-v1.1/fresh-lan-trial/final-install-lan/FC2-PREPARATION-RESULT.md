# FC2 FINAL PREPARATION — RETURN / LOCAL PASS / HOSTED NOT STARTED

原 FRESH-T2/bea7 本地准备完成。实现 `2fb10516d65b6be07425c63ed796c6a2146b4665`，代码指纹 `78faea128b1f6104e0f01e32513166f7f11f1c8cb1da6301aefabff2592714a6`。Master 独立接口 Review、最终77/root134与唯一同源真实完整 P0 均 PASS。本轮 Hosted0、未 push、未改实际 trigger、未安装产品；执行侧正式 RETURN 并冻结，后续只由原 Master 集成和中央触发。

授权为 `18d408fcf5f72420fd209fc5b569e5af7f7e22a2`，原树核验 tracked clean 后 ff-only 接入。实现 checkpoint `a810eba39ffef19bc170886d37730de6e6ca74bb`；最终三文件事实绑定修正为 `2fb10516`。相对授权基线仅8个来源/测试文件；生产、安装接受条件、业务、安全身份、rollback、workflow、账本及旧证据零改。

## 精确历史例外

只接纳原 FC1 Run39011056474/attempt1、Artifact12092841661、source63e91f986e969b12f0faf5a4fc974f39dc91dcc0、control9fef45f81af4f5d58a3b45fb2ff8da7f25d40076。

原报告 SHA256 `c7459ae5e175f6dc478d3982e2bad7f8888c47515b208657bd1809f62aca9896`；原843字节 ZIP SHA256 `4bcf8c764a2441934e7f37d4efd39ebeb5e9fe83656ce16f1f8259d3a8eab662`。校验实际 API metadata/digest、下载 ZIP 原字节、严格单 JSON 提取后的原 Buffer/hash及完整原失败形状，不重序列化报告作为证据。

旧 FAIL/SOURCE/CLEANUP_UNPROVEN、9项 cleanup=null、10项 recovery=NOT_OBSERVED 原样保留。本例外不证明旧恢复，不追认历史唯一首因。其他 UNKNOWN 历史、锚变异、重跑、slot绕过均拒绝；原 generic firstFailure 的恢复和具体失败要求未放宽。

例外分支直接执行只读 Git：核验新授权、cb2042de 受审修复的实际祖先链；逐 blob 比较19个修复文件和原固定 workflow。不是接纳调用者的“已核验”布尔。当前 Run 的 id/head/title 显式绑定本次 request；旧 Runner referenceRun 必须与 firstFailure API run 完全一致。

## 当前 Runner 与当前安全门禁

依据[GitHub 官方标准 hosted runner 每 Job 新 VM 的说明](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners)（单 CPU runner 除外），结合精确受审的标准 windows-2025 workflow、github-hosted/Windows 环境、可信 API 当前/参考唯一 Job、attempt1、head/label/group及不同 job/run 绑定。不会仅凭 runId 不同判断新 VM，也不要求逻辑 runner_id 必须不同。

运行时独立性证明仅写6个固定布尔，不查询或记录机器路径、PID、hostname、网络或机器指纹。**本地为合成 API 反例，不是实际 FC2 新 Runner 验证。** 必须由真实 FC2 bootstrap 满足全部观察；缺失、矛盾或 UNKNOWN 即拒绝。原 work receipt、物理绑定、隔离、前态、ownership、Supervisor Job和恢复实现逐 blob 不变；它们仍须在当前 Runner 通过，独立性证明不能替代。

## 实际验证与构建身份

| 范围 | 结果及来源 |
| --- | --- |
| 最终接口/CJS | Master 独立2fb：target77/77、root134/134、sourceBound=true；native outer Job自然退出、空Job、句柄/管道收束、无force |
| 原实际 Windows 证明 | Master a810：Supervisor64/Core28、当前前态12反例通过；2fb仅三文件事实绑定增量，19固定PS/Job及前态输入未改，保留原source复用，不冒称2fb重新全跑 |
| 新反例 | 精确命中、每锚/字节/digest/metadata变异、其他UNKNOWN、旧/自托管/VM或Job未知、重复attempt、slot/proof绕过、事实跨Run/矛盾reference及QA改EXE均拒绝 |
| 唯一同源 P0 | 2fb实际 Runtime、Go Helper13/Fresh2（含12场景）、Launcher28/Fresh2、Node44、ISCC及身份核验通过，fail0/skip0；内外Job/环境恢复通过，无产品安装/执行 |
| 字节核验 | Execution与Master分别实际核验EXE/sidecar/sourceTree、manifest、1049实际载荷文件147923786bytes及hash、20依赖、生成ISS、原Setup源码hash、license及原package verifier，全部通过；不是安装后文件验收 |

源码树 `4dacabb5cf911bb132c7eddcf16d2683f6735758`。EXE **33553638 bytes**，SHA256 `0228745a837f9db25238a679df39b033b80b64ad9ae71dd05a8440ac4ed516b5`。本地 EXE 仅构建证据，不交付用户。

- [FC2专属原始P0证明](FC2-LOCAL-BUILD.json)，原字节 SHA256 `1bf12d62db06f2f18a5f663483e3f561470e8a27a77117c6d03c0db59e4da6b3`。
- [本轮构建字节身份](FC2-BUILD-IDENTITY.json)、[本地门禁与来源记录](FC2-PREPARATION-EVIDENCE.json)、[8文件范围](FC2-PREPARATION-FILES.json)。
- [Master实际生成的最终CJS原结果](FC2-MASTER-CJS.json)、[其原生Job原结果](FC2-MASTER-CJS-SCOPE.json)。

proof选择只允许 FC2及候选确为FC2的FQ1使用新 `FC2-LOCAL-BUILD.json`；FC1/原FC1 QA保留旧PROOF。旧 `FINAL-INSTALL-LAN-LOCAL-BUILD.json` 原字节未动，旧cb P0不能冒充新代码同源构建。

开发失败保留：首次6项中1项误把固定布尔字段名当隐私值，随后24项中1项仍断言旧Buffer接线文本，均已实际修正；a810实际反例确认两个矛盾facts可被接纳，2fb已加断言与反例拒绝。未删除旧失败或清理未知资源。完整P0仅本轮唯一一次，未因普通测试判定错误提前消耗Hosted。

## 中央运行前置条件与停点

剩余 FC2 最多1次；仅完整 FC2 PASS 后，原唯一独立 QA 最多1次，必须同一 EXE 原字节。没有新预算、FC3、Smoke、诊断Hosted或retry。用户新授权只允许此精确历史例外；任何当前必需安全/隔离/所有权/前态/恢复 UNKNOWN，或FC2失败、QA失败，仍立即 STOP。

Master最终构建独立字节核验已反馈PASS；来源/proof/祖先/账本及三方 HEAD仍须在集成后核验才中央触发。真实新Runner、Setup、F01—F09、安装后浏览器业务、26/742、完整收尾与Artifact隐私必须由该运行证明；当前均不冒称已验。物理Win10、UAC、实体Private网卡、双设备与登录自启仍 HUMAN_PENDING。不 main/tag/Release、内部SPXT、日常机器安装、真实Firewall/登记写入或未知清理。
