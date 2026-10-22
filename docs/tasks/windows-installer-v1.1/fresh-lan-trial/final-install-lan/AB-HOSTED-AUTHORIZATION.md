# Final A/B Candidate — 用户唯一 Hosted 授权

2026-10-22，用户明确批准唯一一次完整 A/B Candidate，无需重复审批。Source 固定为 `d8222780953bed685ccd0f4f5a3e82571b9e5bf2`；本地 EXE SHA256 `c781aa2712ef749d4a4572581db52ddb4fba9825b7dc63365cbd8abd34bc7ede` 仅为本地构建参考，实际 Hosted 重建 EXE 须由同一 Run 的 A/B 严格绑定相同 Source、Manifest 和字节身份。

- 仅一个 Run、attempt1、两个独立标准 Windows Job；其他 Hosted0，不 retry，不新增 FC4。
- A 正常 Fresh 优先、F01—F09、安装后业务及26/742；B 五拒绝和同一正式 EXE 原生中途失败恢复。全部门禁保持。
- 当前 Runner 尚未创建；来源、隔离、前态、所有权和恢复前检必须在安装前实时通过。任何 FAIL/UNKNOWN，停止且不进入 QA。不能以本地观察冒充当前 Runner PASS。
- 两 Job completed/success、完整恢复、不可变证据独立聚合及 Artifact 合格后，才可使用原独立 QA 一次，验证同一 EXE，不重新构建。
- 历史 FC1/2/3 FAIL/UNKNOWN 及账本不修改；不 main/tag/Release、内部 SPXT、未知清理、普通 sub-agent。

本次只登记用户已给授权并进行必要最后准入，不修改受审实现。
