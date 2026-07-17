# 文档生成流水线

UnicodeArtJs 使用一套受控的本地文档流水线生成开发者文档中间产物。该流水线目前服务于本地开发、CI 检查和后续公开文档站聚合；生成目录不提交到仓库。

## 覆盖范围

当前统一清单包含四条文档线：

| 文档线 | 入口 | 产物 | 用途 |
| --- | --- | --- | --- |
| Core TSDoc | `tsdoc.core.json` | `.generated-docs/tsdoc/core/` | Core TypeScript 公共导出、配置、能力、平台 adapter 和核心格式。 |
| CLI JSDoc | `tools/docs/jsdoc.cli.json` | `.generated-docs/cli/` | CLI 维护者 API、参数归一化、错误处理和双语页面试点。 |
| Web JSDoc | `tools/docs/jsdoc.web.json` | `.generated-docs/web/` | 可独立导入的 Web 公开模块，目前聚焦静态画廊索引。 |
| VS Code TSDoc | `tsdoc.vscode-extension.json` | `.generated-docs/tsdoc/vscode-extension/` | VS Code 命令、配置、模板、WebView 协议和宿主边界。 |

页面主入口、DOM 控制器、内部脚本、私有规划资料、会话日志和一次性调试文件都不属于公开文档扫描范围。

VS Code Extension 的源码按 npm 包名导入 Core 类型，因此 `docs:tsdoc:vscode` 会先构建 Core，再运行 TSDoc 提取。这样干净 CI 环境不依赖本地残留的 `packages/core/dist/`。

HIA target docs adoption 配置位于 `docs/hia/hia-project-docs.json`。它不新增生成器，而是把当前 Core / VS Code TSDoc producer 输出登记为项目级 HIA 文档候选入口，并由 `npm run docs:hia:target:check` 校验版本、配置、产物状态和隐私边界。

## 本地命令

生成全部文档中间产物和统一清单：

```bash
npm run docs:all
```

执行完整文档门禁：

```bash
npm run docs:all:check
```

该命令会依次运行 CLI、Web、Core TSDoc、VS Code TSDoc、术语契约、文档质量和统一清单检查。清单写入：

```text
.generated-docs/documentation-manifest.json
```

清单包含每条文档线的入口、输出目录、生成器版本、产物数量、公开说明页和检查命令。它不包含源码正文，也不引用私有规划资料。

`docs:all` 还会从统一清单投影出 Web 站点可读取的公开快照：

```text
packages/web/public/docs/manifest.json
```

该快照只保留包名、版本、接口面、文档类型、公开文档链接、检查命令和指标摘要；不会包含 `.generated-docs/`、内部工作区、本机绝对路径或会话记录。GitHub Pages 的“开发文档”页直接读取这份 JSON。

## CI 与发布门禁

GitHub Actions 的 `CI / Full Check` 会分步骤运行与 `npm run docs:all:check` 等价的文档检查，并额外运行 HIA target adoption 检查。文档、脚本、TSDoc 配置或包源码变化都会触发该检查；分步骤执行是为了让远端失败时能直接定位到 CLI、Web、Core TSDoc、VS Code TSDoc、HIA target adoption、术语契约、文档质量或 manifest。

发布前总入口 `npm run release:gate` 也会运行 `docs:all:check` 与 `docs:hia:target:check`，确保发布包、VSIX 检查和开发者文档使用同一套质量底线。

## 单项检查

修改范围较小时，可以先运行对应单项命令：

```bash
npm run docs:cli:check
npm run docs:web:check
npm run docs:tsdoc:core:check
npm run docs:tsdoc:vscode:check
npm run docs:hia:target:check
npm run docs:contract:check
npm run docs:quality:check
npm run docs:manifest:check
npm run docs:public-site:check
npm run docs:architecture:check
```

`docs:quality:check` 会校验 [文档质量与注释抽查](documentation-quality.md)、抽样源码注释、公开文案禁区和 CI / 文档站接线。

`docs:architecture:check` 会校验 [开发者文档站信息架构](developer-documentation-architecture.md)、公开 docs 索引、Web 文档站 manifest 和文档站分区契约。进入发布前或合并前，仍建议运行 `npm run docs:all:check`。

## 产物边界

- `.generated-docs/` 是本地和 CI 生成目录，不提交到公开仓库。
- source map 必须保持 `sourcesContentPolicy: none`，不得嵌入 TypeScript 源文。
- 公开站点读取 `packages/web/public/docs/manifest.json`；它是统一清单的公开字段投影，不是完整生成产物。
- 公开文档只描述 API、配置、格式、兼容性和安全边界，不记录内部计划、会话过程或临时审计结论。

## 更新规则

新增或移除公开文档线时，应同步更新：

1. 对应的生成配置和检查脚本。
2. `scripts/generate-docs-manifest.cjs` 与 `scripts/check-docs-manifest.cjs`。
3. `scripts/generate-public-docs-site-data.cjs` 与 `packages/web/public/docs/manifest.json`。
4. 本页的覆盖范围和命令说明。
5. [开发者文档站信息架构](developer-documentation-architecture.md)中的分区与导航说明。
6. [代码注释与 API 文档约定](code-documentation.md)中的复核清单。

如果产物数量变化是有意的，应在对应阶段记录原因，并显式更新清单校验中的期望值。
