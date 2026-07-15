# 开发说明

UnicodeArtJs 的根目录是私有编排包，不发布到 npm。公开包仍位于 `packages/*`，并各自保留独立版本号。

## 环境

- Node.js：仓库开发使用 22.x。
- npm：仓库开发使用 10.x。
- 仓库包含 `mise.toml`，如已安装 mise，建议通过 mise 固定工具版本。

```bash
mise install
mise exec -- npm --version
```

## 安装依赖

当前使用 npm workspaces 和根目录单一 `package-lock.json`。依赖从仓库根目录安装：

```bash
npm run install:packages
```

如需模拟 CI 的干净安装：

```bash
npm run ci:packages
```

## 常用命令

```bash
npm run check
npm run build
npm run test
npm run release:gate
```

也可以只检查某个包：

```bash
npm run check:core
npm run check:cli
npm run check:web
npm run check:vscode
```

`release:gate` 是当前推荐的发布前总入口，会额外执行 Core/CLI pack dry-run、VSIX 隔离打包、VSIX 内容扫描、版本/依赖图检查和共享 fixture 校验。更多说明见 [发布门禁与版本图](release-gate.md)。

## Lockfile 策略

现阶段由根目录维护唯一 `package-lock.json`。旧的原型 lockfile 不再作为公开仓库状态的一部分；当前根 lockfile 是开发、CI 和发布门禁的唯一依赖基线。

如果后续发现原生 optional dependency、发布打包或跨平台 CI 有不可接受问题，可回退到“私有根编排 + 各包 lockfile”的保守模式。

## 生成文件

不要提交本地生成的 `.vsix`、`.tgz`、调试截图、临时对比输出或一次性测试脚本。如果临时文件有长期价值，应先整理成正式 fixture 或自动化测试。

## API 文档生成

根工作区将 HIA JSDoc 工具作为开发依赖使用，不会进入 Core、CLI、Web 或 VS Code 扩展的运行时依赖。当前已为 CLI 提供可重复的双语 API 文档试点：

```bash
npm run docs:all
npm run docs:all:check
npm run docs:cli
npm run docs:cli:check
npm run docs:web
npm run docs:web:check
npm run docs:tsdoc:core
npm run docs:tsdoc:core:check
npm run docs:tsdoc:vscode
npm run docs:tsdoc:vscode:check
npm run docs:contract:check
```

`docs:all` 会重建 CLI、Web、Core TSDoc 和 VS Code TSDoc 的本地产物，并生成 `.generated-docs/documentation-manifest.json`。`docs:all:check` 是当前推荐的文档总门禁，会运行全部单项生成、术语契约和统一清单检查。更多说明见[文档生成流水线](documentation-pipeline.md)。

生成结果位于被 Git 忽略的 `.generated-docs/`。CLI 文档包括本地 HTML、双语索引、搜索索引、源码链接元数据和 HIA integration JSON。`docs:cli:check` 会从干净目录重新生成，并检查双语输出、关键 doclet 与 GitHub 源码链接。

Core 的 TypeScript 文档已接入 `@hia-doc/tsdoc-runner@0.1.2`。其 40 个输入文件覆盖主要公开导出图，并生成可校验的中间 artifact；`docs:tsdoc:core:check` 会验证导出覆盖、诊断和 source map 隐私。该产物不是已经部署的 API 文档站，公开站点聚合将在后续文档阶段完成。

VS Code Extension 的 TypeScript 文档也已接入 `@hia-doc/tsdoc-runner@0.1.2`。其 16 个输入文件覆盖命令、配置、模板、Core adapter、WebView 协议、HTML/CSP、i18n 和日志边界；`docs:tsdoc:vscode:check` 会验证导出覆盖、诊断和 source map 隐私。扩展的架构与数据边界见 [VS Code Extension 集成与数据边界](vscode-extension-integration.md)。

开发者仍可运行下列 Core 历史探针复核 TypeScript 输入与编译 JavaScript 输入的差异：

```bash
npm run docs:core:probe
```

该探针会记录直接 TypeScript 输入与保留注释的编译 JavaScript 输入的实际结果；它用于兼容性评估，不能替代 `docs:tsdoc:core:check`。

Web 的 `gallery-index` 是当前可独立导入的 JavaScript 模块，其 API 文档可通过 `docs:web` 生成。页面主入口 `packages/web/src/main.js` 是 DOM 工作台实现，不承诺为第三方库 API；其浏览器接入、存储和安全边界见[Web 集成与数据边界](web-integration.md)。

贡献代码时还应遵循[代码注释与 API 文档约定](code-documentation.md)。修改公开 Core TypeScript 契约时，须运行 `npm run docs:tsdoc:core:check`；修改 VS Code Extension 命令、配置、WebView 协议或宿主边界时，须运行 `npm run docs:tsdoc:vscode:check`；修改 CLI 或 Web JavaScript 文档时，须运行对应的 `docs:*:check`。修改 README、recipes 或 `examples/` 时，须运行 `npm run recipes:check`。进入合并或发布前建议运行 `npm run docs:all:check`。`docs:contract:check` 检查当前已冻结的术语、CLI 双语试点标记和常见 JSDoc 类型写法；它是质量下限，不替代对行为、术语和示例的人工复核。

## 改动提示

修改 Core 行为时，需要同时关注 CLI、Web 和 VSCode Extension 是否共享同一契约。Node 图像解码后端单独规划，因为它影响 Core、CLI 和 VSCode，但不直接影响浏览器运行时。

## 静态画廊投稿

修改 `packages/web/public/gallery/`、画廊投稿模板或画廊文档时，运行：

```bash
npm run gallery:check
```

该命令会重新构建 Core，并检查画廊索引、作品文件、投稿文档、Issue/PR 模板、许可证来源和 UAF / 语义文档解析。投稿流程见 [静态画廊投稿指南](gallery-submission.md)。
