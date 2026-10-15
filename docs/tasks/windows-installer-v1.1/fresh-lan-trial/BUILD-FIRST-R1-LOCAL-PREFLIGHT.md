# R1 — 首轮真实本地构建 / Master独立核验

2026-10-15。原FRESH-T2在bea7原工作树安全合入Master授权cff7feca，无冲突；合并基线a02b76ff051ed277629ad5af831e4ea13a3ac595。C3 de6c2312到a02b76ff的tools、public-lan-network/config、server、package/lock代码diff为空；治理/控制提交不能冒充生产修复。

## 本地已证事实

真实Runtime构建器用固定Node24.21.0及EXE SHA验证，从a02b76ff公开Git blobs派生fresh profile。首轮因7个Runtime工具的本地CRLF与blob不逐字同而被拒；Execution先验证内容仅换行且tracked clean，再使用精确HEAD blob运行，后恢复已知checkout换行。该本机准备问题不是C3根因：Hosted checkout已core.autocrlf=false。

重建真实完整Runtime PASS：20依赖/1044文件/10项构建检查。复用原package.prepare后追加Go/KSESSION许可证成为1046文件，Master独立调用原Runtime verify，完整清单/manifest/依赖/许可证验证PASS，source=a02b76ff，fresh profile，manifest SHA256 379f15be02ea9582be7d54260e9b095377fd62026529d08ec89010cb22e2d719。不同阶段文件数和hash不得混称。

使用真实manifest与实际NodeHash输入原Helper builder：原13测试、Fresh2测试、EXE真实编译成功，内层COMPLETE/PASS且compileReached=true，Execution报告父环境已恢复。真实Launcher builder原28与Fresh2及编译完成，产出实际EXE；不是旧aaaa源/仅2文件合成fixture。

Master对实际helper-first与launcher-first产物分别独立核验PE、长度/SHA、source、GOOS/GOARCH/CGO0、fresh marker、manifest关联、Launcher→Helper hash和两份Fresh2 fail0skip0报告，全部PASS。Helper EXE SHA b1818f3d48186ed874123f4327bed91b4536e09d5e31165f79923f462693313a；Launcher EXE SHA 30e9bff28a2be9db3a4a527f029deeac6c1b4c3b083466d53dcc09b5d7a3f2c4。仅本地构建产物，不是最终Setup或用户包。

## 限制 / 待修边界

C3历史首因仍UNKNOWN；相同源码本机成功不证明Hosted问题消失。可证封装诊断缺口：父build-payload只记录HELPER，丢失原已存在安全内层阶段；Helper内层报告在最终build-info/fresh-policy identity写入之前已记PASS。原Execution继续最小修正安全阶段/恢复边界并实现独立R1 Smoke/预算接线与本地反例。修后源码须再次真实构建及Master独立Review，不能用本次旧脚本结果替代。

本机没有安装/运行产品EXE、改Registry/网络/Firewall/Startup或读取真实业务。新增Hosted仍Smoke0/1、Candidate0/2、独立QA0/1；本记录不授予提前触发或用户试用。
