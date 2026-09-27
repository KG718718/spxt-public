# Batch 4.5 — Utility 修复后 P02 仍失败：网页版决策卡

## 当前事实

获批的生产修改仅为 `WINDOWS_DISCOVERY_SCRIPT` 开头显式导入系统 Utility；F01—F12 12/12、Master Review、公开分支非 force 推送均完成。真实 Win10 Pro x64 build19045 上唯一一次 P01—P08 proof 受测公开 commit `bcf82b29a0ac322fb17f595fb428c3ea692fac99`，固定结果 P01 PASS、P02 FAIL / `DISCOVERY_COMMAND_FAILED`，P03—P08 NOT_REACHED。证据已经固定，不能将 `privateCandidatePresent=false` 解读为无私网候选。原 T5 已冻结；Final Full 0/1、Final QA 0/1 未用。

## 技术约束

M03 只证明显式 Utility 导入后**最小** `ConvertTo-Json` 进程按现有规则干净，不能证明完整脚本所有 `Get-Net*` 及结果包装。新 P02 失败仍是封闭的整条生产命令拒绝，未证明唯一底层原因；不得据此猜测性导入 NetTCPIP/NetAdapter、忽略 stderr、接受 Public/virtual/VPN 或改变产品 LAN 安全模型。唯一实机 proof 和 PowerShell 微诊断额度已按本轮规则结束；不能转用 Full/QA 作诊断。

## 可选方向及影响

**A｜维持冻结。** 保留当前公开开发分支的一行受控改动与失败证据，不宣称 LAN Host 可用；无新增成本，Batch 4.5 继续 BLOCKED。

**B｜单独批准新的生产网络发现技术路线评审。** 先只比较保留 PowerShell 但重新定义封闭成功协议、采用更明确的只读 Windows 系统接口，以及继续冻结；要求逐项说明 Win10/Win11、非管理员运行、Private/virtual/VPN/selected subnet 边界、失败闭合、权限和数据隐私，再由网页版选择实际实现范围与验证预算。此方向会触及产品架构和安全边界，**本卡不授权实施或新增实机/Hosted 探针**。

## 需要网页版决定

选择 A 继续冻结，或另行批准 B 的**只读方案评审**及其交付范围。若未来选择实施新技术路线，须另有明确产品/安全与测试预算决定。当前不得继续 T5、P01—P08、Final Full、QA、Batch5、OCR、main、tag 或 Release。
