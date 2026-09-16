# Batch 1A — Windows x64 Runtime 架构决策草案

状态：**推荐方案，待上级评审；尚未批准实施**。日期：2026-09-16。

范围与授权见 [intent.md](intent.md)。下文路径均为公开仓库相对路径或拟议包内路径，不是现有安装包新增内容。

## 1. 已确认事实与证据

源码基线 49b3e35c68468b3c61e3ad19ed379ce057d17886；该提交仅比冻结 main 增加 Batch 0 文档，运行代码相同。

| 事实 | 公开源码证据 |
| --- | --- |
| Node 原生服务，HTML/CSS 页面经后端提供；浏览器为外部程序 | server.js 的 HTTP 服务及静态文件处理；tools/installer/launcher.js 的子进程和浏览器启动 |
| package.json 要求 Node 24.x，旧安装流程精确锁定 24.21.0 | package.json；tools/installer/Install.cmd、installer.js、launcher.js |
| 用户安装阶段执行 npm ci --omit=dev --ignore-scripts | tools/installer/installer.js:34–41 |
| 程序版本、runtime、instance 已逻辑分离，但都在同一个安装根目录 | tools/installer/installer.js:20–47；launcher.js:8–27 |
| 旧升级拒绝不同 launcher 文件、不同 Node 哈希、不同 instanceSchema | tools/installer/installer.js:24–28 |
| 应用白名单固定 32 文件，旧 core 包显式不含 Runtime；旧验证器要求 32 文件且禁止 node_modules/runtime | tools/package-manifest.json；tools/package-core.js；tools/installer/install-common.js 的 validateManifest |
| PDF 文本读取使用 ESM 动态 import；锁文件包含原生 canvas Windows x64 包 | server.js:3397–3464；package-lock.json 中 @napi-rs/canvas 与 @napi-rs/canvas-win32-x64-msvc 0.1.80 |
| Excel 导出是 write-excel-file/node，不调用 Excel 自动化；设置微软雅黑字体名 | export-service.js:3、502；字体名称引用不等于字体已打包 |
| 数据、配置、附件、备份、邮件及 OCR 路径已有环境注入接口 | server.js:64–95；tools/installer/launcher.js:21–27 |
| SMTP 密文存储调用 PowerShell/.NET 的 CurrentUser DPAPI | smtp-secret-store.js:11–42；身份改变会影响解密，不是普通复制文件就能迁移 |
| 首次数据初始化使用硬链接原子创建 | public-startup.js:183–203；文件系统能力必须验证 |
| 旧启动器用日志识别就绪、控制台 stop/Ctrl+C 停机及文件锁 | tools/installer/launcher.js；install-common.js 的 acquire |

这些事实证明现有边界可以复用，但不能证明闭包已经完整、DLL 已齐、Windows 干净机已通过，或旧安装器能够接收新包。

## 2. 方案比较与推荐

| 方案 | 与当前结构的关系 | 主要成本/风险 | 建议 |
| --- | --- | --- | --- |
| A. 私有 Node + 原样应用 + 构建时准备的生产 node_modules | 保留 CommonJS/ESM、磁盘资源、原生模块与浏览器架构 | 包体增大；需完整依赖、原生组件、许可和离线验收 | 推荐作为 Runtime 基线 |
| B. Node SEA 单运行 EXE | 需专门处理入口、模块加载、静态资源与原生组件 | SEA 不能自动消除全部资源/原生依赖问题；带来额外适配和验证 | 本轨道首选不采用，不声称技术上不可行 |
| C. Electron/内置浏览器重构 | 换桌面容器并分发浏览器运行时 | 扩大维护与安全更新面，违反已确认非目标 | 排除 |
| D. 继续用户端下载 Node/npm | 复用在线安装结构 | 离线与一次安装目标无法满足 | 不用于 v1.1 核心方案 |

推荐的关键区别：**对用户是单个 Setup.exe；安装后的程序可以是多个文件。** 不需要为了“一个安装文件”而把后端、HTML 和所有原生模块强制编成一个运行 EXE。

Node 官方 SEA 文档说明普通文件模块加载和原生 addon 需要相应处理，不能假设任意 Node 项目注入后原样可用。本项目的动态 PDF 模块和磁盘资源是选择 A 的具体依据，而非对 SEA 的一概否定。[Node v24.21.0 SEA 说明](https://github.com/nodejs/node/blob/v24.21.0/doc/api/single-executable-applications.md)

## 3. 推荐运行结构（逻辑契约，不是目录实施）

```text
未来 Setup.exe（Batch 3）
  → 已核验的版本化核心包
      ├─ private Node x64 + 原始许可证
      ├─ app：原有 JS/HTML/CSS + 生产 node_modules + 所需资源
      └─ 清单、哈希、第三方声明

未来桌面 Launcher（Batch 2，技术待选）
  → 锁定同一发行版本的 Node 与 app
  → 显式注入可写 instance 路径
  → 启动现有 server.js
  → 确认当前实例已就绪
  → 系统默认浏览器 → 回环 HTTP 页面 → 首次 Admin

独立可写 instance（Batch 4）
  → 数据 / 配置 / 附件 / 备份 / 日志 / 密文 / OCR 工作目录
```

“独立”指与可替换程序版本分离，不等于已经决定 Program Files、LocalAppData 或 ProgramData。每用户/全机安装及具体路径仍待 Batch 2–4 方案确认。本轮不暗中确定局域网服务器部署模式。

推荐保持交互 Windows 用户身份，不自动安装系统服务，不改自动开机启动、防火墙或全局 PATH。沿用默认回环访问；显式 LAN 能力和网络安全不因打包自动扩大或删除。若需要后台服务身份，必须另审 DPAPI、权限和数据归属。

## 4. Runtime 闭包边界

### 4.1 Node 与生产依赖

- 推荐先以既有 Node 24.21.0 x64 作为后续验证候选，不在本轮升级。它是代码锁定事实，不代表已确认是当前最安全补丁版；实际实施前核对官方来源、哈希、支持状态与安全通告。
- 用户端只调用包内绝对路径 Node，不搜索系统 Node、不依赖 PATH 中 npm/Git。
- 在隔离 Windows x64 构建环境、锁定 Node/npm 和原有 package-lock 下准备生产依赖；建议继续禁用生命周期脚本。不执行任意 postinstall 来补齐未知二进制。
- npm 是构建依赖，不作为最终用户运行必需品；建议交付 node.exe、必要运行资源及许可证，不把 npm CLI/缓存当核心依赖。裁剪 Node 官方分发内容必须有文件清单和验证，不能凭经验只复制一个 EXE 就宣称闭包完成。
- 必须保留 Windows x64 适配的 optional 原生依赖；不能用 omit=optional 盲目瘦身。跨平台可选包的实际安装结果需要与锁文件逐项解释。
- 保留依赖原始资源布局，不对 PDF 包的 worker、cMap、standard_fonts、WASM、图像/字体等目录盲删；是否实际包含和使用以所选精确版本的资源清单与离线用例验证为准。
- 不从开发机现有 node_modules 直接拷贝；不混入开发依赖、测试、浏览器测试二进制、npmrc、缓存或凭据。

npm ci 的锁文件检查、omit 与 ignore-scripts 只提供构建约束，并不保证原生组件、资源、运行许可或离线功能完整。[npm 官方说明](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

### 4.2 当前直接生产依赖（不在本轮变更）

| 名称 | 锁定版本 | 闭包重点 |
| --- | --- | --- |
| fflate | 0.8.3 | 压缩/归档及备份相关运行路径 |
| multer | 2.3.0 | 上传及所有传递依赖 |
| nodemailer | 9.1.1 | 邮件库；不附带真实 SMTP 配置，不将正式投递列为离线功能 |
| pdf-parse | 2.4.5 | PDF 解析及关联资源/原生组件 |
| pdfjs-dist | 5.4.296 | ESM 动态加载、文本层、多类 PDF 和资源定位 |
| write-excel-file | 4.1.1 | Node 子入口，XLSX 文件实际生成验证 |

playwright-core 1.63.0 是开发依赖，不进入核心交付。@napi-rs/canvas 的 Windows x64 原生包在锁文件中标为 optional，但在本架构验证中应作为重点闭包对象；包级 MIT 字段不能代替其嵌入第三方图形组件的完整声明核验。

### 4.3 构建电脑与用户电脑

| 组件 | 构建电脑 | 最终用户电脑（推荐目标） |
| --- | --- | --- |
| Node/npm | 精确版本，用于依赖准备与校验 | 使用私有随包 Node；不要求用户安装 Node/npm |
| Git、测试工具 | 源码与测试阶段按需 | 不需要 |
| Python、Paddle、OCR 模型 | 核心 Batch 1 不引入；OCR 后续单列 | 非 OCR 核心不要求；扫描图像不能冒充已完成 OCR 支持 |
| .NET / PowerShell | 后续 Launcher 技术尚未选定 | 现有 SMTP DPAPI 路径使用 Windows 系统组件；不等于需用户安装 .NET SDK |
| VC Runtime / UCRT / 原生 DLL | 必须核对所选二进制实际依赖 | 目前未确认是否需额外再分发；缺失时必须由最终安装方案受许可地解决，不留给用户手工安装 |
| 系统浏览器 | 测试浏览器与开发工具不进产品包 | 使用已有默认浏览器；不包含 Chromium/WebView2，缺失或打不开要有可理解失败提示 |
| Office / Excel / Java | 当前核心未见调用要求 | 不要求安装；XLSX 导出不等于用户无需查看器即可打开文件 |
| 字体 | 审查引用与再分发边界 | 使用系统字体及现有回退；不擅自打包商业字体 |
| curl / tar | 构建取件可按需 | 不作为 v1.1 用户在线 bootstrap 的前提 |

不要把未测试的 VC Runtime/DLL 状态写成“无需任何 Runtime”。核心包是否独立可用须由原生组件检查和干净 Windows 验证共同证明。

## 5. 包身份、资源与一致性

建议为 Runtime 包定义新的、可区分的分发协议；不得把旧 core-only 包的 runtimeIncluded 改成 true 就认为兼容。旧 32 文件清单继续作为应用层允许清单输入，不扩大为允许打包整个工作目录。

建议新的分发身份至少包括：产品版本、分发协议版本、业务 instanceSchema（独立字段，不混为一谈）、平台 win32/x64、公开来源 commit/tree、package-lock 哈希、Node/npm 构建版本、每个组件版本/来源/哈希、包内路径/长度/哈希、许可证清单、包整体哈希。

Node、应用和 node_modules 作为一个发行单元锁定，支持多个完整版本并存，避免共享 runtime 被升级后旧 app 无法回滚。业务 instance 不属于包，不纳入程序完整性清单。

关键拒绝条件：意外文件、路径穿越、符号链接/重解析点逃逸、大小写重名冲突、哈希不符、缺原生资源、平台不符、锁文件不一致、夹带数据/凭据、缺许可或来源。npm 可执行 shims/合法包内容不能仅凭名称盲删，需要允许清单解释。

哈希用于一致性，不单独提供发行者身份认证。可信源码/下载来源、构建证据、签名与发布渠道属于后续供应链门禁，不宣称可抵抗同时篡改清单和文件的攻击者。

## 6. 跨阶段风险与禁止捷径

| 问题 | 证据/影响 | 建议约束和后续归属 |
| --- | --- | --- |
| 旧安装格式不接受带依赖的新包 | 32 文件、runtime/node_modules 排除与精确版本限制 | 新包独立契约；不修补 v1.0.0 资产；实现前另批最小构建适配 |
| “npm ci 成功”不等于闭包完整 | optional 原生包、动态 import、系统 DLL 和资源 | 实际解析 PDF、生成 XLSX、上传/备份验证；Batch 1 后续实施与 Batch 6 |
| 程序目录写权限 | 现有 root 下 instance 与生命周期锁均有写入 | Launcher/安装器/数据目录必须共同确认锁与日志位置；不得要求普通用户写 Program Files |
| 变更 Windows 身份 | SMTP CurrentUser DPAPI | 保持身份或另审迁移；不把无法解密时清空密文作为恢复方法 |
| 环境污染 | 现 launcher 继承 process.env，只清理部分 KSESSION 变量 | 后续 Launcher 显式管理 NODE_OPTIONS、NODE_PATH、端口和允许配置；不信任开发机环境，保留必要系统环境，不盲目全清 |
| 关闭页面与关闭后端不同 | 现后端由控制台管理，不由浏览器生命周期管理 | Batch 2 明确安全停止、重复启动与残留锁；不通过结束全部 Node 进程实现停止 |
| 端口占用及伪就绪 | 现有日志正则与端口参数 | Batch 2 验证实例归属/健康；不能发现端口响应就当作本程序，也不能抢杀进程 |
| 文件系统差异 | 首次 Admin 使用硬链接，旧锁拒绝残留 | 目标路径和文件系统能力需验证；不以关闭安全校验来支持任意存储位置 |
| 旧版升级 | 旧 launcher/Node/instanceSchema 有明确拒绝条件 | Batch 4 单独设计旧安装识别、备份、数据保留和回退，不承诺覆盖目录自动兼容 |
| 不确定依赖许可和系统支持 | 原生组件/系统版本未实测 | 发行阻塞项，不以 npm license 字段或 runner 通过替代验收 |

本轮未发现需要改变审批/财务/权限/业务数据模型的已证实必要性。若后续证明需 server.js 入口适配，先单列文件、原因、失败行为与测试再报批，不直接修改业务逻辑。

## 7. Windows 与离线验收边界

Node v24.21.0 官方平台表列出 Windows x64，并明确厂商已停止支持的系统不受支持；这不是本应用的实测报告。正式目标仍限 Windows 11 x64 和受维护 Windows 10 x64，具体系统版本/渠道待确认。[Node 平台支持依据](https://github.com/nodejs/node/blob/v24.21.0/BUILDING.md)

建议后续核心闭包验证：在无开发环境、无 Node/npm/Python/Git 的目标机，阻止核心下载出站连接并清空测试专用缓存，从包内启动；验证首次 Admin、重启、HTML/CSS、合成文本 PDF、上传/附件、Excel 导出与备份。只能用明确合成数据；不得真实邮件投递。

此类“核心离线”不包括正式 SMTP 邮件发送、跨机网页访问、可选 OCR 模型下载。图像/扫描件没有 OCR 时必须保留明确不可用提示，不伪装成识别成功。Batch 1A 不执行上述测试。

## 8. 待批准结论与未决项

建议本次评审批准的仅是：选择 A；保留 Node/浏览器架构；构建阶段准备版本化私有 Runtime 和生产依赖；程序与实例分离；不向用户要求开发工具或手工命令；OCR 独立。

仍未决定：最终 Node 安全补丁与构建 npm 版本、安装器工具、Launcher 实现语言、具体安装/数据目录、安装身份、DLL 再分发方式、旧版本升级协议、Windows 10 具体矩阵、签名和收费资源。

可在不决定 Setup/Launcher 工具时继续细化核心闭包清单；不得在许可证或原生闭包未证实时承诺已可发布。后续实施仍需独立批准的文件清单、失败优先测试与执行 Plan。
