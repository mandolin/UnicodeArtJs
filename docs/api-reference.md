# API Reference 与 Recipes

UnicodeArtJs 的公开 API 资料由两部分共同组成：GitHub Pages“开发文档”页提供从源码注释生成的可浏览索引；本仓库的手写页面说明入口选择、稳定性、平台差异和可复制用法。两者互相补位，避免把本地中间产物误当成需要下载或提交的文档站。

在线浏览：<https://mandolin.github.io/UnicodeArtJs/>，打开“开发文档”即可查看 Core、CLI、Web 和 VS Code Extension 的公开索引、符号摘要与源码链接。

## 如何使用这份参考

1. 先按下表选择运行环境和入口。
2. 在开发文档页查看对应的公开符号、摘要和源码链接。
3. 回到手写指南确认配置、稳定性与宿主边界。
4. 需要可复制的起点时，运行或改写对应的 Recipe；示例不会依赖私有路径、密钥或网络下载。

| 入口 | 生成的 API 索引 | 手写说明 | Recipe / 示例覆盖 |
| --- | --- | --- | --- |
| Core | `Core TypeScript API`（`core-tsdoc`） | [代码注释与 API 文档约定](code-documentation.md)、[配置模型 vNext](config-model-vnext.md) | [文本生成](recipes.md#core文本生成字符画)、[图片转换](recipes.md#core图片文件生成字符画)、[语义文档](recipes.md#语义文档表格页脚和原字输出)、[UAF](recipes.md#uaf-艺术字字体与-uaem-扩展清单)；四个 Node 示例均可执行。 |
| CLI | `CLI JavaScript API`（`cli-jsdoc`） | [CLI README](../packages/cli/README.md)、[代码注释与 API 文档约定](code-documentation.md) | [CLI 命令行生成与导出](recipes.md#cli命令行生成与导出)；`recipes:check` 会执行文本、图片和扩展检查代表命令。 |
| Web | `Web Gallery JavaScript API`（`web-jsdoc`） | [Web 集成与数据边界](web-integration.md)、[Web README](../packages/web/README.md) | [Web 在线工具站](recipes.md#web在线工具站) 说明浏览器使用路径。页面主入口不是第三方库 API；当前生成范围只涵盖可独立导入的画廊索引模块。 |
| VS Code Extension | `VS Code Extension TypeScript API`（`vscode-tsdoc`） | [VS Code Extension 集成与数据边界](vscode-extension-integration.md)、[扩展 README](../packages/vscode-extension/README.md) | [VS Code 选中文本生成 Banner](recipes.md#vs-code选中文本生成-banner) 说明用户操作路径；命令、配置和 WebView 协议以生成索引与集成指南为准。 |

## 生成与检查

日常查看已提交的公开快照不需要生成文档。修改注释、文档入口或示例时，按影响范围运行检查：

```bash
npm run docs:api-reference:check
npm run recipes:check
```

需要从干净工作目录复核四条文档线时，运行：

```bash
npm run docs:all:check
```

该命令会重新生成本地中间产物，并校验 Pages 使用的公开快照。本地 / CI 生成物不应提交。

## 稳定性与边界

生成索引只列出当前扫描范围内的公开符号，不会自动把所有源码、DOM 页面控制器或实验能力提升为稳定 API。调用前应同时阅读相关指南中的 stable、experimental、reserved、legacy 或 deprecated 标识。尤其是 Web Studio、资源发现和创作格式仍可能有明确的实验性限制。

如果新增稳定公共入口，请同步补充或更新本页的覆盖表、相关手写指南和最小 Recipe；没有适合自动执行的示例时，应明确说明原因与人工验证路径。
