# 许可证与封装交付

## 2026-09-11 实际分发边界

- 用户已确认在线安装；已验收产物 online-installer-candidate 的内层 K-SESSION-online-setup.zip 只含经审查源码、安装/启动脚本、锁文件、清单、MIT 和第三方说明。无 Node、npm 已安装二进制、Python、OCR 引擎或模型。
- Windows 安装器从官方 HTTPS 来源取得固定 Node 24.21.0，校验归档与 node.exe 的 SHA256；保留官方原始 LICENSE。npm 仅使用官方注册表、精确锁文件与 integrity，保留依赖原始许可文件。
- 在线下载不等于免除第三方许可；没有把包级 MIT 当成全部原生组件声明已完成。原生图形组件的完整再分发审查仍是未来离线整包的前置项，本候选不分发这些二进制。
- 核心程序档案 application-core-only-not-installer 与在线安装器是不同产物，均不含实例或公司资产。外层 artifact 的合成截图、测试报告不会进入使用者安装 ZIP。
- 原始项目 MIT 正文未修改。Windows CRLF 与 Git LF 的字节哈希不同，许可门禁按规范化原文核对；不得误称变更授权条款。第三方作者署名保留。
- [实际封装、逐文件清单与验收](tasks/public-v1/batch-16-online-installer.md)，[CI](https://github.com/KG718718/spxt-public/actions/runs/34605839563)。候选未签名、未创建 Release；文件哈希不是法律权属或安全性保证。

## 用户本轮要求

封装时必须完善许可证，使用已确认的标准 MIT 正文，不自创限制条款：允许使用、修改、商用与再分发（包括销售），需保留版权和许可声明，并含无担保条款；不要求使用者公开其修改。[MIT 原文](https://opensource.org/license/mit)

仓库公开可见不等于已经授予完整开源使用许可；不能把 GitHub 可查看/分叉等同于任意商业发行权。[GitHub 说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)

## 当前已纳入的技术门禁

- 托管 Windows 根据精确 package-lock 对实际已安装依赖核对名称、版本、声明许可证和原始 LICENSE/COPYING/NOTICE。
- 没有原始许可文件、需要另行审查的许可或版本不匹配时，检查失败；不能仅凭 npm audit=0 声称许可合规。
- 原始许可文本与声明、清单及 SHA-256 只保存到云端测试产物，不落地开发机；不带业务数据、凭据或公司截图。
- 未安装的平台可选依赖单列，不冒充已经随当前安装包分发；最终包应再次按实际内容生成清单。
- 第三方作者/组织署名必须保留，不能为了去公司品牌而删除依赖作者版权声明。Apache-2.0 对随附 NOTICE、许可副本等有分发要求。[Apache 原文](https://www.apache.org/licenses/LICENSE-2.0)

## 后续分发方式变化时继续适用的检查

1. 已落实主 MIT 许可证、中性项目贡献者署名及根目录 LICENSE、README、package.json、锁文件根记录一致性；不代表已取得未知第三方权利或已核实特定公司权属。
2. 安装包随附 LICENSE、THIRD_PARTY_NOTICES 及实际分发依赖的原始许可/NOTICE。许可证门禁不能只存在于源码仓库。
3. 如果打包 Node.js、OCR/Python、模型、前端库、字体或图标，分别检查实际版本与原始声明；当前依赖清单不覆盖它们。
4. README 说明支持范围、无担保和未完成验收；不要把程序封装当成法律合规保证。
5. 本页仅工程交付建议与检查记录；复杂版权、商标、专利或公司权属问题需由权利人/专业顾问确认。

尚未创建 Release、合并 main 或授权部署。

## 2026-09-10 依赖许可缺项修复记录

首次托管检查 34463871251 在 @napi-rs/canvas-win32-x64-msvc@0.1.80 未随包附 LICENSE 时按预期失败，后续测试未执行，不记通过。已核对该平台包与 @napi-rs/canvas@0.1.80 的 npm 元数据：同一官方仓库、同一 gitHead dda1b258dac667b4c66b94bbd4d70aa79ea4503a。父包附带该提交的原始 MIT 正文。

新增精确映射，仅允许该包/版本使用同版本父包原始 LICENSE，SHA-256 必须为 8802fecf9da4367bc23bcf20b21cc143785fc6c92b152f3fa7fbe6ce08d344d6；任何版本或正文改变均要求重新审查，不给所有缺文件依赖通用豁免。原第三方作者署名保留。

这只补齐 npm 包层级正文来源；该原生图形二进制还涉及 Skia 等原生组件，完整封装前必须继续核对其实际分发许可/声明。inventory 明确 nativeBinaryReview=pending-before-distribution，不将本次包层级检查标成完整原生二进制合规通过。
