# Batch 1B — Dependency Closure / Native Dependency Checklist

状态：静态设计清单，未安装、下载或验证二进制。基线公开 HEAD 49b3e35c68468b3c61e3ad19ed379ce057d17886。

## 1. 进入 Runtime 的规则

以 package.json 的六个生产根依赖和 package-lock v3 为权威，解析传递依赖并按 Windows x64 筛选平台。实际目录必须与锁文件图、安装 manifest 和包内文件表核对；不能只靠 dev/optional 标签或文件夹数量宣称完整。

本轮静态筛选得到 **23 个 Windows x64 非开发候选条目**，不是 23 项已实测通过。下表为未来实际安装集合的核对基线；任何增减必须解释，不能直接改锁文件绕过。

| 包名 | 锁定版本 | 定位 |
| --- | --- | --- |
| fflate | 0.8.3 | 直接生产，压缩及 Excel 传递使用 |
| multer | 2.3.0 | 直接生产，上传 |
| nodemailer | 9.1.1 | 直接生产，邮件库，无真实配置 |
| pdf-parse | 2.4.5 | 直接生产，依赖 canvas/pdfjs |
| pdfjs-dist | 5.4.296 | 直接生产，PDF 动态加载和资源 |
| write-excel-file | 4.1.1 | 直接生产，Node 导出入口 |
| @napi-rs/canvas | 0.1.80 | 传递生产，原生图形加载层 |
| @napi-rs/canvas-win32-x64-msvc | 0.1.80 | 平台 optional，本目标闭包必须实际具备并加载 |
| append-field | 1.0.0 | 上传传递依赖 |
| buffer-from | 1.1.2 | 流/缓冲传递依赖 |
| busboy | 1.6.0 | 上传传递依赖 |
| concat-stream | 2.0.0 | 上传传递依赖 |
| inherits | 2.0.4 | 流传递依赖 |
| media-typer | 0.3.0 | 上传类型传递依赖 |
| mime-db | 1.52.0 | 上传类型传递依赖 |
| mime-types | 2.1.35 | 上传类型传递依赖 |
| readable-stream | 3.6.2 | 流传递依赖 |
| safe-buffer | 5.2.1 | 流传递依赖 |
| streamsearch | 1.1.0 | 上传传递依赖 |
| string_decoder | 1.3.0 | 流传递依赖 |
| type-is | 1.6.18 | 上传类型传递依赖 |
| typedarray | 0.0.6 | 流传递依赖 |
| util-deprecate | 1.0.2 | 流传递依赖 |

关系示例：pdf-parse → canvas + pdfjs；canvas → Windows x64 平台包；write-excel-file → fflate；multer → busboy/concat-stream/type-is 等。完整依赖边和来源/integrity未来从锁文件生成，不能只记录八个重点名称。

## 2. Node 来源与运行文件

公开 tools/installer/distribution.json 当前登记：

- Node：24.21.0，Windows x64。
- 官方归档：https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip
- 归档 SHA256：158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541。
- node.exe SHA256：ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32。

以上是本轮读取的既有配置事实，不冒充本轮下载/二进制检查结果。实施前还须核对官方校验来源和安全状态；若需换补丁，先批准，原 v1.0.0 不变。

计划进入：node.exe、经依赖和动态加载证明必须的运行伴随文件、Node 原始 LICENSE/第三方声明。Node 官方分发中的 npm 和构建工具只在构建阶段使用，用户包不依赖它们。不得从操作系统目录随意复制 DLL；非系统可再分发库需明确来源、适用授权和匹配位数。

## 3. 明确排除

| 排除对象 | 处理规则 |
| --- | --- |
| playwright-core 1.63.0、Playwright/浏览器测试二进制 | 开发验证工具，位于 Runtime 外，不进入生产依赖 |
| 九个非 Windows x64 canvas 平台条目 | Android arm64；Darwin arm64/x64；Linux arm/arm64-gnu/arm64-musl/riscv64-gnu/x64-gnu/x64-musl；记录平台不匹配，不删除锁文件条目 |
| 仓库测试、GitHub Actions、CI 文件、开发脚本、.git | 不在应用允许清单；不得打包整个工作目录 |
| npm cache、.npmrc、开发环境、编译器 | 构建专用，不能作为目标机隐性依赖 |
| 审计文件、截图、测试报告、测试 Admin/数据 | 外置 evidence；绝不进入 Runtime |
| data.json、config.json、attachments、backups、日志、SMTP 配置/密文、Cookie、Token | 用户实例/敏感材料，全部排除；不预置空数据文件绕过首次初始化 |
| Python、Paddle、OCR 模型/缓存 | Batch 5 范围，不进入本核心包 |
| 系统字体、Office、Java、Chromium、WebView2 | 当前不作为随包依赖；不为了测试方便额外捆绑 |

应用级目录排除规则不能盲目套到每个第三方包的内部：上游原始 tarball 可能含 test/docs 名称文件，需要逐文件区分“上游不可变包内容”和“我们运行测试产生的材料”。首版生产包默认保留完整上游生产包资源；若要裁剪上游测试/文档，先生成审查过的显式裁剪表并验证运行资源、许可证未被误删。不得用全局通配符清理 node_modules。

## 4. Native Dependency Checklist（所有执行项待实施）

| 编号 | 检查 | 方法/证据 | 阻塞条件 |
| --- | --- | --- | --- |
| N01 | Node 来源 | 固定官方 URL、归档 hash、exe hash；保留可信校验来源及原始许可 | 任一不符或无法核实来源 |
| N02 | Node 平台 | 检查 PE 架构为 AMD64/x64；目标机运行实际进程取得版本和 arch | 仅凭文件名判断，或实际非 x64/不能运行 |
| N03 | Canvas 原生文件 | 从平台包实际枚举 .node/DLL，记录路径、长度、SHA256；不预猜单个文件名 | .node 缺失/重复歧义/平台不符 |
| N04 | PE 依赖闭包 | 用受控构建检查器枚举导入和延迟导入 DLL，再通过目标机加载跟踪交叉验证 | 静态检查遗漏的动态库未能解释；加载依赖了开发工具路径 |
| N05 | DLL 分类 | 每项归为目标 OS 系统组件、随包组件、需另行授权的可再分发项；登记版本/来源/许可 | 找不到 DLL、位数冲突、VC/UCRT需求不明；禁止从开发机 System32 拷贝补洞 |
| N06 | Canvas 功能 | 包内 Node 加载 canvas，在包外合成夹具目录生成/读回小图像 | 仅 require 成功但实际操作失败，或必须联网 |
| N07 | PDF 动态入口 | 包内 Node 加载实际 pdf-parse 和 pdfjs-dist/legacy/build/pdf.mjs，记录解析位置 | 依赖全局 NODE_PATH 或加载到包外开发依赖 |
| N08 | PDF 资源库存 | 精确版本内枚举 worker、WASM、cMap、standard_fonts、其他资源；记录存在/缺失及用途 | 仅根据名称猜“已包含”，必要资源缺失或路径被重排 |
| N09 | PDF 资源执行 | 合成中文文本层、嵌入字体、非嵌入/CMap和多页 PDF；按现有 server 行为断网解析 | 实际字段/文本不正确、资源访问失败；未覆盖分支不得标绿 |
| N10 | worker/WASM 分支 | 保留上游文件；当前 server disableWorker=true 不等于库所有运行分支永远不用它们 | 以某一个样本未触发为由删库资源；需要新增业务配置才正常却未经批准 |
| N11 | 字体与许可 | 区分现有系统字体引用、PDF 自带字体资源和准备再分发的字体文件 | 从开发机复制商业字体；无文件级声明 |
| N12 | 全部第三方声明 | Node、23 个包及原生嵌入组件映射到适用 LICENSE/NOTICE；保留作者 | 缺来源、native 审查仍 pending，不能用根 MIT 覆盖 |

若现有 PDF 配置不支持某必需样本，报告原样应用与闭包问题的区别，不得趁机修改 server.js。安装环境未带开发环境是必须条件，静态依赖表不能替代真实目标机加载。

## 5. 已发现的许可前置问题

公开 docs/licenses-and-distribution.md 已记录：@napi-rs/canvas-win32-x64-msvc 0.1.80 原始平台包缺 LICENSE，现有规则允许使用同版本父包的精确来源映射；但原生图形二进制的 Skia 等适用声明仍标为 pending-before-distribution。

因此后续不能只复制父包 MIT 就宣称原生再分发审查完成。需要按实际二进制构成核对适用原文、NOTICE/其他义务与来源关系。当前许可问题不阻止写设计，但阻止将未审查二进制作为可分发完成品交接。

当前 tools/check-public-licenses.js 针对全量已安装 lock；生产-only采集器还必须区分 dev 与平台排除，否则会把缺 playwright 误报为生产缺件。实现时保留原检查，不在本轮执行或降低门禁。

## 6. 依赖闭包验收口径

安装结果图、包内实际文件、DLL解析来源、资源访问轨迹、原始许可证和运行测试应共同对应同一 artifact 哈希。缺件时停止，不允许首次启动联网补下载，不把 unknown 变成“无需”。Manifest 消费约束见 [RUNTIME-PLAN.md](RUNTIME-PLAN.md)，验证分层见 [VALIDATION-PLAN.md](VALIDATION-PLAN.md)。
