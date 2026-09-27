# Batch 4.5 — Win10 discovery stderr 止损记录｜2026-09-27

**BLOCKED — PRODUCTION DISCOVERY STDERR SOURCE UNRESOLVED。** 完整第0—31节获批本地诊断已执行完毕；不是P02 PASS。唯一Master `01a0db0e-c950-79e0-8e11-07155e0742f2`，原T5 `01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9` 再次冻结；Primary `public-source`，集成 `codex/lan-host-v1.1`。旧Master仅只读历史。

## 可复核事实

真实Windows 10 Pro x64 build19045、原生产 `public-lan-network.js` blob `4e13e944472f845675fe73d176f063c4fe97f6ed` 未改变。历史P01安全系统PowerShell PASS，P02原生产 `NETWORK_DISCOVERY_FAILED`；P03—P08仍NOT REACHED。首次真实完整命令与本次唯一完整复核：`processResultPresent=true, spawnError=false, timedOut=false, exitZero=true, signalPresent=false, stderrEmpty=false, stdoutPresent=true, jsonParseable=true`，固定 `STDERR_NONEMPTY`。条件性N01—N05各一次均 `FAIL/STDERR_NONEMPTY`。直接拒绝条件已定位；stderr底层来源未定位，也没有证据证明其为无害输出。不能把 Hosted H1/H2 与本机失败假定为同一底层根因。

原T5本地合成分类 `4f77a8e`/`800c1e2` 经Master12/12 Review整合 `1fb36ae`/`13f483f`；真实只读诊断 `285b9c2` 经Master证据、隐私、代码范围及14/14合成复验Review整合 `35f4b3de965b97570e9139d5ac9f92ed8ed50c07`。固定原始证据仅 `evidence/discovery-spawn-live.json` 和 `evidence/discovery-probes-live.json`；没有stdout/stderr、网络身份、路径或其hash/长度。生产代码、Windows网络、Firewall、Registry、Service、Policy均未改。

## 额度与停止条件

历史Hosted H1/H2 2/2；不新增H3/H4或等价诊断。Final Full 0/1、Final QA Hosted 0/1未使用，也不得移作discovery调试。没有beta.3最终Candidate Artifact；真实企业LAN双设备人工验收尚未开始。附加8.3环境能力项只有双环境确实不可用才可记 `ENVIRONMENT_CAPABILITY_NOT_AVAILABLE`，不是PASS；核心26/742仍须fail0skip0。本次本地“首次+唯一复核+N01—N05”额度已完毕，禁止无新授权再次执行或以合成PASS代替P02。不能直接修改生产以忽略stderr；后续若需新定点诊断，必须先获批准的隐私安全边界。若需要管理员权限、放宽安全规则或改变发现架构，须单独网页版产品/架构决策。无进一步安全恢复路径获批前，Batch 4.5 停止。
