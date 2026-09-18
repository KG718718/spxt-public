# Build Identity
同一Git commit提供应用、lock、Runtime构建工具、Launcher及portable工具。构建要求工作区这些工具与指定Git blob一致。
fresh Runtime→加入原始Go许可并重建受管manifest→完整Runtime验证→绑定最终manifest SHA编译根Launcher→生成build-info→精确整包hash目录→测试→ZIP→解压到新中文空格路径→再测。
build-info字段：product/qualification/sourceCommit/sourceTree/launcherSourceCommit/runtimeSourceCommit/runtimeManifestSha256/packageLockSha256/nodeVersion/goVersion/GOOS/GOARCH/CGO_ENABLED/buildTimestamp/artifactFormat/platform/launcherSha256。timestamp来自source commit时间，不使用墙钟；Runtime保留构建OS元数据，所以不承诺跨主机位级相同。
EXE不能自我hash嵌入形成循环；绑定Runtime manifest，根build-info记录EXEhash，整包清单和外部ZIP SHA涵盖两者。Go许可在编译前进入Runtime manifest。最终审查对象是Actions ZIP及该次SHA；本机另建包只能辅助。

## Batch2B 实际身份

source/Launcher/Runtime commit均为 `cfc329fb405b1c5e4881e96eb8f2b4f78e8af552`，tree `9a0d6ffec6f3dbafa109f3850cff668dc2191c5a`。
Actions run35294691905 attempt2；Artifact10527372359。
内层Portable ZIP SHA256 `35bda7ac54150622be6673570f065f753d2a6b3665ecd8619678abd771c6db44`，51,285,232 bytes。
EXE SHA256 `3f59920ad1558c1387470367c92b6f7786ac5468076c68555561ebcdcf84d587`，6,930,432 bytes。
Runtime manifest SHA256 `e7e6db666176a542da20433ac6da720d0f69ebf5d925dff0b233bebd448714ae`。
外层Actions archive SHA256 `96a1154d0f8d3e994dabdce477ed8b43e818b79533a3cb63c1daf5fe290e527f`，50,903,984 bytes；不与内层ZIP混淆。
本机原样下载外层并两级校验成功，没有重新构建或拼接CI EXE与本地Runtime。
