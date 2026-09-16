# Batch 1C — Runtime 构建报告

## Batch 1C-R5｜未执行正式Runtime构建

R4提交f7dc474已保存/推送。R5工作区新lock fresh生产依赖审计20包/977文件/41,243,947字节，native/Canvas/Skia0，许可原文初步记录23份。**这是依赖审计暂存，不是Runtime；没有包内Node、新manifest、最终许可集合、ZIP或解包验收。**

构建器/校验器与modules/host-smoke已适配为工作区草稿；新的精确lock与optional规则、20包必需可达性、资源/无原生检查、原始许可及hash门禁保留。旧Canvas gate不再适用于新图但仍保留历史分支。ZIP需全回归、完整新包许可、Runtime smoke通过后独立授权门禁；本轮尚未实现/执行最终归档收口。

原全回归剩startup-filesystem权限阻断，按任务要求不建立R5checkpoint；因此不能以新源码commit fresh build。Runtime大小/文件数/ZIP SHA/source与build-tool新commit均N/A，未复用旧node_modules或旧Runtime身份。license unresolved=N/A，不能预填0。补测通过后续行原R5。以下旧构建信息不代表本轮。

## Batch 1C-R2 当前状态｜只做依赖审计，未重建Runtime

R1的10文件已提交/推送为`2aeaa4089520a99829f1b9981b7b5ea2bfa9e295`。本轮以该commit的原package/lock在新的外置`dependency-audit-r2-01/fresh-input`安装生产依赖，不复制32个应用文件、不启动server、不调用Runtime构建器。

| 指标 | 本轮实际结果 |
| --- | --- |
| Node / npm | 已核实官方toolchain Node24.21.0 x64 / npm11.19.0 |
| 安装方式 | fresh npm ci，omit=dev/include=optional/ignore-scripts/bin-links=false；公开registry、严格TLS、独立空配置/cache及白名单环境 |
| package SHA256 | ed2b5d3bf20450c301ae531395fe5bb95c8de07df7f181f254d47843fe928bde |
| lock SHA256 | c4050d95db6d40702a222ee9da9e43d74c5d36a8e5be73583e1dc2f08d9a5bf5 |
| 实际生产依赖数 | 23，与原lock的Windows x64图一致 |
| node_modules大小/文件 | 98,604,168字节/1,131文件，仅依赖目录，不是Runtime |
| 删除后包数/大小 | N/A，条件D失败，未执行删除 |
| Canvas / Skia | 仍存在；仅import pdfjs即可加载native |
| 新Runtime / manifest / ZIP / ZIP SHA | 全部N/A，未执行构建/出包 |
| Win11 G1 | 未执行 |

证据图、npm原始输出、安装实物清单、加载trace及hash见DEPENDENCY-USAGE-AUDIT.md。未升级npm（其升级提示未执行）、未手改lock、未省略optional、未修改23包/Canvas构建断言或原license gate。

原build-02及其source49b3e35、1,199文件/194,275,955字节、manifest不变；本轮没有重新构建它，旧规模不能冒充R2产物。R1原生闭包仍不完整。R2报告尚未额外提交；以下记录保留各原时点事实。

## Batch 1C-R1 续行

检查点468d62357fe4861a9a3015df23a7b6c1862b858a已提交并推送指定开发分支；原构建工具现可由该commit追溯。**旧build-02不是用此commit重新构建**，其source/manifest/toolFiles保持原值。

本轮收集54份原始公开证据，新增只读下载收集器及证据一致性测试；详见[NATIVE-LICENSE-CLOSURE.md](NATIVE-LICENSE-CLOSURE.md)。仍有3个未关闭分发工作项，license gate未改。

按任务书顺序，许可未PASS即不进行fresh npm ci、新staging、新manifest、新ZIP或解包验证。以下为旧构建实测记录，不能当作本轮重建结果。Runtime ZIP/source build tool commit/ZIP大小/ZIP SHA均无新的值，Artifact=N/A。未改变旧32文件应用、23依赖、Node哈希或旧1199文件目录。

R1新增工具/报告未再次提交，HEAD仍为检查点。证据在源码外native-license-r1、native-license-r1-02，既有build-01/build-02和诊断实例不清理、不覆盖。

## 以下为初次1C构建记录

## 构建身份与操作

仅公开仓库 `KG718718/spxt-public`；源码 commit、Node/npm、lock/manifest 哈希见 [RESULT](RESULT.md)。构建工具目前未提交，其实际字节哈希随生成的 manifest.build.toolFiles 保存；取件应用 commit 不冒充构建工具 commit。

执行入口为 `tools/windows-runtime/build.ps1 -OutputDirectory <E盘源码外的新目录>`。脚本要求 PowerShell 7（ProcessStartInfo.ArgumentList/Environment）；这是构建工具需求，不是最终用户运行要求。当前目录已存在即拒绝，不清理、不覆盖旧结果。重复构建可传入本轮已下载官方 Node ZIP，通过官网清单及字节哈希重新核对，仍新建 toolchain、空 npmrc、cache、生产依赖与 staging，不能复用旧 node_modules。

1. 核对 origin 是指定公开仓库，只接受完整 commit。
2. 从 Git 对象读取 distribution/允许清单/锁文件；官方 HTTPS 精确地址及哈希验证，不用 latest。
3. 下载官方 Node 归档，校验后解压，校验 exe；实际运行 v24.21.0/npm11.19.0。
4. 从指定 commit 原样写入 32 个应用文件，保持现有扁平 HTML/CSS/JS 路径。
5. 独立空 user/global npmrc、E盘 cache/temp；环境变量采用白名单，不继承 NODE_OPTIONS/NODE_PATH/npm token/registry/proxy。源码只取允许文件，不带项目 .npmrc。
6. 执行 `npm ci --omit=dev --include=optional --ignore-scripts --bin-links=false --audit=false --fund=false --strict-ssl=true --registry=https://registry.npmjs.org/`，显式传入空配置与独立 cache。实际 npm 版本已固定记录；其升级提示没有被执行。本轮未运行漏洞审计，不能由安装成功推出安全审查通过。
7. 实际磁盘包集合与 Win32 x64 非开发锁定图逐项比对，23 项齐全；锁文件字节不变。保留完整第三方包资源，不按 test/docs 文件名盲删上游内容。
8. 原始许可复制、PE架构与导入/延迟导入检查、Canvas真实图像读写、PDF动态加载与资源库存。
9. 生成依赖清单、manifest、全部 payload SHA256。manifest 不自哈希，SHA256SUMS 不包含自身，未来 ZIP 哈希在包外。
10. 暂存目录完整性通过；原生许可门禁返回失败，停止生成 ZIP。归档实现已写入，但本轮没有越过门禁执行，不宣称归档/解包代码已验收。

## 暂存目录与排除

```text
KSESSION-RUNTIME/
  runtime/node.exe
  app/<32个既有应用文件>
  app/node_modules/<23个生产包>
  licenses/node/LICENSE
  licenses/npm-packages/<原始声明>
  manifest/dependencies.json
  manifest/runtime-manifest.json
  hashes/SHA256SUMS.txt
```

总计 1,199 文件 / 194,275,955 字节；32份依赖/Node许可文件引用，另有 app 原始项目 LICENSE/THIRD_PARTY_NOTICES。PDF worker/cMap/font/wasm等资源库存196项，包含其中的许可原文，不等于196个功能分支均已测试。

没有 launcher/instance，没有用户 data/config/附件/备份/SMTP/Token/Cookie。无 npm CLI/cache、开发工具、Playwright、浏览器、Python、OCR引擎/模型。保留原白名单两个 OCR 源码文件，不等于引擎包含。开发机诊断产生的合成实例、日志、XLSX仅在外置 evidence，未进入暂存包。

## 实际生产依赖

| 包 | 版本 |
| --- | --- |
| @napi-rs/canvas | 0.1.80 |
| @napi-rs/canvas-win32-x64-msvc | 0.1.80 |
| append-field | 1.0.0 |
| buffer-from | 1.1.2 |
| busboy | 1.6.0 |
| concat-stream | 2.0.0 |
| fflate | 0.8.3 |
| inherits | 2.0.4 |
| media-typer | 0.3.0 |
| mime-db | 1.52.0 |
| mime-types | 2.1.35 |
| multer | 2.3.0 |
| nodemailer | 9.1.1 |
| pdf-parse | 2.4.5 |
| pdfjs-dist | 5.4.296 |
| readable-stream | 3.6.2 |
| safe-buffer | 5.2.1 |
| streamsearch | 1.1.0 |
| string_decoder | 1.3.0 |
| type-is | 1.6.18 |
| typedarray | 0.0.6 |
| util-deprecate | 1.0.2 |
| write-excel-file | 4.1.1 |

开发依赖 playwright-core 和9个非目标平台 canvas optional 包不在实际集合中。名称、版本、官方 resolved、integrity、许可引用详见外置 manifest/dependencies.json。

## Native 初步结果

- `runtime/node.exe`：93,580,104字节，AMD64 PE32+，哈希符合官方；导入 CRYPT32、WS2_32、USER32、dbghelp、ADVAPI32、IPHLPAPI、USERENV、SHELL32、ole32、WINMM、KERNEL32；静态未发现延迟导入。
- `app/node_modules/@napi-rs/canvas-win32-x64-msvc/skia.win32-x64-msvc.node`：26,272,256字节，AMD64 PE32+；SHA256 `30646342fc284109aa9542155287d37147c97132d5168cf621f851a9c69e0c99`。
- Canvas 导入 bcryptprimitives、api-ms-win-core-synch-l1-2-0、ADVAPI32、kernel32、ntdll，静态未发现延迟导入。包内 Node require 成功，16×16 PNG 生成与读回成功。
- PDFParse 与 pdfjs legacy 动态 import 实际解析到包内路径；真实合成文本解析通过。原生 DLL 动态追踪及 Win11干净机未执行；以上不能证明所有Windows版本无需额外组件，也没有从System32复制任何DLL。

## 许可证门禁

已收集 npm/Node 原始声明，Canvas 平台包采用公开仓库既有精确父包 MIT 映射。重新读取官方 npm 元数据，其 gitHead 为 `dda1b258dac667b4c66b94bbd4d70aa79ea4503a`，与既有映射一致。

该 Canvas 上游提交的 `.gitmodules` 指向 google/skia，Git tree固定 Skia子模块 `1fdbea293a53b270e3f5e74c92cc6670d68412ff`。这证明还需核查其原生组成，不证明 npm预编译二进制与全部子依赖许可已形成完整链路。未拿单份MIT覆盖Skia及其第三方组件；保持 pending-before-distribution，ZIP输出锁闭。

公开来源：[Node校验清单](https://nodejs.org/dist/v24.21.0/SHASUMS256.txt)、[平台包精确版本元数据](https://registry.npmjs.org/@napi-rs/canvas-win32-x64-msvc/0.1.80)、[Canvas固定提交子模块](https://github.com/Brooooooklyn/canvas/blob/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/.gitmodules)。这是工程证据完整性判断，不是法律合规意见。

## 构建历史与证据

E盘源码外 `output/windows-installer-v1.1/batch-1c/`：

- `build-01/`：第一次新鲜安装成功，收集器因 busboy 锁文件未记录 license 而误判停止。已修正**新构建器**：锁中有 license 才比对其值，始终要求包元数据受支持且具备原文；不改锁、不豁免原文。保留失败现场。
- `build-02/`：新鲜 npm ci，完成上述暂存/清单/探针；停于真实原生许可门禁，`build-report.json` SHA256 `e056a1e972cead68026ef1cce227e9bcd6789b533366d8d0a9a2cdb6114b4713`。
- `build-02/modules.json` SHA256 `bc6814ad7862097b2470205b859c68f17db41bcc430e086638be86d8bcce7699`。
- `npm-ci.log`、manifest、hash清单、原始上游Node归档均留存；不要将官方Node.zip误称为K-SESSION Runtime.zip。

没有清理、覆盖、推送以上材料。归档大小、压缩比、解包复验和字节可复现尚无结论。
