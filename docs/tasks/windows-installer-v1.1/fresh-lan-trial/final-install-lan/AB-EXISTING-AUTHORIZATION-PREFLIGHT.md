# 既有授权续行：最终前检

状态：LOCAL BUILD / MASTER REVIEW PASS；仅等待 GitHub Environment 配置。

用户 2026-10-22 明确澄清：本地准入修复后的唯一完整 A/B Candidate 已批准，当前仍 0/1；原独立 QA 0/1 仅完整 Candidate、恢复、产物 PASS 后同一 EXE 使用。这不是新增预算。旧 39732016119、39732017789、原槽位消耗及全部 FAIL/UNKNOWN 不改。上一回单“需要新预算”由本次明确澄清取代，不删除历史文字。

## 已完成

最终构建 Source 3d256a019f99126ac25298955a7ef9bb229eeb07，tree 1bddd0a7f1f89d8ac783bae81e9913e97a3d8a37，codeFP 7f6ee2332152b20b7163c6b0c74d002eb26af37540ec68812a9716a2477b8b97。源码相对4aaf只有治理记录，生产/安全/workflow/来源实现均未改。完整 Runtime/Helper/Launcher/ISCC EXE 真实构建 PASS；EXE 33560012 bytes，SHA256 86e88c250ea9a63b9d8ba6a520d1945417aefcbed7784a80a01659ff65783ecd。Master 独立1049文件/20依赖/Manifest/sidecar/EXE逐字节核验与本地A→B同字节传递及五拒绝反例 PASS，内外Job及环境恢复 PASS。原314/13父49子和Master30+127+146门禁按原受测SHA/codeFP引用，未伪造本轮重跑。旧d822 EXE只作历史。没有执行安装、浏览器业务、26/742、实体LAN或QA。

Master首份旧私有harness以不同工作树字节比较，PAYLOAD阶段FAIL保留；定点证明两个明确ISS编译输入与T2实际文件SHA一致，Git clean过滤后等于冻结source blob，仅CRLF/LF表达不同。改用实际编译checkout完成原样字节Review；没有修改生产源码、EXE或payload检查，没有重新构建。

## 真实能力检查

当前GitHub用户 KG718718（id268517677），仓库admin=true，既有repo/workflow scope；无需用户提供Token或扩大scope。审批历史、pending deployments及完整历史Run/Job真实GET通过；公开无凭据Run/Job/审批读取HTTP200。workflow声明contents:read/actions:read，与官方所需读取权限一致。实际Runner GITHUB_TOKEN尚未签发，具体pending current_user_can_approve和审批POST/取消POST没有执行，不能记为实测PASS。

真实Environment总数0，fresh-ab-exact-run-approval返回404，因此当前保护配置没有成立。没有进行远端写入、审批、取消或触发来试探权限。

## 唯一外部配置

仓库所有者在[Settings → Environments](https://github.com/KG718718/spxt-public/settings/environments)创建 **fresh-ab-exact-run-approval**：

- Required reviewers：仅 **KG718718**（id268517677）。
- **Prevent self-review 不勾选**：触发者与已授权外部Master都使用这个账户，勾选会阻止该Master审批。
- **Allow administrators to bypass configured protection rules 不勾选**，不使用bypass。
- Deployment branches选择Selected branches and tags，仅Branch **codex/lan-fresh-trial-v1.1**。
- 不设置Wait timer，不添加Secrets/Variables或新的Token。Wait timer是延迟，不是审批截止。

这是按本次明确范围给所有者的一次最小配置说明，不请求重复Candidate预算。配置后Master重新读取真实ID/规则/分支与权限，再生成精确来源合同及原模块所需JSON审批comment；普通网页Approve空/任意comment不能满足合同。审批由已获授权且正在监督的外部Master完成，无需用户逐Run手动批准。

## 审批等待及执行边界

从trigger-only push完成起独立计时600秒，每10秒只读核验；审批前重新核验完整历史、唯一Run、source/control/attempt、Environment及pending.current_user_can_approve。用现有master-binding.prepare产生并严格核验精确JSON comment，原生批准后回读审批记录。截止前未获准、API未知、重复Run或身份变化，approve none，调用标准POST /actions/runs/{exactRunId}/cancel；仅取消本次精确control的全部Run，最长120秒确认终态，不能确认则STOP并显式保留UNKNOWN。无重试、不使用QA、无force-cancel冒充恢复。触发前须确认Master在场并具备取消路径，不能无人监督长期等待，Job timeout不充当审批计时。当前没有Run，未实际测试取消。

所有配置及当前门禁PASS后才消耗既有唯一Candidate；A/B两个独立标准Windows Job与同一EXE强绑定，任一必需FAIL/UNKNOWN立即停止，完整PASS才独立QA同EXE。当前没有trigger，没有真实审批comment或占位grant。

接口依据：[Environment配置](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)、[审批与取消REST](https://docs.github.com/en/rest/actions/workflow-runs)、[Environment读取权限](https://docs.github.com/en/rest/deployments/environments#get-an-environment)。
