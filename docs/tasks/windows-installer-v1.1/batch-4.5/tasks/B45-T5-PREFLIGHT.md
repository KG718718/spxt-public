# B45-T5-PREFLIGHT — 自包含派单卡

你是执行任务，不是项目主控。ROLE只读工程预检；PARENT Batch4.5；难度L2，gpt-5.6-sol / medium。唯一Master与return target：01a0db0e-c950-79e0-8e11-07155e0742f2；旧019fa7e9-f46b-7192-9052-cd0aac7c2cc5永久只读。

公开repo KG718718/spxt-public；精确baseline a91cf9e461c396b6cf27bf2b7ee1b32a0f1e9361；local branch codex/b45-t5-preflight；复用managed b4-qa/public-source checkout，实际绝对路径由主控工具派单明确给出。旧QA线程已idle并冻结、tracked clean，旧codex/b4-qa@caf034f分支及未跟踪证据保留。新执行thread 01a0dfe6-e0f4-70f1-bea3-7b162d6e84e9。先核验branch/HEAD/status，先读当前AGENTS/PROJECT及本Batch SPEC/PLAN；旧Batch4停止文字不取代已批准1—38节。

## 单一目标

独立核查第27节：仅改installerVersion到beta.3能否满足第26节beta.2升级；是否必须修改package/appVersion、data contract、Runtime identity或upgrade compatibility。检查upgrade-detection固定from/target/source/tree/profiles及build固定beta.2，区分单纯版本改名与新增可信来源/锚/元数据接纳。不要把普通产物hash改变机械归为Runtime契约变化。列出保留beta.1路径和新增beta.2路径的选择与影响。另只读核查server.js是否能共享同一应用/instance建立127.0.0.1与选定privateIPv4两个listener；有无必须0.0.0.0或主要技术栈变化的证据。

## 修改及测试边界

只准写tasks/B45-T5-PREFLIGHT-RESULT.md：事实、准确文件行号、纯函数反例命令/结果、结论、选项及决策问题。可在专用合成临时目录做无副作用validator反例；不得操作实际安装/注册表/网络/业务instance，不能修改生产代码/测试体系或其他文档。无内部材料、真实业务/身份/凭据，无发行包下载，无Hosted或提权。无需无关Full测试。共享资源零占用，不启动实际listener、不修改防火墙。

## 停止及回单

确认必须改第27节项目或第13节架构则BLOCKED / NEED PARENT DECISION，提供证据，不自行放宽；未触发可PASS仅预检，不称产品PASS。local commit只报告并[skip ci]，不push/merge/main/tag/Release、不创建后代thread/Agent/worktree。先send_message_to_thread到准确Master并核验目标，再最终结构化TASK ID/状态/完成内容/修改文件/测试结果/local commit/已知风险/需要主控处理。失败记录RESULT并保留commit，明确主控未收到；Master wait/read/RESULT/worktree/commit兜底恢复，Review后才整合。Execution不生成网页版交接卡。
