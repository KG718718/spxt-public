# Batch 1C — 验证报告

## Batch 1C-R2 当前验证｜2026-09-16

**审计证据检查通过，不代表Batch通过。Batch1C-R2=BLOCKED，删除条件D不成立。**

| 检查 | 本轮结论 |
| --- | --- |
| R1暂存范围与diff-check | 10文件MD/CJS，未包含运行/审计原始产物、实例或凭据；检查通过，checkpoint2aeaa40已推指定分支 |
| 静态审计 | 135文件、32应用allowlist、业务/安装/测试/构建/包声明分类及动态调用点检查完成 |
| fresh npm ci | exit0，23包；新的E盘cache/temp/安装目录，未复用旧node_modules |
| npm ls / explain | 均exit0；有独立pdfjs-dist → optional canvas路径 |
| 磁盘依赖对lock | 包路径与版本逐项相同；非Windows平台包/dev依赖未安装 |
| 实际pdfjs import trace | 原包入口加载Canvas及skia.node，无pdf-parse加载；白名单环境再验结果同hash |
| 安装/探针零业务修改 | 两个包文件hash不变；1,131依赖文件前后hash不变；32应用对HEAD及冻结main零差异 |
| 外置助手语法 | dependency-audit、pdfjs-import-probe、verify-dependency-audit三个CJS通过 |
| 最终Git范围/空白/敏感模式检查 | 仅R2八份文档变动，暂存区为空；通过（LF/CRLF提示非错误） |
| 删除后完整业务及PDF普通/中文/多页回归 | **NOT RUN**，未满足删除准入，不存在删除后的候选 |
| 上传/Excel/初始化/登录/备份/host-smoke新回归 | **NOT RUN**；原12项为前轮历史，不借用其PASS |
| 新Runtime、ZIP、fresh解包 | **NOT RUN** |
| 干净Win11离线/浏览器G1 | **NOT RUN**；本机Win10开发环境不能替代 |

外置verification.json记录输入hash、模块trace、目录零写入和证据hash；不是测试实例。没有创建业务账号/数据或启动应用服务，没有改网络/ACL、删除旧输出或放松原native gate。R1的75项证据检查和29/14项守卫结果仅保留历史，本轮不伪报重跑。

## Batch 1C-R1 复核｜2026-09-16

本轮29项runtime-guards复跑PASS；14项合成完整性反例在新建integrity-r1目录PASS；native-evidence.test.cjs **75项PASS**。后者是来源/hash/身份/缺项的一致性校验，不是许可PASS；npm attestations只解码检查对应关系，未进行签名验证。

最终9个CJS语法检查与build.ps1语法解析通过；tracked与4个新增文件diff空白检查通过（首次发现新报告末尾空行，已修正复查）。32个应用白名单文件相对冻结main差异为0。新增/修改文件敏感凭据模式未命中；未更改Git行尾配置，LF/CRLF提示保留。

证据收集54份成功、2个404（Cargo.lock及探查jconfig.h.in），均原样记录。没有删除失败记录或用“收集完成”替代组件闭包。sources.json/native-review-check.json及原文保存在源码外native-license-r1-02；报告列全URL、revision和SHA。

旧Runtime完整性复验：1199文件、manifest SHA256 `0c9967b54b219a26d484beb16f2b194c1f8659875c2f76dbc7a8e5076e8b101c` 不变；distribution仍BLOCKED-native-license。没有生成/解压Runtime ZIP，不得称ZIP复验PASS。

本机Win32_OperatingSystem只读核验为Windows10专业版10.0.19045/build19045/x64，不满足干净Win11要求。**G1 ENVIRONMENT BLOCKED**；详见[G1准备说明](G1-ENVIRONMENT-REQUIREMENTS.md)，22项正式用例本轮均未执行，无真实浏览器截图。未改网络/ACL，未创建VM，未启动应用服务。

下列原12项功能诊断是历史结果，本轮未重跑。未用旧截图/CI/PATH隔离冒充新G1。原业务测试未复跑（未改业务代码）。最终技术状态仍为FAIL，原因是native distribution evidence incomplete；不是仅因测试环境不足而报告BLOCKED。

## 以下为初次1C验证记录

**正式 G1 未通过验收门禁。** 下列 PASS 仅描述 Windows 10 开发机构建/隔离诊断，不能替代 Windows 11 x64 干净机、真实浏览器及离线证明。

## 环境与隔离

实际 OS：Windows 10 专业版 x64 10.0.19045。开发机存在 Node/npm/Git，且有 WindowsApps Python别名（未运行，不据此判断Python是否完整安装）。构建/被测子进程采用环境白名单；被测应用使用包内Node，包内require/import路径实测一致，不依赖系统Node/Python/npm来运行这些已测路径。

未卸载开发工具，未改变网络/防火墙，未创建VM，未把PATH清理包装成干净机器。外网未被阻断，所以不存在“完整离线测试通过”的证据。服务只绑定127.0.0.1和自动分配端口；不用既有端口或真实账号数据；测试结束停止自己创建的子进程。

所有运行状态经现有 KSESSION_* 接口指向包外中文/空格路径；邮件禁用、dry-run，OCR Python指向不存在的隔离路径。没有修改业务入口。程序目录使用前后均重新验证完整哈希一致；没有执行ACL只读/非管理员身份验证，不能用“本次没写程序目录”冒充它们。

## 防护测试

- 失败优先：新 guards 测试先在 common.cjs 不存在时失败；实现后29项通过。覆盖路径越界/Windows保留名、锁定官方依赖、禁止链接、错误PE、原生许可未核准拒绝出包、清除敏感/开发变量。
- 合成完整性反例14项通过：篡改、缺失/额外文件、hash文件损坏、未知schema、错误平台、业务数据/Launcher/OCR混入标记、重复条目、路径越界、Node身份不符，以及清单包含data.json仍拒绝。
- 反例仅修改新建的明确合成目录 `integrity-01/`，不修改实际Runtime暂存目录。
- 新增7个CJS均通过Node语法检查，build.ps1通过PowerShell语法解析。Git diff空白检查通过；既有LF/CRLF提示不等于源码变更。

## 对应 Batch 1C V01—V10

| 项目 | Windows 10开发机诊断 | 正式G1限制 |
| --- | --- | --- |
| V01完整性 | 1,199文件完整集合/哈希通过，测试后再次通过 | 未对ZIP解包后测试；ZIP未生成 |
| V02包内Node | 实际v24.21.0 x64及指定进程路径通过 | 非干净Win11 |
| V03服务 | 原server在隔离回环端口就绪 | 未验证外网阻断和非管理员权限 |
| V04浏览器 | HTTP登录页面返回200，含首次初始化表单 | **没有实际浏览器测试或截图** |
| V05首次Admin | 原API创建一个合成Admin，业务表全空，重复初始化409 | API证据，不冒充UI |
| V06登录 | 原API正常认证；会话仅内存使用，不输出Token | 未做浏览器操作 |
| V07PDF | 包内pdfjs、PDFParse均解析合成英文文本 | 不是发票页面端到端；中文/多页/复杂字体/CMap分支未验 |
| V08Excel | 原Admin导出API生成合法XLSX，ZIP结构含合成账号，未调用Office | 未人工打开Excel；无真实数据 |
| V09上传 | 原员工API上传中文PDF，名称及持久字节一致；Admin同操作403 | 沿用原角色权限；UI/授权下载尚未覆盖 |
| V10备份 | 原Admin结构化数据备份API成功，落盘SHA及用户一致 | 不等于全量附件/密钥/程序恢复，完整副本恢复未执行 |

另外：重启保留首次Admin、初始化入口关闭、旧会话失效和重新登录通过；验证前后程序包哈希不变。**host-smoke-02 合计12项通过，0失败，g1=NOT SATISFIED。**

## 如实保留的失败记录

1. 第一次构建的 busboy 缺少锁文件 license 元数据引发收集器误报；包本身附带MIT。修正新构建器条件，第二次 fresh npm ci 后通过包级许可收集，既有业务及锁文件未改。
2. 第二次构建退出1：`Native license gate: review and exact component evidence required; no ZIP generated`。未解除该门禁。
3. `host-smoke-01` 前8项完成，上传以Admin执行返回403，中断；finally完整性验证也完成，共9项通过。查明原server标准员工写入路径限定role=user，是测试角色错误，不是改业务的理由。第二轮通过原Admin API创建包外合成员工，用其上传；保留Admin403反例。所有12项通过。

## 证据位置和缺项

E盘项目输出区 `output/windows-installer-v1.1/batch-1c/`，不在公开源码或Runtime包内：

- `build-01/build-report.json`：第一次失败。
- `build-02/build-report.json`、`modules.json`、`npm-ci.log`：构建与原生/PDF加载证据。
- `host-smoke-01/host-smoke.json`、`server.log`：原始403失败及服务日志。
- `host-smoke-02/host-smoke.json`、`server.log`、`synthetic-export.xlsx`：第二轮成功的开发机诊断。
- `host-smoke-02/合成实例 with spaces/`：仅合成账号/附件/备份，不进入Git、不作为默认数据。
- `integrity-01/report.json`：14项合成反例。

无截图：没有伪用旧图或API响应充当浏览器截图。没有清理任何运行材料；诊断服务均已停止。本次未运行原仓库全套业务回归（无业务修改），未运行OCR/LAN/邮件真实投递/安装/升级/卸载测试。

正式结论是 **Batch 1C FAIL（许可和目标环境门禁未满足）**，不是“仅文档待补”的PASS。下一次仍在Batch 1C补齐原生许可、ZIP实产实验、干净Win11完整G1，并提供对应同一artifact哈希的真实浏览器证据。
# Batch 1C-R5 验证增量｜2026-09-16

**未通过完整门禁，不生成ZIP。** 原公开26套全部尝试：首轮23成功；full-browser启动超时后复验21项通过；product-docs边界描述禁词在R4原Git基线也失败，同义文档修正后8项通过。当前25/26套完成，startup-filesystem14项通过后Windows创建文件符号链接EPERM，其后反例未执行。未放宽测试、未改业务/权限规则、未提升系统权限。

同R3/R4原字节8PDF三轮24/24；执行实际server提取函数，文字/transform/页数与R4一致，native/canvas/Skia/网络尝试0，目录hash前后相同；扫描空文本正确。另故意损坏文件后连续与并发正常。真实旧函数的非嵌入中文因未配CMap为空，新版已恢复；其他7类输出一致。固定generic提示保留，损坏样本Indexing提示不冒充正常样本warning。

40项Runtime守卫和14项合成完整性、语法/diff检查通过。新Runtime/包内Node smoke/最终license/ZIP/解包与Win11 G1均未执行；不能据依赖暂存或源码测试宣称它们通过。完整原始记录见源码外migration-r5-01及PDF-MIGRATION-RESULT.md。

以下保留以前阶段的验证记录，不覆盖上述状态。
