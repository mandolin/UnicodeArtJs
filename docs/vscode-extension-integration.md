# VS Code Extension 集成与数据边界

本文说明 UnicodeArtJs VS Code Extension 的主要模块、消息协议、安全边界和文档生成入口，面向维护者和二次开发者。

## 架构

VS Code Extension 位于 `packages/vscode-extension`，运行时入口为 `src/extension.ts`。扩展激活后只做轻量初始化：

- 注册 `unicodeArtJs.*` 命令。
- 创建状态栏入口。
- 创建 UnicodeArtJs 输出通道。

转换能力由 `src/core/coreAdapter.ts` 调用 `unicode-art-js` Core。扩展层负责把 VS Code 设置、模板和 Converter 表单转换为统一配置；Core 负责实际文本/图片到字符画的生成。

## 命令与菜单

主要命令包括：

- `unicodeArtJs.openConverter`：打开 Converter WebView。
- `unicodeArtJs.convertSelection`：用当前有效配置转换选中文本。
- `unicodeArtJs.convertSelectionWithOptions`：转换选中文本并临时选择插入方式。
- `unicodeArtJs.generateWithDefaultTemplate`：使用默认模板转换选中文本。
- `unicodeArtJs.generateWithTemplate1/2/3`：使用自定义模板槽转换选中文本。
- `unicodeArtJs.convertImageFile`：转换本地图片文件。

右键菜单只在编辑器有选中文本时显示文本转换入口。Explorer 图片入口当前只处理本地 `file` URI。

## WebView 协议

Converter WebView 通过 `src/webview/protocol.ts` 定义消息类型：

- WebView 到宿主：`ready`、`convertText`、`convertImage`、`cancel`、`savePreset`、`copy`、`insert`、`save`。
- 宿主到 WebView：`readyAck`、`progress`、`result`、`templateState`、`error`、`notice`。

宿主收到 WebView 消息后先调用 `isWebviewMessage()` 做结构校验。该校验只确认消息类型和必要字段，配置值仍交给扩展配置合并和 Core 校验处理。

图片模式会把 WebView 传来的 data URL 写入扩展 `globalStorageUri/webview-images` 下的临时文件，再把本地路径交给 Core Node 图像后端。转换结束后临时文件会被删除。

## 安全边界

WebView HTML 由 `src/webview/html.ts` 生成，并采用以下限制：

- 只加载扩展本地 bundled 的 CSS 和 JS。
- CSP 使用 `default-src 'none'`。
- 脚本通过 nonce 放行。
- 图片只允许 WebView 本地资源源和 data URL。
- 不加载 CDN 或远程脚本。

HTML 导出会转义生成内容，并对用户提供的字素字体 CSS 字体族做字符级清理。该处理用于降低 WebView 输入直接写入 HTML/CSS 的风险；它不等同于通用 HTML sanitizer。

## 配置与模板

配置解析位于 `src/config/configResolver.ts`，合并顺序为：

1. 内置默认值。
2. VS Code 用户/工作区设置。
3. 默认模板。
4. 最近一次 Converter 配置。

模板保存位于 `src/config/presetStore.ts`。当前稳定支持一个默认模板和三个自定义模板槽。

## 文档生成

VS Code Extension 的 TypeScript 文档使用 HIA TSDoc runner 生成中间 artifact：

```bash
npm run docs:tsdoc:vscode
npm run docs:tsdoc:vscode:check
```

生成目录为 `.generated-docs/tsdoc/vscode-extension/`，不提交到仓库。检查脚本会验证输入数量、artifact 数量、诊断、导出注释覆盖、关键符号和 source map 隐私。

当前生成范围覆盖 Extension 生命周期、命令、配置、模板、Core adapter、输出写入、WebView 协议、WebView 消息处理、HTML/CSP、i18n、状态栏和日志器。最终公开 API 文档站仍由后续统一文档聚合阶段处理。
