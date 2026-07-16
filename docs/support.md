# 支持与反馈

本页用于帮助使用者把问题投到正确的位置。UnicodeArtJs 由 Core、CLI、Web、VS Code 插件和独立桌面应用共同组成，但它们的运行环境、发布节奏和日志材料不同。选对入口能让问题更快复现，也能避免把桌面安装器、浏览器字体回退或 Core API 问题混在一起。

## 提交前先看

1. 如果现象与字体、浏览器、图片格式或实验能力有关，先查看 [已知限制](known-limitations.md)。
2. 如果是如何使用某个入口，先查看 [常见使用 Recipes](recipes.md) 和对应包的 README。
3. 如果是静态画廊作品投稿，请走 [静态画廊投稿指南](gallery-submission.md)，不要使用普通 Bug 模板。
4. 不要上传包含私密内容的项目文件、绝对路径、访问令牌、用户日志或未授权图片。

## 反馈路由

| 问题类型 | 推荐入口 | 说明 |
| --- | --- | --- |
| Core API、转换结果、配置、错误码 | <https://github.com/mandolin/UnicodeArtJs/issues> | 请附最小输入、配置、Core 版本和运行时。 |
| CLI 命令、参数、配置文件、终端输出 | <https://github.com/mandolin/UnicodeArtJs/issues> | 请附完整命令、Node.js 版本和终端字体。 |
| GitHub Pages 工具站、浏览器导入导出、网页预览 | <https://github.com/mandolin/UnicodeArtJs/issues> | 请附浏览器、系统、视觉字体、字素字体和是否启用隐私保护。 |
| VS Code 插件、Converter 面板、模板和插入流程 | <https://github.com/mandolin/UnicodeArtJs/issues> | 请附 VS Code 版本、插件版本、编辑器字体和可复现文本。 |
| 静态作品画廊投稿 | <https://github.com/mandolin/UnicodeArtJs/issues/new/choose> | 选择 Gallery artwork proposal 表单。 |
| UnicodeArt App 桌面应用 | <https://github.com/mandolin/tauri-uniart/issues> | 安装器、项目文件、窗口、系统集成和桌面日志应放在桌面仓库。 |
| Electron UniArt 宿主探索 | <https://github.com/mandolin/electron-uniart/issues> | 只报告 Electron 宿主集成相关问题。 |

不确定归属时，可以在主仓选择 Bug 或 Feature 表单，并在 Component 里选择 “Not sure”。维护者会协助重新归类。

## Bug 报告应包含

- 受影响组件：Core、CLI、Web、VS Code、Browser entry、文档或画廊。
- 版本：npm 包版本、CLI 版本、网页提交版本或 VS Code 插件版本。
- 环境：操作系统、Node.js、浏览器、VS Code、终端、视觉字体和字素字体。
- 最小复现：输入文本、图片格式、命令、JSON 配置或语义文档。
- 预期行为与实际行为：尽量用文本说明；截图可作为辅助，但不要替代可复现输入。

## 功能请求应包含

- 想解决的具体工作流，而不是只描述“希望更强”。
- 目标入口：Core API、CLI、Web、VS Code、Browser entry、文档、画廊或桌面应用。
- 期望稳定性：稳定 API、实验能力、示例文档，或尚不确定。
- 可接受的替代方案：例如外部 adapter、独立扩展、Compatible 应用或后期规划。

## 建议标签

仓库维护标签以 `.github/labels.yml` 为准。常用标签包括：

- `area:core`、`area:cli`、`area:web`、`area:vscode`、`area:docs`
- `area:fonts`、`area:box`、`area:semantic`、`area:extensions`
- `stability:experimental`、`needs:repro`、`needs:decision`
- `gallery`、`proposal`、`bug`、`enhancement`、`documentation`

这些标签用于分拣问题，不代表功能一定会在某个固定日期完成。

## 安全与隐私

请只提交可以公开分享的最小样例。若必须说明本地路径或用户文件结构，请改写成占位符，例如 `<project>/sample.png`。不要把 npm token、GitHub token、系统用户名、完整日志、客户图片或未授权字体文件上传到公开 Issue。
