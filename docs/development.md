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

## 性能与发布计划

Core benchmark 用于观察关键匹配流程的耗时趋势：

```bash
npm run benchmark:core
```

发布计划、性能基线、发布面和版本决策说明由以下脚本保护：

```bash
npm run performance-release:check
```

该脚本不以具体毫秒阈值卡 CI，只检查公开文档、JSON 契约、根脚本、CI 和 release gate 是否保持一致。发布窗口和版本决策见 [性能基线与发布计划](performance-and-release-plan.md)。

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
npm run docs:hia:target:check
npm run docs:contract:check
npm run docs:quality:check
npm run docs:architecture:check
```

`docs:all` 会重建 CLI、Web、Core TSDoc 和 VS Code TSDoc 的本地产物，并生成 `.generated-docs/documentation-manifest.json`。`docs:all:check` 是当前推荐的文档总门禁，会运行全部单项生成、术语契约、文档质量、统一清单、公开站点数据和文档站信息架构检查。更多说明见[文档生成流水线](documentation-pipeline.md)。

生成结果位于被 Git 忽略的 `.generated-docs/`。CLI 文档包括本地 HTML、双语索引、搜索索引、源码链接元数据和 HIA integration JSON。`docs:cli:check` 会从干净目录重新生成，并检查双语输出、关键 doclet 与 GitHub 源码链接。

Core 的 TypeScript 文档已接入 `@hia-doc/tsdoc-runner@0.1.2`。其 40 个输入文件覆盖主要公开导出图，并生成可校验的中间 artifact；`docs:tsdoc:core:check` 会验证导出覆盖、诊断和 source map 隐私。该产物不是已经部署的 API 文档站，公开站点聚合将在后续文档阶段完成。

VS Code Extension 的 TypeScript 文档也已接入 `@hia-doc/tsdoc-runner@0.1.2`。其 16 个输入文件覆盖命令、配置、模板、Core adapter、WebView 协议、HTML/CSP、i18n 和日志边界；`docs:tsdoc:vscode:check` 会验证导出覆盖、诊断和 source map 隐私。扩展的架构与数据边界见 [VS Code Extension 集成与数据边界](vscode-extension-integration.md)。

HIA target docs adoption gate 使用 `docs/hia/hia-project-docs.json` 记录项目级文档接入形态，并通过 `npm run docs:hia:target:check` 复核 HIA runner 版本、Core / VS Code TSDoc producer result、CI / release gate 接线和源码隐私边界。该命令假定 TSDoc 产物已经由 `docs:tsdoc:*:check` 或 `docs:all:check` 生成；需要从零重建时运行 `npm run docs:hia:target:all`。

开发者仍可运行下列 Core 历史探针复核 TypeScript 输入与编译 JavaScript 输入的差异：

```bash
npm run docs:core:probe
```

该探针会记录直接 TypeScript 输入与保留注释的编译 JavaScript 输入的实际结果；它用于兼容性评估，不能替代 `docs:tsdoc:core:check`。

Web 的 `gallery-index` 是当前可独立导入的 JavaScript 模块，其 API 文档可通过 `docs:web` 生成。页面主入口 `packages/web/src/main.js` 是 DOM 工作台实现，不承诺为第三方库 API；其浏览器接入、存储和安全边界见[Web 集成与数据边界](web-integration.md)。

贡献代码时还应遵循[代码注释与 API 文档约定](code-documentation.md)和[文档质量与注释抽查](documentation-quality.md)。修改公开 Core TypeScript 契约时，须运行 `npm run docs:tsdoc:core:check`；修改 VS Code Extension 命令、配置、WebView 协议或宿主边界时，须运行 `npm run docs:tsdoc:vscode:check`；修改 CLI 或 Web JavaScript 文档时，须运行对应的 `docs:*:check`。修改 README、recipes 或 `examples/` 时，须运行 `npm run recipes:check`。修改兼容性、迁移、已知限制、生态版本或宿主差异说明时，须运行 `npm run compatibility-docs:check`。进入合并或发布前建议运行 `npm run docs:all:check`。`docs:contract:check` 检查当前已冻结的术语、CLI 双语试点标记和常见 JSDoc 类型写法；`docs:quality:check` 检查术语、抽样注释和公开文案边界。它们是质量下限，不替代对行为、术语和示例的人工复核。

修改开发者文档站分区、读者路径、公开 docs 索引或 Web 文档入口时，须运行：

```bash
npm run docs:architecture:check
```

文档站分区和数据边界见[开发者文档站信息架构](developer-documentation-architecture.md)。

## 改动提示

修改 Core 行为时，需要同时关注 CLI、Web 和 VSCode Extension 是否共享同一契约。Node 图像解码后端单独规划，因为它影响 Core、CLI 和 VSCode，但不直接影响浏览器运行时。

## 配置模型一致性

Core、CLI、Web 和 VS Code Extension 共享同一套视觉字体、字素字体、宽字素规则、语言和输出目标语义。修改这些字段、配置默认值或公开说明时，运行：

```bash
npm run config-model:check
```

该命令会检查 [配置模型 vNext](config-model-vnext.md)、Core 类型、CLI 参数、Web 表单配置和 VS Code 设置是否仍使用一致命名。

## 字素宽度与布局

修改 `glyphWidthProfile`、`wideCharRegex`、Box、语义布局、UAF 艺术字或输出尺寸统计时，运行：

```bash
npm run glyph-width:check
```

该命令会检查 [字素宽度与布局一致性](glyph-width-layout.md)、统一宽度计算 helper、关键调用点和回归测试是否仍然齐全。行为细节仍由 Core 单元测试和 `release:gate` 覆盖。

## UAF 与语义布局 Beta

修改 UAF JSON、语义文档 JSON AST、语义布局渲染、嵌入艺术字字体或相关 fixture 时，运行：

```bash
npm run semantic-uaf-beta:check
```

该命令会检查 [UAF 与语义布局 Beta 契约](semantic-uaf-beta.md)、canonical fixture、Core golden 输出、CLI 子命令消费和 Web 测试入口。受限 DSL 仍可用于导入，但长期交换格式应以 JSON AST 为准。

## 语义布局作者路径

修改语义文档作者指南、语义布局作者 fixture、DSL 导入示例、Core 语义布局或 CLI `document` 入口时，运行：

```bash
npm run semantic-document-authoring:check
```

该命令会检查 [语义布局作者指南](semantic-document-authoring.md)、作者 fixture、DSL 导入、Core 渲染和 CLI `document` 渲染路径。它保护作者可照着执行的布局模板路径，不能替代完整 Core 测试。

## 声明式扩展 SDK

修改 UAEM v1 清单、官方扩展示例、扩展作者文档、CLI `extension` 子命令或 Web 清单检查入口时，运行：

```bash
npm run extension-sdk:check
```

该命令会检查 [声明式扩展 SDK](extension-sdk.md)、[UAEM v1 清单规范](extension-manifest.md)、官方 Line Banner 示例、Core 解析结果、CLI 本地侧载预检和 Web 只读清单测试入口。UAEM v1 仍保持纯声明式边界，不允许通过资源包执行第三方代码。

## 官方扩展示例包

修改 `packages/extension-line-banner`、官方扩展模板、资源包 README、LICENSE 或官方示例资源时，运行：

```bash
npm run extension-example:check
```

该命令会检查官方 Line Banner 包是否仍可复制、可验证、可侧载；同时覆盖 Core 资源解析、CLI 本地预检、复制后目录校验和资源渲染。

## 宿主侧载边界

修改 UAEM 宿主能力矩阵、Web 只读清单检查、VS Code 后续侧载、桌面资源包读取、Compatible 侧载说明或静态画廊资源读取边界时，运行：

```bash
npm run host-sideload:check
```

该命令会检查 [宿主侧载与资源读取边界](host-sideload-boundary.md)、宿主接入指南、声明式扩展 SDK、Web / VS Code / Desktop / Compatible 文档、CI 和 release gate 是否仍保持同一套“显式选择、只读清单、逐项资源读取、不执行代码、不自动联网”契约。

## 创作生态

修改 UAF、语义布局、UAEM、官方扩展示例、静态画廊或创作作者路径时，运行：

```bash
npm run creative-ecosystem:check
```

该命令会检查 [创作生态总览](creative-ecosystem.md)、UAF / 语义布局契约、声明式扩展 SDK、官方 Line Banner 示例、静态画廊索引和 release gate 接线。它是一个轻量总览门禁，不替代 `semantic-uaf-beta:check`、`uaf-authoring:check`、`semantic-document-authoring:check`、`extension-sdk:check`、`extension-example:check` 和 `gallery:check` 对具体格式与资源的校验。

## UAF 字体作者路径

修改 UAF 字体格式说明、官方示例字体、UAF 作者指南或 CLI 字体预检入口时，运行：

```bash
npm run uaf-authoring:check
```

该命令会检查 [UAF 字体作者指南](uaf-authoring.md)、官方 Line Banner 字体、beta fixture、Core 渲染和 CLI `font validate/inspect`。它保护作者可照着执行的最小路径，不能替代完整 Core 测试。

## 桌面宿主基线

修改桌面宿主公开契约、`*.uaproj` fixture、Compatible 文档、Core capability 接入说明或错误模型说明时，运行：

```bash
npm run desktop-host:check
```

该命令会检查 [桌面宿主基线](desktop-host-baseline.md)、canonical `*.uaproj` v1 fixture、Compatible 文档链接和 release gate 集成。它不安装 Tauri/Electron，也不读取独立桌面仓库；桌面 runtime 的实际构建和安装器验证由对应独立仓库负责。

## 可选输入格式与 Adapter

修改 Node 图片默认格式、独立 adapter 策略、VS Code 图片入口、Compatible 图片后端或外部转换器说明时，运行：

```bash
npm run optional-adapters:check
```

该命令会检查 [可选输入格式与 Adapter 策略](optional-input-adapters.md)、`getCoreCapabilities()` 的默认格式清单、VS Code 暴露入口、Compatible 文档链接和 release gate 集成。GIF、SVG、TIFF 等格式应先走宿主 adapter、Compatible adapter 或外部转换器，不得在未经审计时进入默认 Clean 路径。

## 静态画廊投稿

修改 `packages/web/public/gallery/`、画廊投稿模板或画廊文档时，运行：

```bash
npm run gallery:check
```

该命令会重新构建 Core，并检查画廊索引、作品文件、投稿与审核文档、Issue/PR 模板、许可证来源、标签翻译和 UAF / 语义文档解析。投稿流程见 [静态画廊投稿指南](gallery-submission.md)，维护者审核与回退流程见 [静态画廊审核指南](gallery-review.md)。

## 静态资源发现

修改 `packages/web/public/gallery/resource-manifest.json`、画廊资源 hash、资源发现说明或宿主读取边界时，运行：

```bash
npm run resource-discovery:check
npm run resource-trust:check
npm run web-resource-discovery:check
```

`resource-discovery:check` 会校验 [实验性静态资源发现](resource-discovery-experimental.md) 当前使用的同源资源清单，确认资源 ID、类型、路径、size、sha256、许可证和画廊索引一致。`resource-trust:check` 会校验 `resource-lock.json`、`resource-revocations.json` 和 `resource-signature.json`，确认 hash lock、撤回列表和当前 `unsigned-draft` 签名 envelope 没有漂移。`web-resource-discovery:check` 会确认在线工具的“资源发现”实验页、浏览器端 hash 校验、E2E 和只读边界仍然存在。它们只读取仓库内静态文件或同源随站资源，不联网、不安装资源，也不执行资源内容。

CLI 也提供等价的只读宿主入口，可用于发布脚本或第三方宿主预检：

```bash
unicode-art resource validate packages/web/public/gallery/resource-manifest.json
unicode-art resource inspect packages/web/public/gallery/resource-manifest.json --json
```

## 支持与反馈入口

Issue 模板、反馈路由、已知限制页和标签目录由轻量脚本保护：

```bash
npm run support:check
```

该命令会检查 [支持与反馈](support.md)、[已知限制](known-limitations.md)、Issue Forms、Gallery 表单和 `.github/labels.yml` 是否齐全，并避免公开文档出现内部路径或阶段代号。

## 公开入口一致性

README、各包 README、package metadata、Marketplace / npm / GitHub Pages 入口和支持文档链接由以下命令保护：

```bash
npm run public-entry:check
```

修改根 README、包 README、`package.json`、发布说明或公开入口 URL 后，应运行该命令。它只检查仓库内的稳定入口契约；npm registry、VS Code Marketplace 和 GitHub Actions 的实时状态仍需在发布收尾时单独复核。

## 发布材料

发布说明模板、npm / Marketplace / GitHub Pages 的发布后核验清单，以及包级 tag 约定集中在 [发布材料与发布后核验](release-materials.md)。文件路径为 `docs/release-materials.md`。

```bash
npm run release-materials:check
```

修改发布说明模板、发布后检查清单、`release:gate` 描述或版本发布入口时，应同时运行 `npm run public-entry:check` 和 `npm run docs:all:check`。

## 实验能力稳定性矩阵

Core 能力边界由 `getCoreCapabilities()` 输出，公开稳定性矩阵由以下命令校验：

```bash
npm run stability:check
```

该命令会先构建 Core，再检查 [实验能力稳定性矩阵](experimental-stability.md) 是否覆盖所有 experimental、reserved 和 legacy 能力 ID。新增或调整 `packages/core/src/capabilities.ts` 时，应同步更新该矩阵。
