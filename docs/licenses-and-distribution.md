# 许可证与封装交付

当前是公开候选，不是已完成的开源发行包。项目主许可证与版权署名等待用户确认，package.json 的 UNLICENSED 是临时保留权利标记；private: true 仅防止误发布 npm，不能代替软件许可证。

## 用户本轮要求

封装时必须完善许可证。建议采用标准许可，不自创含糊条款。MIT 当前仅为提案：允许使用、修改、商用与再分发（包括销售），需保留版权和许可声明，并含无担保条款；不要求使用者公开其修改。是否接受及有权许可的署名需由用户决定。[MIT 原文](https://opensource.org/license/mit)

仓库公开可见不等于已经授予完整开源使用许可；不能把 GitHub 可查看/分叉等同于任意商业发行权。[GitHub 说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)

## 当前已纳入的技术门禁

- 托管 Windows 根据精确 package-lock 对实际已安装依赖核对名称、版本、声明许可证和原始 LICENSE/COPYING/NOTICE。
- 没有原始许可文件、需要另行审查的许可或版本不匹配时，检查失败；不能仅凭 npm audit=0 声称许可合规。
- 原始许可文本与声明、清单及 SHA-256 只保存到云端测试产物，不落地开发机；不带业务数据、凭据或公司截图。
- 未安装的平台可选依赖单列，不冒充已经随当前安装包分发；最终包应再次按实际内容生成清单。
- 第三方作者/组织署名必须保留，不能为了去公司品牌而删除依赖作者版权声明。Apache-2.0 对随附 NOTICE、许可副本等有分发要求。[Apache 原文](https://www.apache.org/licenses/LICENSE-2.0)

## 正式打包前还需完成

1. 用户确认主许可证与有权代表的版权署名；根目录 LICENSE、README、package.json、锁文件根记录一致。该确认不代表已获得任何未知第三方权利。
2. 安装包随附 LICENSE、THIRD_PARTY_NOTICES 及实际分发依赖的原始许可/NOTICE。许可证门禁不能只存在于源码仓库。
3. 如果打包 Node.js、OCR/Python、模型、前端库、字体或图标，分别检查实际版本与原始声明；当前依赖清单不覆盖它们。
4. README 说明支持范围、无担保和未完成验收；不要把程序封装当成法律合规保证。
5. 本页仅工程交付建议与检查记录；复杂版权、商标、专利或公司权属问题需由权利人/专业顾问确认。

尚未创建 Release、合并 main 或授权部署。
