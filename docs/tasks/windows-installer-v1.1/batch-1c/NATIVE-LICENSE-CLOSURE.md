# Batch 1C-R1 — Native License Closure

## Batch 1C-R2 增量复核

R1原调查随检查点`2aeaa4089520a99829f1b9981b7b5ea2bfa9e295`提交并推送。本轮未补充/批准许可，也未绕过门禁。

fresh原lock安装及pdfjs独立import实测证明Canvas/Skia仍存在、仍加载：不是pdf-parse独占链。Windows native SHA仍为`30646342fc284109aa9542155287d37147c97132d5168cf621f851a9c69e0c99`，与以下R1研究对象一致。因此**不得标NOT APPLICABLE — dependency removed，也不得标license approved**；下列U1/U2/U3三个未关闭分发工作项保持。

Batch1C-R2按条件D失败报告BLOCKED；它没有把R1许可工程门禁FAIL改成PASS，也没有实际生成Runtime ZIP。详见[依赖使用审计](DEPENDENCY-USAGE-AUDIT.md)。以下全部R1调查和原文来源保留。

日期：2026-09-16。**工程门禁 FAIL — native distribution evidence incomplete**。
unresolved distribution items = **3 个工作项（不是 3 个未知组件）**。
本报告仅建立工程分发证据，不提供法律意见，不将缺证据等同于已发现侵权。

## 1. 本轮身份与边界

公开仓库 KG718718/spxt-public；检查点 `468d62357fe4861a9a3015df23a7b6c1862b858a`。
只读复核先前 build-02 暂存二进制，未改变它，未重新构建或生成 ZIP。
新增收集器只下载公开证据，不执行上游脚本，不使用 Token，不修改现有许可门禁。
54 份成功下载；另保留 Cargo.lock 与一个探查文件的 404 记录。原始资料与 SHA256 在源码外
`output/windows-installer-v1.1/batch-1c/native-license-r1-02/`，初次收集目录 native-license-r1 原样保留。

## 2. 精确 binary → package → source

| 对象 | 核实结果 |
| --- | --- |
| binary | `app/node_modules/@napi-rs/canvas-win32-x64-msvc/skia.win32-x64-msvc.node` |
| 大小 / SHA256 | 26,272,256 字节 / `30646342fc284109aa9542155287d37147c97132d5168cf621f851a9c69e0c99` |
| 平台 | PE32+ AMD64，静态导入 bcryptprimitives.dll、api-ms-win-core-synch-l1-2-0.dll、ADVAPI32.dll、kernel32.dll、ntdll.dll；未见延迟导入 |
| npm | @napi-rs/canvas 和 @napi-rs/canvas-win32-x64-msvc 均为 0.1.80 |
| gitHead | 两份精确 npm 元数据均为 `dda1b258dac667b4c66b94bbd4d70aa79ea4503a` |
| Skia | 未截断 Canvas Git tree 中 submodule 为 `1fdbea293a53b270e3f5e74c92cc6670d68412ff`，.gitmodules 指向 google/skia |
| ICU 随包数据 | icudtl.dat，10,468,208 字节，SHA256 `9ae98c06cbb0ea43c5cd6b5725310c008c65e46072421a1118cb88e1de9a8b92`；与上游 skia-1fdbea29 Release 当前 asset digest 一致 |
| npm 包根许可 | MIT；Canvas LICENSE SHA256 `8802fecf9da4367bc23bcf20b21cc143785fc6c92b152f3fa7fbe6ce08d344d6`；平台包目录无自身 LICENSE |

npm attestations 已保存，解码后的两个 SLSA provenance subject SHA512 与各自 npm dist.integrity 一致，resolvedDependencies 指向该精确 Canvas commit；invocation 为
[17693234724/attempts/2](https://github.com/Brooooooklyn/canvas/actions/runs/17693234724/attempts/2)。
**本轮只验证元数据一致性，未执行 Sigstore 签名/证书链验证，不能称密码学验签通过。**
provenance 的 resolvedDependencies 仅列仓库提交，不含 Cargo crate、Skia 静态库对象或完整 native SBOM。

## 3. 构建链证据及缺口

已读精确提交的 Cargo.toml、build.rs、.cargo/config.toml、Rust工具链、CI与Skia构建/发布脚本：

- Rust 工具链记录 1.89.0；Cargo.toml 多个依赖采用范围版本，例如 napi 3.1、libavif 0.14、libavif-sys 0.17、mimalloc-safe 0.1。
- 该提交完整 Git tree 不含 Cargo.lock；直接获取返回404。没有用今天 cargo resolve 结果冒充当时构建版本。
- CI 下载预编译 Skia 静态库，再生成 Windows binding；发布脚本取六个库（skia、skparagraph、skshaper、svg、skunicode_core、skunicode_icu）及 ICU 数据。
- Skia 下载 tag 由 submodule 前8位组成，即 skia-1fdbea29；下载脚本没有在消费处校验静态库哈希，上传脚本支持删除并重传同名上游资产。**这只是来源证据的限制，不代表已证明上游资产被篡改。**
- 当前 upstream Release 有这些库的 digest，但无法仅凭当前 digest 证明 npm 发布时间实际消费的每个库字节。
- Windows binding artifact 4002141285 已 expired=true（expires_at 2025-12-12）；列出的10个历史artifact名称均为平台bindings，没有Cargo.lock/SBOM。这不证明其他地方绝无记录，但本轮已检查公开证据中没有取得。
- Windows 使用 +crt-static / static_crt(true)，因此“没有额外VC DLL导入”不等于“没有静态运行库组件或声明义务”。PE导入表无法枚举静态链接对象。

## 4. 原生组件映射（明确证据等级）

以下是**精确源码构建配方指向的候选组件**，不是声称已经完整识别二进制全部对象。
各来源原文及完整SHA见附录；第三方 revision 来自该 Skia DEPS，不自动等于构建实物证明。

| binary关联 | component/source revision | 已收集声明 | 判定 |
| --- | --- | --- | --- |
| npm binding主体 | Canvas dda1b258… | Canvas LICENSE（MIT） | 包主体声明已取得，不覆盖全部组件 |
| 预编译静态图形库 | Skia 1fdbea293… | Skia LICENSE（BSD三条款正文） | 已取得根声明；第三方另列 |
| 字体处理 | FreeType 1518bc83d26b434031bd12c706ac3c7dab3902fd | LICENSE.TXT、FTL.TXT、GPLv2.TXT | 存在可选许可路径及附加文件声明；不能把双许可全体概括为MIT |
| shaping | HarfBuzz 08b52ae2e44931eef163dbad71697f911fadc323 | COPYING、Skia wrapper LICENSE | 原文已取得 |
| Unicode及随包icudtl.dat | ICU 364118a1d9da24bb5b770ac3d762ac144d6da5a4 | LICENSE（Unicode License V3等原文） | 数据hash匹配当前asset；链接输入历史仍待补证 |
| XML | Expat 8e49998f003d693213b538ef765814c7d21abada | expat/COPYING、Skia wrapper LICENSE | 原文已取得 |
| 压缩 | Brotli 6d03dfbedda1615c4cba1211f8d81735575209c8 | LICENSE | 适用对象须与构建图确认 |
| JPEG | libjpeg-turbo e14cbfaa85529d47f9f55b0f104a579c1061f9ad | LICENSE.md、README.ijg | 上游明确二进制/静态链接文档致谢要求，不能只存包根MIT |
| JPEG XL | libjxl a205468bc5d3a353fb15dae2398a101dff52f2d3 | LICENSE、PATENTS | 配方启用解码；其传递组件及对象仍待确认 |
| SIMD候选 | Highway 424360251cdcfc314cfc528f53c872ecd63af0f0 | LICENSE（Apache-2.0正文） | 配方/BUILD依赖线索，不能当已核全 |
| PNG | libpng ed217e3e601d8e462f7fd1e04bed43ac42212429 | LICENSE | 原文已取得 |
| WebP | libwebp 845d5476a866141ba35ac133f856fa62f0b7445f | COPYING、PATENTS | 原文已取得 |
| 图像解码 | Wuffs e3f919ccfe3ef542cfc983a82146070258fb57f8 | 外部LICENSE及Skia wrapper LICENSE | 两层声明均保留 |
| 压缩 | zlib 646b7f569718921d7d4b5b8e22572ff6c76f2596 | LICENSE | 原文已取得 |
| AVIF/AOM | Rust libavif/libavif-sys codec-aom | Cargo范围版本线索 | 精确传递版本/源码/声明未齐 |
| 内存分配与Rust传递库 | mimalloc-safe、napi、serde等及Rust运行支持 | Cargo配方与工具链 | 不把范围版本当实际解析版本；闭包未齐 |
| 静态CRT | Windows编译配方 | +crt-static和static_crt | 实际工具链组件/适用分发材料待核 |
| 动态系统DLL | PE导入表列出的Windows库 | 仅记录名称，不复制系统DLL | 动态加载路径/目标机仍待G1 |

没有将 `skia_use_libheif=true`、WOFF2等标志直接解释为“所有同名外部库都已嵌入”；必须结合该精确版本 GN 图、编译输出和实际链接输入辨别。

## 5. 最终包应附内容（待闭包后实施）

未来至少在 licenses/native/ 保留：Canvas、Skia、实际链接第三方组件的原文许可证、COPYRIGHT、NOTICE、必要PATENTS与原始许可路径说明；ICU数据声明不能遗漏。
另生成组件索引（binary SHA → 精确版本/commit → 来源URL → 原文SHA → 包内位置）以及必要产品文档致谢。
例如 libjpeg-turbo 原文要求 IJG 致谢；若采用 FreeType FTL 路径，应按其正文保留相应声明。当前未擅自替上级选择许可路径或宣称全部义务满足。
Rust依赖、静态运行库和所有实际组件材料补齐后方能冻结最终文件表。不能将本报告“候选清单”直接作为许可PASS证明。
本轮仅将原文存入外置证据，没有回写 build-02、没有临时塞几份LICENSE骗过 gate。

## 6. unresolved distribution items = 3

1. **U1 Rust/native确切组成**：缺发布时Cargo.lock/解析依赖清单及传递native（AVIF/AOM、mimalloc、运行支持等）的精确版本和对应声明。需要上游可追溯构建记录/SBOM；今日重新解析不是原二进制证据。
2. **U2 Skia静态库历史和完整组件映射**：已取DEPS/配方/现有asset摘要，但缺对该npm binary实际链接库的历史字节绑定、完整链接组件/对象图及适用传递声明确认。当前release摘要、配方标志、PE导入均不能单独补足。
3. **U3 最终分发声明闭合**：依据U1/U2汇总适用原文、版权、致谢、许可选择和静态CRT材料，逐文件确定打包位置及哈希；未确认项不能自动继承MIT。

最短续行路径：由上级决定取得上游该精确发布的组件/notice证据，或另立经批准、可追溯的新原生构建/依赖调整任务。**本轮不升级依赖、不改lock、不自行重编native或联系外部维护者。**
另需合格Win11测试机，见 G1-ENVIRONMENT-REQUIREMENTS.md。许可关闭前不启动fresh Runtime构建，不生成ZIP。

## 7. 本轮证据一致性检查

75项通过：来源域边界、54份下载内容SHA、npm精确身份、submodule、无锁文件事实、attestation摘要对应、实际native/ICU hash及过期artifact事实。
这不是75个许可批准或G1测试。29项既有守卫与14项完整性反例复跑通过；原1199文件暂存完整性复验通过，distribution仍BLOCKED-native-license。
上游文档和代码仅作为数据阅读，未执行其上传、删除、构建或安装命令。

## 附录：本次原始来源与SHA256

表中SHA为实际下载/解码后的原文字节；Gitiles原始base64响应也留存，其响应hash记录在sources.json。动态API快照的哈希只标识本次响应，不是永久上游文件版本。54成功、2个HTTP404；jconfig.h.in是探查路径，不把它缺失单独算成许可缺项。

| 外置证据相对路径 | 原始URL | SHA256 / 失败 |
| --- | --- | --- |
| `canvas/.cargo/config.toml` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/.cargo/config.toml) | `8d2878c965f118314e355c6205b2c0add5b59753b6cd4b3ec361df369907e983` |
| `canvas/.github/actions/setup-rust/action.yaml` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/.github/actions/setup-rust/action.yaml) | `c04b2cf3a51ff5f9aee302cf885a0bb6209e7fa3efa0bbbf10cc9a6e0b626cd9` |
| `canvas/.github/workflows/CI.yaml` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/.github/workflows/CI.yaml) | `0cbdc48409c2d3965ff3306111cc7828bf91258fe187f70df680384a27767eb7` |
| `canvas/.github/workflows/skia.yaml` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/.github/workflows/skia.yaml) | `d2c906e24d35387c1dc4cb584c97fa55c1f48aece8cdd20478fec222919d77a1` |
| `canvas/.gitmodules` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/.gitmodules) | `42bbce9349d520c24475215871371def98636c3d8b9f7bdce138302f492f648c` |
| `canvas/actions-runs.json` | [来源](https://api.github.com/repos/Brooooooklyn/canvas/actions/runs?head_sha=dda1b258dac667b4c66b94bbd4d70aa79ea4503a&per_page=100) | `752101b3de7a96aa330d4d3486f07f9a833854d1dbfa09332654c2828cc2a528` |
| `canvas/build.rs` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/build.rs) | `d86c9adbf8692be58b03ac937a121a4078dfd71d7f90d900e28c2f1976e445fc` |
| `canvas/Cargo.lock` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/Cargo.lock) | HTTP 404 |
| `canvas/Cargo.toml` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/Cargo.toml) | `2c801e235af2b7fc482e15f549be6924b70147cddddba435fb8e9a7875745309` |
| `canvas/ci-artifacts.json` | [来源](https://api.github.com/repos/Brooooooklyn/canvas/actions/runs/17693234724/artifacts?per_page=100) | `fac213055c4f55e5e4a47c6bba2adece32a4978bdad0b780816b10ca5eef620e` |
| `canvas/LICENSE` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/LICENSE) | `8802fecf9da4367bc23bcf20b21cc143785fc6c92b152f3fa7fbe6ce08d344d6` |
| `canvas/npm/win32-x64-msvc/package.json` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/npm/win32-x64-msvc/package.json) | `c832c82a4532815823bc620bd9f94ae987f5b96f24fdcf9fc9ad938726715091` |
| `canvas/package.json` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/package.json) | `7c511d4241f79ca851bc2432943a95ff3c48e58235e600586f21dd51798943e5` |
| `canvas/rust-toolchain.toml` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/rust-toolchain.toml) | `fb78575459b9bcd19b0b7e85fd53e6a1c3f9f364b7a6d976d8371cc04c868b98` |
| `canvas/scripts/build-skia.js` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/scripts/build-skia.js) | `1d37e10a9e05e6d414a228787f7974bae15d0835c30bfef4c1aa64160c623692` |
| `canvas/scripts/release-skia-binary.mjs` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/scripts/release-skia-binary.mjs) | `b635329827491fc34254a86c4455b19120b57dde8ded26c26337403e6c9be072` |
| `canvas/scripts/utils.mjs` | [来源](https://raw.githubusercontent.com/Brooooooklyn/canvas/dda1b258dac667b4c66b94bbd4d70aa79ea4503a/scripts/utils.mjs) | `361badbd65b5f6d5eb2e14f912ec04b9da6375dafbe8dce2f5839ae513b431f0` |
| `canvas/skia-release.json` | [来源](https://api.github.com/repos/Brooooooklyn/canvas/releases/tags/skia-1fdbea29) | `255b489e08a280e3f148a09e3e547627180097d498caeab38a0da6674ecd9992` |
| `canvas/tree.json` | [来源](https://api.github.com/repos/Brooooooklyn/canvas/git/trees/dda1b258dac667b4c66b94bbd4d70aa79ea4503a?recursive=1) | `31ac368f1c13227dd98e564aa68bf39a4e59d0f9b45bac1aef10947e55aba3d4` |
| `npm/canvas-0.1.80.json` | [来源](https://registry.npmjs.org/@napi-rs/canvas/0.1.80) | `a7bccd1c4a07cffb54207e61e8ac7d334f1b0cb4918ca1eaab6050afd5f4f65c` |
| `npm/canvas-attestations.json` | [来源](https://registry.npmjs.org/-/npm/v1/attestations/@napi-rs%2fcanvas@0.1.80) | `cd3d8d9a592e3e5d8c522c2ce502db3bb55ae31e769c6ef7ebdada9899feb8ce` |
| `npm/canvas-win32-attestations.json` | [来源](https://registry.npmjs.org/-/npm/v1/attestations/@napi-rs%2fcanvas-win32-x64-msvc@0.1.80) | `289b3979ddb452d8c91b52d256eb85f1c5fcc8774439a33baedb774e52a7c1f7` |
| `npm/canvas-win32-x64-msvc-0.1.80.json` | [来源](https://registry.npmjs.org/@napi-rs/canvas-win32-x64-msvc/0.1.80) | `a990ae9d21916faa3e50c82449939d6b00e8a34c95212164629469ae96728065` |
| `skia/BUILD.gn` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/BUILD.gn) | `78fce60b8cf4d984ad78f8d89f037929ae3b3dedc9a93b2e085efd618e8453d6` |
| `skia/DEPS` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/DEPS) | `0ead7b96b9e8d11c0cb3b10f21107b3ae6f5495522205addb80e0a3f5968694f` |
| `skia/LICENSE` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/LICENSE) | `5f787c1dee3c56547f09ccc2906ab5f5293c4d8dd6c8654e573216c38e908dbd` |
| `skia/README.chromium` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/README.chromium) | `416631a62f846b9b241867296b57fe20d63494a1450d04f728df27308eb00b02` |
| `skia/third_party/expat/LICENSE` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/third_party/expat/LICENSE) | `cca48bacd6e7ed63f00b42a346bcc8549a460b41efe75d93db350fc882f54dca` |
| `skia/third_party/freetype2/BUILD.gn` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/third_party/freetype2/BUILD.gn) | `69acb188214f40ce994da58be5f2341ff6455b99a48235e7d275536cd885e6ed` |
| `skia/third_party/harfbuzz/LICENSE` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/third_party/harfbuzz/LICENSE) | `cca48bacd6e7ed63f00b42a346bcc8549a460b41efe75d93db350fc882f54dca` |
| `skia/third_party/icu/BUILD.gn` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/third_party/icu/BUILD.gn) | `4bdeab72453dd04d77a5b1654581bf8a4c4889ed2ed6ca091c8ad64d63ab10fd` |
| `skia/third_party/icu/SkLoadICU.cpp` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/third_party/icu/SkLoadICU.cpp) | `b6fdebfb084df90f2d6b5872cd52fb37132fc8b8d8de61ba8bc846a7a1c12455` |
| `skia/third_party/libjxl/BUILD.gn` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/third_party/libjxl/BUILD.gn) | `46f1c38524b5982a1c20c8959c324542f349875751c249de5e6c66bacc80e1f7` |
| `skia/third_party/libpng/BUILD.gn` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/third_party/libpng/BUILD.gn) | `4c0bcb92489e5393b87dcd0916b1e2a23aa023417aacaaeae3d0a71d921731f4` |
| `skia/third_party/libwebp/BUILD.gn` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/third_party/libwebp/BUILD.gn) | `66cfc348d66ccff2b6d083e2f16ea1641a11f6f98927a28da8f113932a4b51a4` |
| `skia/third_party/wuffs/LICENSE` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/third_party/wuffs/LICENSE) | `e59bb5c5c6ba426a9ac4ba9fe667ad14c5166b12aa25be8af1d122b14fbe2e36` |
| `skia/third_party/zlib/BUILD.gn` | [来源](https://raw.githubusercontent.com/google/skia/1fdbea293a53b270e3f5e74c92cc6670d68412ff/third_party/zlib/BUILD.gn) | `7f8accc36d1f560553ad4eb0d0383816ee3b317830ff455c42d85ffe3f7e82b6` |
| `skia/tree.json` | [来源](https://api.github.com/repos/google/skia/git/trees/1fdbea293a53b270e3f5e74c92cc6670d68412ff?recursive=1) | `c83c34ee397e64180462daa588f52435acc434b107133a7be75c73601a07b6f0` |
| `third-party/brotli/LICENSE` | [来源](https://skia.googlesource.com/external/github.com/google/brotli.git/+/6d03dfbedda1615c4cba1211f8d81735575209c8/LICENSE?format=TEXT) | `3d180008e36922a4e8daec11c34c7af264fed5962d07924aea928c38e8663c94` |
| `third-party/expat/expat/COPYING` | [来源](https://chromium.googlesource.com/external/github.com/libexpat/libexpat.git/+/8e49998f003d693213b538ef765814c7d21abada/expat/COPYING?format=TEXT) | `31b15de82aa19a845156169a17a5488bf597e561b2c318d159ed583139b25e87` |
| `third-party/freetype/docs/FTL.TXT` | [来源](https://chromium.googlesource.com/chromium/src/third_party/freetype2.git/+/1518bc83d26b434031bd12c706ac3c7dab3902fd/docs/FTL.TXT?format=TEXT) | `5a5ee54c5001bbad1cdc1a57cc3dd4c42199b2da09d39c7ee41fab002d02967f` |
| `third-party/freetype/docs/GPLv2.TXT` | [来源](https://chromium.googlesource.com/chromium/src/third_party/freetype2.git/+/1518bc83d26b434031bd12c706ac3c7dab3902fd/docs/GPLv2.TXT?format=TEXT) | `c4120c6752c910c299e3bd9cb3a46ff262c268303ca2069b61f92f10a5656c18` |
| `third-party/freetype/LICENSE.TXT` | [来源](https://chromium.googlesource.com/chromium/src/third_party/freetype2.git/+/1518bc83d26b434031bd12c706ac3c7dab3902fd/LICENSE.TXT?format=TEXT) | `bd36c8b474855fa294c2ec5c184544478ef3720aad37d65a6296a4f264fd2d3b` |
| `third-party/harfbuzz/COPYING` | [来源](https://chromium.googlesource.com/external/github.com/harfbuzz/harfbuzz.git/+/08b52ae2e44931eef163dbad71697f911fadc323/COPYING?format=TEXT) | `ba8f810f2455c2f08e2d56bb49b72f37fcf68f1f4fade38977cfd7372050ad64` |
| `third-party/highway/LICENSE` | [来源](https://chromium.googlesource.com/external/github.com/google/highway.git/+/424360251cdcfc314cfc528f53c872ecd63af0f0/LICENSE?format=TEXT) | `43070e2d4e532684de521b885f385d0841030efa2b1a20bafb76133a5e1379c1` |
| `third-party/icu/LICENSE` | [来源](https://chromium.googlesource.com/chromium/deps/icu.git/+/364118a1d9da24bb5b770ac3d762ac144d6da5a4/LICENSE?format=TEXT) | `17510cf7a58b4879b887ec05a45d72cf1b73544dd9ec7e72f20110ed104229ee` |
| `third-party/libjpeg-turbo/jconfig.h.in` | [来源](https://chromium.googlesource.com/chromium/deps/libjpeg_turbo.git/+/e14cbfaa85529d47f9f55b0f104a579c1061f9ad/jconfig.h.in?format=TEXT) | HTTP 404 |
| `third-party/libjpeg-turbo/LICENSE.md` | [来源](https://chromium.googlesource.com/chromium/deps/libjpeg_turbo.git/+/e14cbfaa85529d47f9f55b0f104a579c1061f9ad/LICENSE.md?format=TEXT) | `96f5b328adbb78eeaaec6980d73fd558cb1e4d62560ed615646bc3cf5e532430` |
| `third-party/libjpeg-turbo/README.ijg` | [来源](https://chromium.googlesource.com/chromium/deps/libjpeg_turbo.git/+/e14cbfaa85529d47f9f55b0f104a579c1061f9ad/README.ijg?format=TEXT) | `75815e3bf6484201a3c3d17a1bbf10f2e8e3237f84df10a2357ea896db2a81d6` |
| `third-party/libjxl/LICENSE` | [来源](https://chromium.googlesource.com/external/gitlab.com/wg1/jpeg-xl.git/+/a205468bc5d3a353fb15dae2398a101dff52f2d3/LICENSE?format=TEXT) | `8405932022a556380c2d8c272eff154a923feb197233f348ce5f7334fb0a5ede` |
| `third-party/libjxl/PATENTS` | [来源](https://chromium.googlesource.com/external/gitlab.com/wg1/jpeg-xl.git/+/a205468bc5d3a353fb15dae2398a101dff52f2d3/PATENTS?format=TEXT) | `91915f8ae056a68a3c5bdf05d9f6f78bb6903e27a8ca3a8434c9e4ac87300575` |
| `third-party/libpng/LICENSE` | [来源](https://skia.googlesource.com/third_party/libpng.git/+/ed217e3e601d8e462f7fd1e04bed43ac42212429/LICENSE?format=TEXT) | `7317e078e2d3b5d7ba5a6159e650945153262b44b76f6700f8e9edb261c5143e` |
| `third-party/libwebp/COPYING` | [来源](https://chromium.googlesource.com/webm/libwebp.git/+/845d5476a866141ba35ac133f856fa62f0b7445f/COPYING?format=TEXT) | `5aec868f669e384a22372a4e8a1a6cd7d44c64cd451f960ca69cc170d1e13acf` |
| `third-party/libwebp/PATENTS` | [来源](https://chromium.googlesource.com/webm/libwebp.git/+/845d5476a866141ba35ac133f856fa62f0b7445f/PATENTS?format=TEXT) | `cc3273e0694ea5896145e0677699b53471b03ea43021ddc50e7923fbb9f5023c` |
| `third-party/wuffs/LICENSE` | [来源](https://skia.googlesource.com/external/github.com/google/wuffs-mirror-release-c.git/+/e3f919ccfe3ef542cfc983a82146070258fb57f8/LICENSE?format=TEXT) | `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30` |
| `third-party/zlib/LICENSE` | [来源](https://chromium.googlesource.com/chromium/src/third_party/zlib/+/646b7f569718921d7d4b5b8e22572ff6c76f2596/LICENSE?format=TEXT) | `e1cfcc55c325b3f78cf55df9664abaa066e2271dffe8213347d9fccdfbac8f2c` |
