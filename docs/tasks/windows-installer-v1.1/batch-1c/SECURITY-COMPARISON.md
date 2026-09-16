# Batch 1C-R3 安全比较（2026-09-16）

本文件为技术依赖筛查，不是无漏洞保证或法律意见。审查对象仅公开产品候选；没有使用真实PDF、攻击外部系统或运行未知恶意样本。

## 已核实的官方记录

| 来源/编号 | 官方范围/修复 | 本轮处理 |
| --- | --- | --- |
| [Mozilla PDF.js GHSA-wgrm-67xf-hhpq](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq) / CVE-2024-4367 | <=4.1.392；4.2.67修复 | 危险旧版静态否决，绝不为去canvas选3.x或4.1 |
| [Mozilla安全公告MFSA2024-21](https://www.mozilla.org/en-US/security/advisories/mfsa2024-21/#CVE-2024-4367) | 确认PDF.js字体处理类型检查缺陷可造成代码执行 | 交叉核对Mozilla安全记录；不把Firefox版本当npm版本 |
| [Mozilla PDF.js GHSA-hq66-cqwq-w95j](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j) / CVE-2026-16633 | reviewed API明确>=5.6.83且<6.2.108；6.2.108修复 | 拒绝带该受影响引擎且修复证据不足的候选 |
| [GitHub reviewed公告](https://github.com/advisories/GHSA-hq66-cqwq-w95j) | enableScripting开启且没有相关CSP时恶意PDF可在托管域执行JS | 是viewer/script场景，不谎称已经证实本Node纯文本路径可被利用 |

Mozilla仓库security-advisories API本次返回2条。GitHub reviewed API逐版本查询pdfjs-dist@4.8.69、@5.4.296、@6.3.289均返回空数组；原文/时间与SHA256保留于源码外sources/。返回空不能证明没有未知漏洞或未登记者，也不能替代内嵌引擎的谱系审查。

2026公告的Mozilla仓库页面发布日是7月28日，GitHub全局reviewed公告发布日是8月6日，二者不是同一时间字段。其关联[Mozilla Bugzilla 2055885](https://bugzilla.mozilla.org/show_bug.cgi?id=2055885)正文此次未能读取，未据此推演额外技术结论。

## 逐候选判断

| 候选 | 已核实事实 | 判断/尚缺内容 |
| --- | --- | --- |
| 5.4.296 | 已过2024修复版本；低于2026受影响起点；官方Apache-2.0 | 当前基线仍可研究原生许可；本轮没有发现要求立即替换的已知GHSA |
| 4.8.69 generic | 已过2024修复点、不在2026影响段；逐版本查询无已登记命中；无额外native或polyfill | 本次技术Spike安全状态可接受；是历史版本，不等于长期维护批准 |
| 4.8.69 legacy | 同版本安全范围，但DOMMatrix/Path2D警告存在 | 不忽略警告、不作为本轮无警告候选 |
| 6.3.289 legacy | 最新已发布官方版，超过6.2.108修复点；8/8文本通过 | 缺canvas和DOM API警告保留；需后续明确纯文本契约及上游支持边界 |
| 6.3.289 generic | 安全版本范围同上 | Node24实际缺toHex，不能只凭engines字段说可运行 |
| pdf2json4.1.0 | 新发布、Apache-2.0、无npm运行依赖；独立Buffer8/8 | 自带旧PDF.js代码仍有动态Function路径。未发现本库公开GHSA，不代表继承安全修复；未证明漏洞可利用，也未证实修复谱系，不准作为正式选择 |
| unpdf1.8.1 | MIT wrapper、实际内嵌PDF.js6.1.200、CMap仅7/8、partial DOMMatrix | 引擎处于2026高危版本段；不采用。没有证明其Node路径可利用，但也没有足够的上游修复/范围排除证据满足本轮门禁 |

D类库的上游源码：[pdf2json v4.1.0](https://github.com/modesty/pdf2json/tree/v4.1.0)、[unpdf v1.8.1](https://github.com/unjs/unpdf/tree/v1.8.1)。未将下载量作为安全或维护依据。

## 配置和隔离并不等于修复

- 本轮对PDF.js API统一设isEvalSupported:false，关闭运行时字体求值优化，避免将其当成文本提取的必要能力。已核实版本本身也须符合修复范围。
- isEvalSupported与2026公告的enableScripting不是同一参数；没有把前者写成后者的替代补丁。
- 没有加载viewer、DOM渲染、PDF脚本管理器；未搭建CSP页面。本轮不声称用CSP修复了D2。
- 测试网络守卫只说明本次解析无请求尝试；Node权限白名单只限制这次脚本文件访问，不证明PDF引擎能安全处理任意不可信文件。
- 未来生产迁移还应检查超大页数/压缩流、恶意字体、时间/内存耗尽、并发队列与失败回收。8类小型合成样本不是安全模糊测试，也不是资源耗尽防护验收。

## 许可与维护

可行候选包自带Apache-2.0正文，cmaps/LICENSE（Adobe BSD式条款）、standard_fonts/LICENSE_FOXIT（PDFium BSD式条款）、LICENSE_LIBERATION（SIL OFL1.1）均已查验存在并记录SHA256。后续分发必须保留这些原文和归属，不能只带顶层LICENSE。此处确认许可来源明确，不代表已生成最终发行包SBOM。

4.8.69于2024-11-02发布；6.3.289于2026-08-29发布。本次没有取得4.8.x持续安全回补承诺。上级须选择是否接受旧版维护成本，或继续当前官方版本的text-only支持调查。当前正式应用/依赖完全未改，R1原生许可问题不能因为本Spike PASS而自动关闭。

