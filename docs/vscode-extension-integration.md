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

右键菜单只在编辑器有选中文本时显示文本转换入口。Explorer 图片入口当前只处理本地 `file` URI，并仅暴露默认 Core 路径支持的 PNG、JPEG/JPG、WebP 和 BMP。GIF、SVG、TIFF 等格式需要后续可选 adapter 或外部转换器，相关边界见 [可选输入格式与 Adapter 策略](optional-input-adapters.md)。

## WebView 协议

Converter WebView 通过 `src/webview/protocol.ts` 定义消息类型：

- WebView 到宿主：`ready`、`convertText`、`convertImage`、`cancel`、`savePreset`、`copy`、`insert`、`save`。
- 宿主到 WebView：`readyAck`、`progress`、`result`、`templateState`、`error`、`notice`。

宿主收到 WebView 消息后先调用 `isWebviewMessage()` 做完整协议校验。该 gate 会拒绝额外字段、未知枚举、越界数值、过长文本、带路径分隔符的图片名、MIME 与 data URL 不一致，以及超出当前 Converter 简单配置面的字段。通过协议并不跳过后续配置合并和 Core 校验；两层分别负责宿主消息边界与转换语义。

图片模式会把 WebView 传来的 data URL 写入扩展 `globalStorageUri/webview-images` 下的临时文件，再把本地路径交给 Core Node 图像后端。转换结束后临时文件会被删除。WebView 文件选择器同样只暴露 PNG、JPEG/JPG、WebP 和 BMP，避免 UI 暗示默认 Core 已支持额外格式。

## 安全边界

WebView HTML 由 `src/webview/html.ts` 生成，并采用以下限制：

- 只加载扩展本地 bundled 的 CSS 和 JS。
- CSP 使用 `default-src 'none'`。
- 脚本通过 nonce 放行。
- 图片只允许 WebView 本地资源源和 data URL。
- 不加载 CDN 或远程脚本。

HTML 导出会转义生成内容，并对用户提供的字素字体 CSS 字体族做字符级清理。该处理用于降低 WebView 输入直接写入 HTML/CSS 的风险；它不等同于通用 HTML sanitizer。

### Workspace Trust 与 Restricted Mode

扩展在清单中显式声明 `capabilities.untrustedWorkspaces.supported: "limited"`：

- 受限模式仍允许选中文本转换和 Converter 的文本模式；这些路径不读取工作区文件。
- Explorer 图片菜单仅在 `isWorkspaceTrusted` 时出现；命令入口和 WebView 宿主还会各自复核 `vscode.workspace.isTrusted`，未信任时不会选择、写临时副本或调用原生图片解码。
- `font`、`visualFont`、`glyphFont`、`glyphWidthProfile` 和 `wideCharRegex` 的工作区级覆盖在 Restricted Mode 中被 VS Code 忽略，避免未信任工作区改变字体文件/字体规则或正则边界。用户级设置仍可使用。

开发扩展宿主可以通过专用启动参数绕过已安装扩展的默认信任行为，因此测试记录必须同时写明安装方式、workspace trust 与实际触发路径，不能仅凭开发窗口中的命令可见性判断公开能力。

### 诊断与可分享证据

UnicodeArtJs 输出通道是维护者本机诊断面，不是默认可公开的测试 artifact。常规转换日志只记录来源类别、规模、preset、行列和耗时，不主动记录图片绝对路径或文件名；异常对象仍可能包含运行时生成的本机细节。分享 issue、CI 附件或回归证据前应删除绝对路径、用户名、工作区名、输入正文和异常堆栈中的环境信息。自动 VSIX 生命周期 evidence 只记录版本、hash、布尔状态和宿主标量，不收集输出通道正文。

## 配置与模板

配置解析位于 `src/config/configResolver.ts`，合并顺序为：

1. 内置默认值。
2. VS Code 用户/工作区设置。
3. 默认模板。
4. 最近一次 Converter 配置。

模板保存位于 `src/config/presetStore.ts`。当前稳定支持一个默认模板和三个自定义模板槽。

## 资源包侧载边界

VS Code Extension 当前不自动安装 UAEM 资源包。后续若加入资源包管理，应遵循
[宿主侧载与资源读取边界](host-sideload-boundary.md)：

- 用户通过命令或 WebView 显式选择 `unicode-art-extension.json`。
- 扩展宿主先用 Core 解析清单和兼容性，再读取声明资源。
- 资源读取前复核真实路径仍在清单根目录内。
- 只读取 `resources[]` 中声明的文件，不扫描工作区、不加载远程 URL、不执行扩展代码。
- 侧载失败时不替换当前模板或 Converter 状态。

若后续加入资源发现列表，QuickPick 或 WebView 只能先展示只读摘要。写入默认模板、自定义模板槽、
Converter 状态或扩展 `globalStorageUri` 前，必须再次展示资源许可证、sha256、信任状态、撤回状态和缓存目标，
并等待用户确认。用户取消或校验失败时，不改写当前 VS Code 设置、模板和编辑器内容。

## 文档生成

VS Code Extension 的 TypeScript 文档使用 HIA TSDoc runner 生成中间 artifact：

```bash
npm run docs:tsdoc:vscode
npm run docs:tsdoc:vscode:check
```

生成目录为 `.generated-docs/tsdoc/vscode-extension/`，不提交到仓库。检查脚本会验证输入数量、artifact 数量、诊断、导出注释覆盖、关键符号和 source map 隐私。

当前生成范围覆盖 Extension 生命周期、命令、配置、模板、Core adapter、输出写入、WebView 协议、WebView 消息处理、HTML/CSP、i18n、状态栏和日志器。GitHub Pages 的“开发文档”页已提供这条文档线的受限公开符号索引；用户操作路径和其它文档线的对应关系见 [API Reference 与 Recipes](api-reference.md)。
