# B45-T5 Diagnostic Extension — D5/D6

你是执行任务，不是项目主控。原TASK B45-T5，不新建任务/线程/worktree。PARENT Batch4.5。唯一主控及准确return target：01a0db0e-c950-79e0-8e11-07155e0742f2。旧Master永远只读。模型gpt-5.6-sol/medium；此任务为跨Windows路径/测试环境/CI的高风险工程定位，既有产品规格不变。

原thread01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9；工作目录E:/CodexWorkspace/CodexWorktrees/b4-qa/public-source；原branch codex/b45-t5-integration；精确BASELINE17aba5da455838d7a20e75e4160f597d291200a0。Master已核对clean tracked，tools/.github/核心LAN源码与公开治理HEAD0e9543479bce2e41eae75d15b6e332179e1d0101一致。不要checkout/reset/清理原未跟踪.test-work。只local commit [skip ci]，禁止push/Hosted/main/tag/Release/新Agent或任务。显式workdir，不在Primary改代码。

先读Primary公开目录当前AGENTS.md/PROJECT.md以及batch-4.5/DIAGNOSTIC-EXTENSION-APPROVAL.md完整19节、HOSTED-STOPLOSS-20260927.md、evidence/diagnostic-run-36288039798.json、SPEC.md、COMPATIBILITY-APPROVAL.md。本卡与最新批准决定优先于自己工作树历史冻结指令。不得读原内部SPXT、真实业务/凭据或操作真实开发机NIC/注册表/Firewall，不提权，不下载F3/候选发行包。

唯一当前目标：以证据区分Run36288039798@4f52e8759d8ddd20b2a9883fd267a98ced27fba1的PORTABLE/Firewall Go有效fixture被拒绝，究竟是Hosted路径表示/测试环境问题还是fixture违反真实生产契约。失败发生于tools/windows-firewall/build.ps1内部go test ./...，早于helper compile。3失败：TestInstallIdentityAndTampering/HELPER_PATH_INVALID，TestBoundConfigMustMatchRequest/INSTANCE_BINDING_INVALID，TestRegistrationAndINIContracts/exact_registry_and_UTF16_INI_accepted/REGISTRATION_INVALID。t.TempDir或短名只是候选原因，不得写成已确认根因。

允许修改：测试环境/合成fixture布局/测试专用诊断，tools/windows-portable/ci-lan.ps1、tools/windows-firewall/build.ps1中的测试驱动及对应测试、新测试专用辅助脚本、必要最小LAN workflow/setup-v3调度接线、对应本任务RESULT。允许在原T5范围内协调实际入口；若需改T4测试，由Master明确协作，先发需求不要私自跨生产模块。生产path/registration/binding/CLI whitelist/Firewall规则/Runtime schema/Server/Launcher/升级身份与事务语义必须逐字节保持，未经根因证据不得改任何生产接受条件。本任务不重做T1—T4、不加泛化产品能力。

先完成11类本地反例：规范绝对路径合法；真实program目录层级合法；独立合法instance；精确registration/INI binding；lexical alias拒绝；shortpath/等价别名按原策略；reparse/junction异常拒绝；install/instance重叠拒绝；registry/INI不一致拒绝；helper不在可信program位置拒绝；非预期TEMP表示输出固定原因。不可删原反例，不允许skip冒PASS。只用owned synthetic roots/loopback，无真实系统配置修改。无法实际创建某Windows条件时保留证据缺口，不伪造实测；优先安全模拟底层API加真实可运行案例。

固定诊断只允许白名单stage/reason，不输出实际路径/用户目录/runner路径/registry或INI正文/hash原值/raw error/stack/stdout-stderr原文/secret。要覆盖实际build.ps1入口的preflight、Go tests、compile；原Go原始输出可能含t.TempDir路径，必须在受控捕获中安全分类，不向Hosted日志或Artifact泄露；不能吞错、将failure改warning或隐藏fail/skip。诊断report严格schema，未知错误固定INTERNAL并非零。证据若证明环境问题，可在真实可存在的规范物理路径创建隔离安全测试根，设置并恢复TEMP/TMP/GOTMPDIR等，不用生产中特殊case放宽校验。subst/physical、short/long、lexical、realpath、reparse/volume root等分别辨别。

必须通过实际build.ps1入口本地可运行验证，使用固定Go1.27.1及合成构建身份；可只编译临时测试helper到本任务owned .test-work，用完保持证据、不留发行包。已核验Go缓存可只读使用E:/CodexWorkspace/CodexWorktrees/f8bd/public-source/.test-work/b4-t4-go-fast/go/bin/go.exe；禁止修改他人缓存。规范本任务GOCACHE/GOTMPDIR/TEMP/TMP。全go test与go vet、正反例、测试报告安全分类及driver非零传播均须验证，记录精确命令、真实退出码与实际完整SHA，不能拼接或猜SHA。

D5应为最小实际build.ps1/fixture/compile门禁，不重复完整Setup或消耗Full；使用已注册setup-v3入口的独立LAN diagnostic扩展模式，保证历史工作流条件不变、contents/actions只读、手动本分支。需固定Go/Node依赖时保持现有pin，不用模拟exit0代替build。测试/编译成功报告只能说明当前阻塞越过，不称整个LAN候选通过。给Master可核验的D5输入、固定阶段/结果及Artifact allowlist。D6只有D5更深证据后最小修改及Review才可运行；无同commit同失败重试。

预算：历史专项4/4封存；新增D5/D6合计最多2，目前0；Full0/2、QA0/2不可挪用。Execution不能dispatch。Master通过9项Review门禁后才D5；当前问题越过且完整候选条件具备后才Full。若新问题必须额外诊断/放宽安全/改产品或无法安全恢复，回Master决策，不自行扩大。

先向Master发送简短有证据的定位计划/最小分工需求，然后持续完成获批本地工作。结果写tasks/B45-T5-DIAGNOSTIC-EXTENSION-RESULT.md，local commit后send_message_to_thread准确Master并核验返回ID。字段：TASK ID、PASS/FAIL/BLOCKED、完成、修改文件、逐项11反例/全Go/vet/driver/privacy证据、生产冻结文件hash/diff、local commit、风险/未实测、D5建议输入、需要Master处理。送达失败标DELIVERY FAILED保留现场，由Master read/RESULT/git兜底。不要生成网页版交接卡。

Master后续精确范围授权：原T5可直接修改tools/windows-firewall/policy_test.go及必要firewall_behavior_windows_test.go，仅测试fixture根、11类反例和固定诊断；无需新建T4任务。生产5文件/go.mod保持。KSESSION_FIREWALL_TEST_ROOT如采用只能测试读取；根验证/ownership/清理边界、原TEMP替换前分类、独立go test与build入口均需核验，不能预设根因。
