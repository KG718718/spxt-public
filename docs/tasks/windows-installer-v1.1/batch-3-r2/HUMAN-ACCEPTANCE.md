# Batch 3-R2 人工十步（用户确认通过）

2026-09-21用户在“项目协作治理调整”任务书中明确反馈“1—10全部正常”，批准Batch 3 PASS — Windows 10 x64 Beta Track。以下十项均按用户人工反馈记录PASS，包含目录选择、无UAC/无CMD、原账号/附件保留；不是Agent本轮复测。对应下列同一受测commit/原始Artifact。没有新增机器认证，原自动化I01/I02/I09的PENDING由此补齐，原JSON不改。以下保留验收步骤。

本轮新包：[Actions 原始 Artifact 10606870944](https://github.com/KG718718/spxt-public/actions/runs/35514357007/artifacts/10606870944)。登录GitHub后下载并解压，使用其中 K-SESSION-Setup-1.1.0-beta.1.exe。受测源码 e9417f036d0cdf736ff84682556a994040f0de0b；Setup SHA256 49d28d4dbd131b0dd0890e44aea358d75a8406803ff10df808f073d5c2a72af8。仅Beta测试包，不是Release。

只使用本轮最终自动化通过的原始Actions Artifact；身份、run、SHA256以RESULT.md为准。新旧EXE可能同名，不使用旧下载包。
已有Beta安装先停止服务并通过Windows设置卸载程序（保留数据），不支持直接覆盖。只用合成测试账号、附件，不引入真实业务数据。
如果安全策略拦截，记录提示，禁止关闭防护或绕过公司策略。

1. 双击本次新Setup。
2. 确认不询问程序安装文件夹、程序组或多余Ready页面；重要Beta/数据保留提示保留。
3. 确认出现“业务数据与附件保存位置”，默认显示上次位置；首次无记录则原LOCALAPPDATA默认。
4. 浏览选择一个长期测试目录，例如D:\测试 数据\K-SESSION。选其他位置不会自动移动原数据，切换确认应说明这一点。
5. 安装后从桌面启动，确认无UAC、无CMD、浏览器正常。直接双击program内EXE也应指向同一个实例。
6. 创建/使用测试账号，上传一个合成测试附件。
7. 在启动器停止服务，再通过Windows设置卸载程序。
8. 确认所选数据/附件目录仍存在，不删除或外发data.json。
9. 重装：应优先显示上次位置，确认或再次选择同一目录。
10. 原账号可登录、原附件可查看/下载，无需重新初始化。

仅反馈步骤号及可见问题，不发密码、实例文件或附件正文。全部正常后才可建议Batch3 PASS — Windows 10 x64 Beta Track；不自动进入Batch4。
