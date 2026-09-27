# Batch 4.5 Acceptance

|ID|核心语义|状态|
|---|---|---|
|L01|private IPv4发现|NOT RUN|
|L02|排除loopback/APIPA/public|NOT RUN|
|L03|排除VPN/virtual/tunnel|NOT RUN|
|L04|单一adapter自动选择|NOT RUN|
|L05|多adapter用户选择|NOT RUN|
|L06|DHCP重算IP|NOT RUN|
|L07|首选8080|NOT RUN|
|L08|8080—8099真实exclusive bind|NOT RUN|
|L09|port持久化|NOT RUN|
|L10|持久端口冲突fail|NOT RUN|
|L11|不静默换port|NOT RUN|
|L12|Hostname展示|NOT RUN|
|L13|Adapter/IP/Subnet展示|NOT RUN|
|L14|Local URL|NOT RUN|
|L15|LAN URL|NOT RUN|
|L16|Copy LAN URL|NOT RUN|
|L17|Host-only Admin bootstrap|NOT RUN|
|L18|Remote不能抢首Admin|NOT RUN|
|L19|Admin后LAN登录|NOT RUN|
|L20|selected subnet guard|NOT RUN|
|L21|非LAN来源拒绝|NOT RUN|
|L22|Firewall Private/LocalSubnet|NOT RUN|
|L23|拒绝Firewall授权Local正常|NOT RUN / HUMAN REQUIRED|
|L24|Host LAN self-health|NOT RUN|
|L25|第二设备真实LAN访问|NOT RUN / HUMAN REQUIRED|
|L26|双客户端Session隔离|NOT RUN|
|L27|Host重启/IP变化/LAN恢复|NOT RUN / HUMAN REQUIRED|
|L28|升级/卸载/重装保留instance及LAN配置|NOT RUN|

适用自动项之外，真实Win10+第二设备14步必须单独人工；Host self-test不等于第二设备可达。所有安全门禁、26/742 fail0 skip0、Runtime/Launcher/Portable/Setup、Batch4回归、Firewall/网络安全、privacy和独立QA必须具备实际证据。旧Batch通过不能代填本Batch。

## 方案A兼容矩阵

|ID|核心语义|状态|
|---|---|---|
|C01|受验F3 beta.2精确身份接受|NOT RUN|
|C02|未知beta.2拒绝|NOT RUN|
|C03|同版本号hash不同拒绝|NOT RUN|
|C04|同source但build identity不同拒绝|NOT RUN|
|C05|beta.1直接beta.3拒绝|NOT RUN|
|C06|beta.3 same-version拒绝|NOT RUN|
|C07|beta.3 downgrade保护|NOT RUN|
|C08|beta.2→beta.3 instance保持|NOT RUN|
|C09|原账号保持|NOT RUN|
|C10|原附件保持|NOT RUN|
|C11|LAN deployment config保持|NOT RUN|
|C12|port/adapter preference保持|NOT RUN|
|C13|升级失败rollback保持beta.2|NOT RUN|
|C14|身份验证不依赖Artifact在线|NOT RUN|
|C15|日志/Artifact无secret和业务正文|NOT RUN|

## 当前证据层级与止损

专项4 Run36288039798失败PORTABLE；上表NOT RUN表示完整候选/真实环境验收尚未闭合，不否定各任务RESULT中的局部合成测试。Master局部T1 18/18、T2 13/13、统一LAN Node37/37、Launcher最终overlay27/27+vet、T4 13顶层29子反例+vet、兼容wrapper44/44均有各自来源证据；不能拼接宣称整个集成候选PASS。最终L01—L28/C01—C15、26/742、Setup/升级/真实Firewall及最终独立QA仍未完成。安全阶段JSON的privacy PASS不能替代最终EXE/Artifact隐私审查。


Full2止损更新：Run36294405341失败HOSTED_LAN，整体表格仍未闭合。实际阶段事实为Portable门禁/37项LAN/45兼容通过；冻结旧回归110PASS/1SKIP。Setup仅编译，无实际U22/U23/Registry/Firewall/26套742及最终QA证据。3JSON privacy PASS仅针对失败报告。无最终候选Artifact，不进入人工验收；详见HOSTED-STOPLOSS-FULL2-20260927.md。
