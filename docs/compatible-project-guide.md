# Compatible 应用与 Adapter 指南

UnicodeArtJs 的 Core、CLI、Web 和 VS Code 默认路径属于 Clean 档位：它们使用经过严格宽松许可证审计的默认依赖。某些桌面应用、图像兼容后端或平台集成可能需要采用 MPL-2.0、LGPL 或系统 runtime；这类项目应作为独立的 Compatible 项目维护。

Compatible 项目仍可免费或商业使用 Core。它的自有代码通常也可以采用 MIT；区别在于发布的安装包必须同时履行其中第三方组件的许可证义务。

## 创建独立项目

Compatible 项目应使用自己的仓库、lockfile、版本号、CI 和发布标签，不要加入 UnicodeArtJs 的 root workspace，也不要把其依赖写入 Core、CLI、Web 或 VS Code 的默认 lockfile。

应用通过 npm 使用已发布的 Core：

```json
{
  "dependencies": {
    "unicode-art-js": "^1.2.1"
  }
}
```

本地联调可以临时链接工作目录，但提交和发布前必须恢复到明确的 npm 版本范围，并在干净环境验证安装。

## 必需发布材料

每个公开 Compatible 版本至少应包含：

1. 项目自身的 `LICENSE` 与可读 README。
2. 锁定的依赖树，以及 npm/Cargo 等生态对应的 lockfile。
3. `THIRD_PARTY_NOTICES`、许可证文本和组件版本对应关系。
4. SBOM 或等价的机器可读依赖清单。
5. 安装器、应用目录、更新包和平台二进制的扫描记录。
6. 对 MPL 组件的源码获取位置与修改说明。
7. 对 LGPL 组件的来源、链接方式、源码获取和适用替换/重链说明。

GPL 或 AGPL 组件不应进入官方 Compatible 默认发行物。若项目确实需要它们，应建立明确标为 GPL 的独立产品和完整发布策略，而不是与 MIT Core 或 Compatible 安装包混用。

## 与 Core 的边界

Core 负责字符画算法、配置、错误码、进度、取消、输出 metadata 和跨端 fixture。应用或 adapter 负责自己的窗口、文件选择、项目恢复、系统权限、安装器、更新器和平台 runtime。

应用不应把通用文件系统、shell、IPC/command 或桌面框架对象反向暴露给 Core。图像 adapter 应先将输入归一化为 Core 支持的像素输入，再调用 Core 的稳定入口。

## 发布前检查

- 使用干净环境安装，确认只安装当前项目声明的依赖。
- 扫描最终安装包，而不是只看顶层 `package.json` 或 `Cargo.toml`。
- 确认 NOTICE、SBOM、源码链接和许可证文本能随产物获得。
- 以 Core 的固定 fixture 验证文本、图片、Box、宽字符、错误和取消路径。
- 桌面应用还应运行 `npm run desktop-host:check`，并对照 [桌面宿主基线](desktop-host-baseline.md) 验证 `*.uaproj`、Core capability、错误模型和 UAEM 侧载边界。
- 记录支持的操作系统、外部 runtime、已知渲染差异和回退方式。

该指南是工程合规清单，不构成法律意见。涉及静态链接、修改 copyleft 源文件、应用商店、嵌入式设备或跨国商业发行时，应基于实际产物取得专业意见。
