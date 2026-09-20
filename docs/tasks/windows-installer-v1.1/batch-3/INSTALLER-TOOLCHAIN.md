# Installer toolchain

固定 Inno Setup 6.7.3（官方6.x当前下载版本），不使用浮动latest或机器已有ISCC。
- 上游：https://jrsoftware.org/isdl.php
- 官方不可变Release：https://github.com/jrsoftware/issrc/releases/tag/is-6_7_3
- 下载：https://github.com/jrsoftware/issrc/releases/download/is-6_7_3/innosetup-6.7.3.exe
- 发布：2026-05-26T16:27:57Z，asset430321419，10,592,232bytes。
- SHA256：9c73c3bae7ed48d44112a0f48e66742c00090bdb5bef71d9d3c056c66e97b732。
- 2026-09-20本机实际下载hash一致；Authenticode Valid，签署者Pyrsys B.V.。这只是编译器签名，不代表我们的Setup已签名。
- 原始License.txt已读取：Inno Setup License（modified zlib-like条款）；保留版权/地址，不冒称作者，不改上游二进制。原文随安装层许可和Artifact保留。官网另有商业许可购买建议，本任务不购买证书/许可或宣称已购买。
- https://jrsoftware.org/files/is/license.txt / https://jrsoftware.org/isdl-verify.php
- Node24.21.0、Go1.27.1沿用已固定工具链；仅构建电脑使用npm/Go/Inno，用户只运行Setup及包内Node。
- Inno编译器自身为32位并不意味着应用支持x86：Setup显式ArchitecturesAllowed=x64os、64位安装模式；最终程序是x64。Win11 ARM不纳入目标。

CI精确下载hash + Authenticode有效/签署主体校验后，当前用户工具目录静默安装，不用winget latest。不把编译器/缓存放入最终Artifact。
