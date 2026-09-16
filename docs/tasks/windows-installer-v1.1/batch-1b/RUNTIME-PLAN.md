# Batch 1B — Runtime Closure Implementation Plan

日期：2026-09-16。状态：设计交付，等待架构验收；所有下述构建动作均为未来计划，本轮不执行。

## 1. 意图、授权与事实基线

用户正式任务书批准 Batch 1A 的方向：私有 Node x64 + 原有应用 + 构建阶段完整生产 node_modules + 后续 Setup.exe；保留 Node 后端、HTML/CSS/JS、外部默认浏览器；不采用 Electron、Node SEA、用户安装 Node/npm 或用户端 npm install。

仅 KG718718/spxt-public，现分支 codex/windows-installer-v1.1，HEAD 49b3e35c68468b3c61e3ad19ed379ce057d17886。v1.0.0/main 84cbb324a4f63bef094d2c21d70eba841205a7a7 冻结。Batch 1A 未提交文档原样保留；本轮只新增设计和更新阶段索引，无提交、推送或其他外部写操作。

本轮沿用 L2：已确认 Intent 为上述架构的实施设计；本文件承载详细 Spec/Plan，[DEPENDENCY-CLOSURE.md](DEPENDENCY-CLOSURE.md) 承载资源规格，[VALIDATION-PLAN.md](VALIDATION-PLAN.md) 承载 Acceptance。复用 Batch 1A 四文档作为上游，不另造一套重复架构。

现有证据：tools/package-manifest.json 的 32 个应用文件；package.json/package-lock.json 的精确依赖；tools/installer/distribution.json 的 Node 版本/来源/哈希；installer.js 的用户端 npm ci；install-common.js 的旧清单校验。后两者不能直接接收新的 Runtime 包，不在本轮修改。

## 2. 未来 Runtime Package 结构

这是供 Launcher/Setup 消费的内部构建 artifact，不是普通用户安装包。示意名称 K-SESSION-runtime-<appVersion>-win-x64-<commit12>.zip；不复用 v1.0.0 原 ZIP 名称，不冒称 Setup.exe。

```text
KSESSION-RUNTIME/
├── runtime/
│   ├── node.exe
│   └── <经证明必要且获准再分发的官方运行资源>
├── app/
│   ├── server.js 与既有业务 JS（相对位置不变）
│   ├── admin.html / approval.html / debt.html / invoice.html / login.html
│   ├── k-session-theme.css
│   ├── package.json / package-lock.json / LICENSE / THIRD_PARTY_NOTICES.md
│   ├── tools/ocr/ocr_invoice.py 与 requirements.txt（仅源码）
│   └── node_modules/<Windows x64 生产闭包，保留包内资源位置>
├── manifest/
│   ├── runtime-manifest.json
│   └── dependencies.json
├── licenses/
│   ├── node/LICENSE
│   ├── npm-packages/<组件原始许可证与 NOTICE>
│   └── native/<实际二进制附带组件的适用声明>
└── hashes/
    └── SHA256SUMS.txt
```

- app 的 32 个基础文件来自明确公开 commit 中的 tools/package-manifest.json 允许清单，保持路径和字节；不得改成笼统的 html/css/js 新目录，否则静态资源和 require 路径会变化。
- runtime 来源为精确版本 Node 官方 Windows x64 归档；必要伴随文件经过原生检查决定，不预先宣称 node.exe 单文件足够。npm CLI、npm cache、开发头文件不作为用户运行依赖。
- app/node_modules 来自独立 Windows x64 构建区内的锁定 npm ci，不是开发机或业务实例拷贝。
- manifest、hashes 和许可证索引由未来构建器生成；许可证原文来自实际组件，不自行编造版权声明。
- PDF 的资源留在上游包原位置，不另建空 resources 目录并误称资源已齐。
- **不含 launcher/**：Batch 2 尚未生成 Launcher。Manifest 明确 launcherIncluded=false，后续组合发布时另立安装器组合清单，不能向已经固定哈希的 Runtime ZIP 直接追加文件。
- **不含 instance/**、用户配置、账号或空白 data.json。首次 Admin 仍由原应用在显式的可写实例目录安全创建。
- OCR 两个既有源码文件继续保留，避免改变 32 文件边界；不包含 Python、Paddle、模型、下载工具或 OCR 安装动作，不代表 OCR 已就绪。

程序安装位置、Launcher 技术、可写 instance 的最终物理路径仍属于后续阶段；本包只定义相对布局，不写死开发机路径、Program Files 或用户目录。

## 3. 构建环境与生产依赖准备

未来构建执行在单独、已批准的 Windows x64 环境，使用新的隔离工作区。构建工具、npm cache、验证夹具和报告放在 Runtime staging 之外；生产依赖绝不提交到源码仓库。

优先复核现行 Node 24.21.0；只在官方精确版本、哈希、安全状态和系统支持检查通过后锁定实现输入，不使用 latest/24.x 浮动下载。构建 npm 版本必须与所选 Node 归档实际带的 npm 版本一致并精确登记，本轮未运行 npm，不捏造锁定值。需要升级时先报告，不能修改 package-lock 来绕过。

未来生产依赖安装参数基线为 npm ci --omit=dev --include=optional --ignore-scripts；同时指定官方 registry、strict SSL、构建专用 cache 和空白 user/global npmrc。该命令仅写在计划中，本轮没有执行。禁止传入开发机 npm 配置、凭据或影响安装结果的未审核环境变量；明确安装链接/可执行 shim 策略并记入构建来源。

禁用生命周期脚本后有组件不可用时，应先分析预编译分发与必要文件；不得临时全开脚本或转向用户电脑编译。

## 4. Build Pipeline：输入、输出、失败条件

| 阶段 | 输入 | 输出 | 必须失败的条件 |
| --- | --- | --- | --- |
| P0 固定来源 | 获批公开 commit、干净构建区 | commit/tree、文件清单、工作区状态 | 来源不符、未提交业务改动、外部子模块/链接或混入实例 |
| P1 固定平台 | 已批准 Windows x64 runner/镜像 | OS build、arch、工具链身份 | 非 x64、环境无法隔离、工具版本不确定 |
| P2 获取官方 Node | 精确官方 HTTPS URL、预期归档与 exe 哈希 | 构建区官方归档、Node/npm 版本记录 | 重定向来源不在允许范围、校验不符、未知签名/来源问题或安全审查未过 |
| P3 检查锁与清单 | package.json、v3 lock、32 文件允许清单 | source hashes、生产/开发/平台排除清单 | manifest/lock 不一致、非批准 registry/git/file 依赖、缺 integrity、修改锁文件才可安装 |
| P4 准备生产依赖 | P2 工具、P3 lock、隔离 npm 配置 | 构建区完整生产 node_modules | npm ci 失败、额外包、缺 23 项候选之一、原生组件缺失；即使 npm exit=0 也要二次核对 |
| P5 组装新 staging | 允许应用文件、生产依赖、Node runtime | KSESSION-RUNTIME 初始内容 | 目的地已存在、复制越界/重解析点、业务文件字节被改、夹带配置/缓存 |
| P6 原生/资源/许可证 | 实际 staging 文件及组件来源 | 依赖清单、原生检查表、原始声明 | 未解决 DLL、资源缺失、许可证无法确认或平台错误 |
| P7 生成清单与哈希 | 已封闭的 staging、来源身份 | manifest、dependencies、SHA256SUMS | 文件集不闭合、路径冲突、遗漏文件、元数据与实际不一致 |
| P8 冷态内容检查 | P7 包目录、受信来源 | 完整性/零数据/排除检查报告 | 任一允许/排除/哈希门禁失败 |
| P9 Runtime 验证 | 仅 staging + 外置合成夹具 + 干净目标机 | 本机回环、无外网的核心验证证据 | 依赖构建机 PATH/cache、实际模块/HTTP/PDF/XLSX/恢复失败或偷偷下载 |
| P10 归档与解包复验 | 已验证且再次确认未变的 staging | 不同名 Runtime ZIP、外置归档 SHA256、验证报告 | 归档遗漏/额外文件、解包字节不同、解包后不能运行或原 artifact 被覆盖 |

验证在包外写数据；验证后重新计算 staging 清单，确保测试没有污染发行物。候选构建只能产出带具体 source commit 的新 artifact，不自动创建 Release、改 tag 或替换 v1.0.0。

源码取件使用明确字节策略：干净 checkout 固定行尾策略，记录 Git tree 与包内文件 SHA256；Windows 工作副本的 CRLF 大小/哈希不能冒充 Git blob 字节。两次构建是否字节可复现需另行实证；固定版本不等于天然可复现。

## 5. Runtime Manifest 设计（待实施的协议）

使用独立 format=k-session-runtime、manifestSchema=1，不复用旧 core-only manifest 解析器。业务 instanceSchema 单独沿用事实值 1；分发格式变化不能擅自递增业务 schema。

| 字段 | 语义与约束 |
| --- | --- |
| product / version | K-SESSION；公开源码应用版本，必须与实际 package.json 一致，不假填未来 1.1.0 |
| format / manifestSchema | 新 Runtime 协议及版本；未知协议拒绝 |
| platform | os=win32、arch=x64；最低受测系统要求引用验收矩阵，不猜测 |
| source.repository / commit / tree / gitObjectFormat | 固定公开仓库、完整 commit、Git 根 tree 标识及对象算法；tree 不是安装文件 SHA256 |
| node.version / archiveUrl / archiveSha256 / executablePath / executableSha256 | 精确官方 Node 身份与包内 node.exe 字节哈希 |
| build.npmVersion / environment / dependencyFlags | 构建实际 npm、Windows/工具标识、锁定参数；不写机器用户名、绝对路径或 secrets |
| packageLock.path / sha256 | app/package-lock.json 原样字节 SHA256 |
| dependenciesManifest | manifest/dependencies.json 的路径及 SHA256；含名称、版本、来源/integrity、平台、用途、包内位置与许可证来源 |
| files[] | 包内相对路径、字节数、SHA256、所属组件；排序且大小写无冲突 |
| licenses[] | 组件、版本、声明/许可标识、原始许可文件路径及 SHA256、原生分发审查状态 |
| instanceSchema / runtimeIncluded / businessDataIncluded | 分别为独立业务 schema、true、false；不含实例数据 |
| launcherIncluded / ocrEngineIncluded | 本 Runtime 阶段均为 false；OCR 源码存在不等于引擎包含 |
| entrypoint / instanceContract | app/server.js、相对工作目录及现有 KSESSION 路径注入接口；不含私有配置值 |

### 哈希无循环规则

1. runtime-manifest.json 的 files 覆盖所有发行 payload（runtime、app、licenses、dependencies.json），排除自身以及 hashes/SHA256SUMS.txt。
2. SHA256SUMS.txt 记录 manifest 与所有 payload 哈希，不包含自己的哈希。
3. 整个 ZIP 的哈希在 ZIP **外部**的同名 .sha256 sidecar 中，不能把整个 ZIP 的自哈希塞进 ZIP。
4. 验证器要求完整路径集合等于 payload 清单加上述两个元数据文件；禁止靠排除规则掩盖额外文件。路径以包根为界，拒绝绝对路径、父路径、Windows 保留名、ADS、大小写重名和重解析点。
5. 哈希只证明字节一致。上游身份、可信预期哈希、签名/证据来源仍需独立校验；不能同时相信待验证包提供的文件与哈希就声称防恶意篡改。

### 三类消费场景

- 启动校验：Batch 2 消费指定 schema，校验 Node、app、依赖和资源后才启动，不能自行联网修复缺件。
- 升级判断：Batch 3/4 比较产品、平台、协议、应用版本、instanceSchema 和完整发行身份；相同 instanceSchema 只是必要条件，不证明迁移和回退安全。旧版不同格式进入专门识别流程，不覆盖旧版本。
- 问题诊断：输出公开 commit、组件版本和具体缺件/哈希差异；不记录 Token、SMTP 密文正文或用户业务内容。

## 6. 未来实现文件与边界（候选清单，不创建）

建议另立 tools/windows-runtime/ 下构建器、独立 manifest 验证器、生产依赖/许可收集器及 Native 检查器，以及 tools/tests/ 下专用合成验证工具；具体文件名和 CI 接入需后续 Build Plan 批准。

现有 tools/package-manifest.json 可只读复用 32 文件输入；不能修改旧校验器，让它误接受“离线已含 Runtime”的新包。现有 tools/check-public-licenses.js 遍历完整 lock，对省略的非 optional 开发依赖会报缺失；需要生产图专用的收集契约，不能为让它通过而把 playwright 装进生产包。

本轮不新增任何 JS/CMD/JSON/YAML 文件，不改现有源码、锁文件、Install/Start 或测试实现；后续若需这些修改，应给出精确范围重新批准。

## 7. 包大小估算与容量门禁

已测事实：当前本地公开工作副本的 32 个允许应用文件合计 1,460,855 字节，约 1.39 MiB；行尾会影响该数值。这不是 Runtime 包大小。

**工程容量预算，非实际测量或发行承诺**：私有 Node 与必要文件预留 80–120 MiB；完整生产依赖/原生/PDF 资源预留 60–230 MiB；源码/许可/清单预留 2–15 MiB。按宽松整包预算预计未压缩约 150–400 MiB，压缩 artifact 约 50–180 MiB。压缩率与最终资源未验证，可能超出；不承诺仅几十 MB。

未来记录实际压缩/展开字节、文件数、最大文件、Node/npm/PDF/native 分项及安装/回滚/临时解压峰值磁盘需求。超预算需解释来源与必要性；不得通过删 PDF/许可证/原生文件或恢复在线下载来满足大小数字。OCR 不计入本次估算；Setup/Launcher 体积尚未计入。

## 8. 停止门禁

本轮仅设计完成，不能据此进入 Batch 2 实现。任何 Node 版本/来源不能固定、闭包无法闭合、原生 DLL 或 PDF 资源缺失、许可证不确定、断网不能启动、Windows x64 不可运行、实例污染/覆盖风险未解决时，均禁止放行后续 Launcher 集成实现。

完整准入矩阵见 [VALIDATION-PLAN.md](VALIDATION-PLAN.md)。本计划获验收之后仍须另行授权 Runtime 实施；不能直接跳过 Runtime 实现和核心验证进入 Batch 2。
