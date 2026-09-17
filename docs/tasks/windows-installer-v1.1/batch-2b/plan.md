# L2 Plan
1. 已 fetch 并 fast-forward 核对2A最终f4da811，无未提交修改。
2. 最小修改 Launcher 路径、外置实例日志、死后台再次启动处理、身份校验；不改业务。
3. 新增同commit构建/完整性/ZIP/解包工具和P测试，沿用合成PDF及原公共回归。
4. commit+push开发分支；同一次Actions fresh Runtime→绑定Launcher→stage测试→ZIP→新路径复验→Artifact。
5. 下载该Actions完整ZIP做Win10人工验收；不能用本地混合包替代。
6. 报告与交接卡push，停止等上级验收。无需Agent或新工作树；无批量清理。
