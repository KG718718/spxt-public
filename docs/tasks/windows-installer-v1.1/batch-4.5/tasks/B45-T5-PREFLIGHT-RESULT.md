# B45-T5-PREFLIGHT 结果

## 结论

**状态：BLOCKED / NEED PARENT DECISION。**

第27节决策条件真实触发。原因不是“候选构建产生了新 hash”本身，而是现有安装器的受信升级契约只允许 `1.1.0-beta.1 -> 1.1.0-beta.2`：来源版本、目标版本、beta.1 的两个批准来源、源码 commit/tree、五个精确锚、事务计划和 Setup 分支均为封闭固定值；Setup 还主动拒绝已登记的 beta.2。要完成第26节已批准的“已有 beta.2 -> LAN 候选”，必须改变升级兼容的受信来源和路由，不能仅把输出安装器版本改成 beta.3。

没有发现必须修改 `package.json` / appVersion、业务 data contract、Runtime identity **契约结构**、业务 schema 或主要技术栈的证据。LAN 候选的新 Runtime/Launcher/Program 字节及其新 hash 属于新候选自身身份生成；真正触发第27节的是：安装器必须新增或替换“允许从哪个精确 beta.2 身份升级”的信任决策。

第13节未触发架构停止条件。现有 Node 服务已经把请求处理集中在同一个 `handleRequest`，进程内业务状态也由模块级状态共享；可建立两个 `http.Server` 对象，复用同一请求入口与状态，分别绑定 `127.0.0.1:<port>` 和选中私网 IPv4 的同一端口。未发现必须 bind `0.0.0.0`、引入 Windows Service、改变主要技术栈或降低安全门禁的证据。本轮未实际监听，实际 Windows 双地址同端口、部分绑定失败回滚、启动任务只执行一次、网络变化重绑仍须后续专项测试。

## 范围与身份

- TASK ID：B45-T5-PREFLIGHT
- 角色：只读工程预检，不是项目主控
- Parent：Batch 4.5 LAN Host Deployment
- Baseline / HEAD：`a91cf9e461c396b6cf27bf2b7ee1b32a0f1e9361`
- Branch：`codex/b45-t5-preflight`
- 工作树：按任务卡使用指定 B4-QA 复用 checkout；报告不记录开发机绝对路径
- 受验 beta.2 历史身份：source `c8886e6b6d413c2fd73d6716621d07a80b337e58`、Run `36246132535`、Artifact `10907910968`（来自 `PROJECT.md:8-19`；本轮未下载 Artifact）
- 只修改本报告；未修改生产代码、测试体系或其他文档，未运行 Hosted/Full，未访问真实实例、注册表、网络、业务数据或发行包

## 已确认事实

### 1. 版本名称与 appVersion 是两套概念

- 根 `package.json:2-4` 的应用版本为 `1.0.0`。
- `tools/windows-installer/toolchain.json:7-8` 的安装器版本为 `1.1.0-beta.2`，AppId 为 `KSESSION-Beta-Installer-v1`。
- `tools/windows-installer/build.cjs:26-36` 分别读取 `pkg.version` 与 `pin.installerVersion`，并将二者分别写入 build-info；`build.cjs:80-84` 才把安装器版本用于 EXE 名称和 Artifact 元数据。
- `tools/windows-installer/setup.iss:14-23` 的 `AppVersion` 是 Inno 安装登记所用的 installer version，不等于根 package appVersion。

因此，以下项目属于候选 installer 版本改名/输出适配：toolchain 的 `installerVersion`、Inno `AppVersion/AppVerName/OutputBaseFilename/VersionInfoVersion`、候选文件名、install-info、Artifact 校验器和相应测试期望。它们本身不要求把根 appVersion 从 `1.0.0` 改掉。

### 2. 仅改 installerVersion 不能让 beta.2 通过现有升级门禁

现有受信链包含下列硬约束：

- `tools/windows-installer/upgrade-detection/index.cjs:11-13` 固定 beta.1 基线 commit/tree和两个批准 profile ID。
- 同文件 `45-66` 固定 `fromInstallerVersion=1.1.0-beta.1`、`targetInstallerVersion=1.1.0-beta.2`、appVersion `1.0.0`、data contract `1`、beta.1 source commit/tree及五类精确 hash。
- 同文件 `81-113` 最多允许两个 profile，且必须完整覆盖上述两个 beta.1 来源；未知 beta.2 profile ID 会拒绝。
- 同文件 `269-270` 对已登记 beta.2 返回 `VERSION_UNSUPPORTED`；`303-345` 继续验证旧安装的 manifest、完整 program inventory、build-info、Runtime manifest与Launcher hash，不能只看登记版本。
- `tools/windows-installer/fresh-identity.cjs:9-36` 只会从 fresh beta.1 build与历史 beta.1 evidence生成该封闭 bundle。
- `tools/windows-installer/setup.iss:393-420` 写出的请求/计划固定 beta.1 -> beta.2；`573-576` 对当前 beta.2 明确记录 `KSESSION_REJECT_REGISTERED` 并终止。
- `tools/windows-installer/upgrade-transaction/index.cjs:8-14,52-72` 固定目标 beta.2且只接受来源 beta.1；`103-115` 又要求 staged manifest版本等于固定目标。

这表明 beta.2 -> beta.3 至少需要：

1. 明确唯一受信 beta.2 来源（不能用“任何 beta.2”或仅 source commit/tree替代精确安装后身份）；
2. 取得该来源安装后的 program manifest/inventory、build-info、Runtime manifest和Launcher精确锚；
3. 改造或新增只接受 beta.2 -> beta.3 的 policy/bundle生成与验证路径；
4. 改变 Setup 当前拒绝 beta.2 的分支和升级计划；
5. 改变事务层固定的 from/to，同时保持现有失败回滚与数据保护断言。

以上是 upgrade compatibility 的实质修改，而非输出文件改名，所以符合 `SPEC.md:465-476` 的停止条件。第26节批准了目标，但第27节明确保留了当工程发现必须改兼容契约时的网页版决策门禁；不能用第26节反向消除第27节。

### 3. 纯函数反例

仅使用仓库已审查 policy作为输入模板，路径全部为合成值；没有访问注册表、安装目录或发行包。实际命令通过 Node stdin调用当前 `upgrade-detection/index.cjs`：

```text
beta2-snapshot=VERSION_UNSUPPORTED/21
beta2-policy=POLICY_INVALID/40
beta2-bundle=BUNDLE_INVALID/41
```

含义：

- 将唯一登记版本设为 beta.2，当前 validator在任何磁盘访问前即拒绝；
- 将 policy改为 beta.2 -> beta.3，固定 policy validator拒绝；
- 新增 beta.2 profile ID，当前封闭 bundle validator拒绝。

该反例只证明当前策略不能接受 beta.2，不证明应信任哪一个 beta.2 来源。

### 4. Runtime identity 与 data contract

- 根 appVersion仍是 `1.0.0`（`package.json:3`）。
- 当前 detector对旧安装 Runtime验证的是格式、schema、appVersion、平台、source commit/tree和构建来源，以及精确 Runtime manifest hash（`upgrade-detection/index.cjs:334-345`）。
- 事务 data contract仍固定 `1`（`upgrade-transaction/index.cjs:8-11`）；Batch 4.5第26节又明确禁止业务 schema migration。

基于当前证据，beta.3可以保持 appVersion `1.0.0`、dataContractVersion `1`、Runtime manifest schema和AppId/登记键不变。LAN生产代码变化会自然产生新的候选 source/tree、manifest和hash，但无需改变 Runtime identity字段集合或语义。若后续实现发现必须改变这些契约，应再次按第27/35节停止，不能由本报告预先批准。

### 5. 双明确 listener 的现有架构可行性

- `server.js:63-65` 当前只读取一个 HOST/PORT，默认 `127.0.0.1`。
- `server.js:5638-5647` 创建 bootstrap/config handler和一个 `http.Server`；请求委托给独立的 `handleRequest`。
- `server.js:5648-5656` 的请求入口共用模块级 `needsInitialization` 等状态，但当前 bootstrap在通用初始化拒绝前执行，尚没有依据 listener/remote peer区分本机与LAN。
- `server.js:9590-9594` 当前只启动一个 listener，并在该 listener回调中启动后台任务。

纯对象反例（未调用 `listen`、未占用端口）实际结果：

```text
dual-server-shared-handler=PASS/no-listen
```

两个 `http.Server` 可以引用同一 handler而保持为两个独立 server对象。后续实现仍必须：在进入 bootstrap之前按 local/LAN listener及 `req.socket.remoteAddress` 执行首Admin/selected subnet guard；协调两个 bind的原子启动和部分失败关闭；后台任务只启动一次；health/port报告明确对应两个 listener；网络变化只重绑选中私网地址。上述属于已批准架构内的工程实现与测试，不构成必须 `0.0.0.0` 或主要技术栈变化的证据。

## 基于证据的推测

- 受验 beta.2 F3是第26节“已有 beta.2”的最强候选受信来源，因为项目已永久记录其 source/run/Artifact身份且用户完成实机验收；但仓库当前没有为它固化等价于 beta.1 historical profile的安装后五锚 evidence。本轮没有下载 Artifact，故不能声称这些锚已取得。
- 单纯沿用 beta.1 的两个 profile名称/数量并把版本文字替换为 beta.2，会混淆历史来源语义；单个 bundle同时承载 beta.1和beta.2也不符合当前所有 profile共用同一固定 from/to的结构，且可能扩大直接升级范围。

## 可选方案与影响

### 方案A（建议）：beta.3只支持受验F3 beta.2 -> beta.3，beta.1采用分阶段升级

- 在受控 Hosted Windows中从已验 F3 Artifact取得非敏感、精确安装后锚，建立新的封闭 beta.2 source profile；不接受任意 beta.2、任意同 commit重建或仅版本号匹配。
- beta.3 Setup只路由 beta.2 -> beta.3；旧 beta.1 detector/bundle及其测试作为历史 beta.1 -> beta.2路径保留，不把 beta.1直接纳入 beta.3。
- beta.1用户若需升级，先使用已冻结的 beta.2安装器完成原批准路径，再使用 beta.3。
- 保持 appVersion `1.0.0`、data contract `1`、Runtime identity schema、AppId/登记键、事务安全和回滚语义不变。
- 优点：最窄支持面，与第26节目标一致，避免把 beta.3变成未经批准的 beta.1跨版本升级器。成本：需要明确保留并可取得 beta.2安装器；Hosted取证和两段升级回归增加成本。

### 方案B：beta.3同时直接支持 beta.1和beta.2

- 按登记版本先分流到两个相互独立的精确 policy集合，分别验证 beta.1和 beta.2，再进入目标 beta.3的事务。
- 不能把不同来源版本塞入当前单一 bundle；需版本分派、独立 bundle/schema或等价的严格隔离，并补跨路径回滚矩阵。
- 优点：用户一步到 beta.3。风险/成本：扩大兼容范围，保留更多历史身份与测试矩阵；这是新的产品升级支持承诺，不应由Execution自行决定。

### 方案C：beta.3只支持 beta.2，并删除/覆盖旧 beta.1路径

- 实现量可能较小，但会丢失现有已验证的 beta.1 -> beta.2工具/回归资产，且与“历史身份永久保留”容易混淆。
- 不建议。即使 beta.3不直接接受 beta.1，也应保留旧代码/证据的历史可追溯性，而不是改写或删除。

## 需要网页版决定的问题

请明确批准以下之一：

1. **建议批准方案A**：beta.3只接受受验 F3（source `c8886e6...` / Run `36246132535` / Artifact `10907910968`）形成的精确 beta.2安装后身份；不接受任意 beta.2；beta.1必须先经冻结 beta.2路径分阶段升级。允许在受控 Hosted中取得并固化该非敏感精确锚，并在不改 appVersion/data contract/Runtime identity schema的前提下，将安装器、detector、bundle生成、Setup路由和事务 from/to改为 beta.2 -> beta.3。
2. 或批准方案B：beta.3直接兼容 beta.1和 beta.2，并接受相应扩大测试矩阵与兼容承诺。

在收到明确决定前，依赖该兼容策略的 B45-T5实现及 beta.3构建应暂停。T1-T4中不依赖升级信任来源的工作是否继续，由唯一Master按依赖关系决定；不得在实现中先行选择受信 beta.2范围。

## 测试与未覆盖项

- PASS：当前固定 validator三项合成反例，得到固定拒绝码21/40/41。
- PASS：两个 `http.Server`共享同一 handler的纯对象检查；明确未监听。
- NOT RUN：完整26/742、Runtime、Launcher、Portable、Setup、Hosted、真实注册表/安装/升级、真实LAN、Firewall。
- 本任务的 BLOCKED表示触发第27节产品决策门禁，不表示 LAN产品实现失败，也不表示Batch 4.5已验收。

## 已知风险

- 如果只按 `DisplayVersion=beta.2` 接受升级，会放宽到未知/篡改/非受验beta.2，破坏Batch 4建立的精确身份门禁。
- 如果复用旧 profile名称但改变含义，会使历史证据不可追溯，并可能让测试“通过”却验证了错误来源。
- 如果双 listener实现只在路由内部判断而没有在 bootstrap之前做peer guard，LAN客户端仍可能抢占首Admin；现有 `server.js:5655-5656` 的顺序必须特别审查。
- 两个 listener共享状态可行不等于启动生命周期已正确；部分 bind成功、网络变化、后台任务重复、关闭/恢复都需失败优先测试。
