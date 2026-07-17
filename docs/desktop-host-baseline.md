# 桌面宿主基线

UnicodeArtJs 桌面应用采用独立仓库与 Compatible 分发档位维护。主仓不引入 Tauri、Electron、安装器或桌面 runtime 依赖；主仓只提供 Core npm 包、浏览器入口、项目文件契约、扩展清单契约和公开文档基线。

本文定义桌面宿主应共同遵守的第二层基线，适用于 `UnicodeArt App`、Tauri UniArt、Electron UniArt 以及后续官方或社区桌面宿主。

## 宿主矩阵

| 宿主 | 当前定位 | Core 入口 | 项目格式 | 分发档位 |
| --- | --- | --- | --- | --- |
| Tauri UniArt | 桌面候选应用，优先验证 Windows 工作流 | `unicode-art-js/browser` | `*.uaproj` v1 | Compatible |
| Electron UniArt | 独立宿主候选与对照实现 | `unicode-art-js/browser` 或受控 preload 后的 Core API | `*.uaproj` v1 | Compatible |
| 其他桌面宿主 | 社区或后续官方应用 | 已发布 npm Core，不复制源码 | 应兼容 `*.uaproj` v1 或显式转换 | 由实际依赖决定 |

桌面应用不得加入 UnicodeArtJs root workspace，也不得把 Tauri、Electron、系统 WebView、安装器或打包器依赖写入 Core、CLI、Web 或 VS Code 默认 lockfile。

## Core 能力协商

桌面宿主启动时应读取 `getCoreCapabilities()`，并把返回的 `stableFeatures`、`experimentalFeatures`、`reservedConfig` 和 `legacyAliases` 作为 UI 与配置提示的事实来源。不要硬编码“某个选项已经稳定”，也不要把 reserved 配置宣传为已经影响输出。

推荐规则：

- 提交和发布物使用已发布的 `unicode-art-js` semver 依赖，例如 `^1.2.1`。
- 本地联调可以临时链接主仓，但发布前必须恢复 npm 版本并执行干净安装。
- Tauri renderer 和 Electron sandboxed renderer 优先使用 `unicode-art-js/browser`，让系统文件能力留在宿主 IPC 或 command 层。
- 若桌面宿主使用 Node 主进程执行转换，必须把输入归一为 Core 支持的数据，不把文件句柄、窗口对象、shell 或框架对象传入 Core。
- UI 应展示 Core 版本和能力状态；发现不兼容能力时给出禁用、降级或升级提示。

## 项目文件 v1

项目文件扩展名为 `*.uaproj`，编码为 UTF-8 JSON。项目保存用户输入、转换配置和可解释来源，不把生成结果文本当作项目真相。

根对象：

```json
{
  "application": {
    "id": "unicodeart-app",
    "version": "0.1.0-beta.1"
  },
  "schemaVersion": 1,
  "mode": "text",
  "config": {
    "charset": "ASCII",
    "visualFont": "Noto Sans SC",
    "glyphFont": "Sarasa Mono SC, LXGW WenKai Mono, monospace",
    "height": 20,
    "matrixSize": 6,
    "ratio": 2
  },
  "source": {
    "kind": "text",
    "text": "UnicodeArtJs"
  }
}
```

`config` 是桌面 v1 的最小可移植配置：

| 字段 | 说明 |
| --- | --- |
| `charset` | `ASCII`、`EXTENDED` 或 `CHINESE_SIMPLE`。 |
| `visualFont` | 输入文字渲染用视觉字体。 |
| `glyphFont` | 结果预览与导出用字素字体。 |
| `height` | 输出高度，当前建议范围 2 到 240。 |
| `matrixSize` | 采样矩阵，当前建议范围 2 到 20。 |
| `ratio` | 宽高比，当前建议范围 1 到 3。 |

`source` 支持三种形态：

```json
{ "kind": "text", "text": "UnicodeArtJs" }
```

```json
{
  "kind": "image",
  "storage": "linked",
  "mime": "image/png",
  "name": "sample.png",
  "path": "sample.png"
}
```

```json
{
  "kind": "image",
  "storage": "embedded",
  "mime": "image/png",
  "name": "sample.png",
  "byteLength": 0,
  "dataBase64": ""
}
```

项目文件 v1 的共同限制：

- `schemaVersion` 必须为 `1`；不支持的新版本应给出明确错误，不能静默覆盖原文件。
- 普通图片项目只保存路径引用。重新打开项目时，不得自动读取历史路径，必须由用户重新选择或授权。
- 便携项目才允许嵌入图片副本；建议原始图片上限为 10 MiB，完整 JSON 项目上限为 14 MiB。
- 项目导入失败时不得替换当前可用工作区，也不得改写原项目文件。
- 保存时应使用原子写入或等价策略，避免崩溃时留下半截 JSON。
- 公共测试 fixture 不应包含真实用户绝对路径、用户名、token 或私密图片。

主仓提供 canonical fixture：

- `fixtures/desktop/uaproj-v1/text-project.uaproj`
- `fixtures/desktop/uaproj-v1/linked-image-project.uaproj`
- `fixtures/desktop/uaproj-v1/embedded-image-project.uaproj`

独立桌面宿主可以直接导入这些 fixture 做兼容 smoke。

## 文件与权限边界

桌面宿主的系统能力必须是窄接口：

- 图片、项目和导出目标通过原生打开/保存对话框明确选择。
- 不向 renderer 暴露通用文件系统、shell、任意命令执行、目录扫描或自动网络加载能力。
- 应用私有目录可保存草稿和最近项目路径，但启动时不得自动读取历史外部图片。
- TXT 导出保存纯文本；HTML 导出必须转义字符画内容并使用受控样式。
- PNG、PDF、SVG、视频或其他渲染型导出需要单独权限、格式和许可证评估。
- 可选输入格式应遵循 [可选输入格式与 Adapter 策略](optional-input-adapters.md)。桌面宿主可以提供额外 adapter，但不得把未审计 decoder 反向混入主仓默认 Core 路径。

Tauri 应把文件插件权限限制在显式选择后的文件和应用私有目录。Electron 应使用 sandboxed renderer、关闭 Node integration、启用 context isolation，并通过窄 preload API 暴露受控 IPC。

## UAEM 与扩展侧载

桌面宿主可以使用 UAEM v1 检查本地声明式扩展包，但必须遵守[声明式扩展 SDK](extension-sdk.md)和
[宿主侧载与资源读取边界](host-sideload-boundary.md)：

- 只读取用户显式选择的本地清单和 `resources[]` 中声明的资源。
- 读取资源前复核真实路径仍在清单根目录内。
- 不安装、注册、联网下载或执行扩展代码。
- 动态插件、扩展市场、签名、远程分发和自动更新必须另行设计，不能复用 UAEM v1 的纯声明式边界。

## 错误模型

桌面宿主不应解析 Core 的人类可读错误文本。捕获 `UnicodeArtError` 时，应优先使用：

- `code`
- `messageKey`
- `messageParams`
- `locale`
- `details`

宿主自己的错误建议使用独立命名空间，例如：

| 错误域 | 示例 |
| --- | --- |
| `project.*` | 项目 JSON 无效、schema 不支持、项目过大、来源不一致。 |
| `file.*` | 用户取消选择、文件不存在、读写失败、路径未授权。 |
| `permission.*` | 宿主 capability / IPC 拒绝访问。 |
| `export.*` | TXT/HTML/PNG 等导出失败。 |
| `update.*` | 检查版本、打开 Release 页面或自动更新失败。 |
| `dependency.*` | WebView2、系统字体或可选 adapter 不可用。 |

错误展示应尽量本地化，并保留机器可读 code 供日志、诊断和回归测试使用。项目导入、扩展侧载和导出失败时，应保持当前工作区可恢复。

## Compatible 发布基线

桌面候选发布前至少需要：

1. 使用已发布 `unicode-art-js` 版本并锁定依赖树。
2. 运行自身检查和主仓 `desktop-host:check`。
3. 提供 `LICENSE`、`THIRD_PARTY_NOTICES`、SBOM 或等价依赖清单。
4. 记录安装器、应用目录、更新包和平台二进制的 SHA-256 与扫描结果。
5. 验证安装、升级、卸载、回退、项目打开保存、TXT/HTML 导出、错误路径和取消路径。
6. 对 MPL/LGPL 等 Compatible 组件履行对应源码、通知和用户权利说明。
7. 不把 GPL/AGPL 组件混入官方默认发行物。

更多分发要求见 [Compatible 应用与 Adapter 指南](compatible-project-guide.md)，升级与回退语义见 [生态兼容性与升级说明](ecosystem-compatibility.md)。
