# 文档质量与注释抽查

本页定义 UnicodeArtJs 公开文档和源码注释的质量底线。它补充 [代码注释与 API 文档约定](code-documentation.md) 和 [文档生成流水线](documentation-pipeline.md)，对应文件为 `docs/code-documentation.md`、`docs/documentation-pipeline.md` 和 `docs/developer-documentation-architecture.md`。本页重点回答三个问题：术语是否一致、注释是否能解释公共契约、公开文案是否适合使用者和二次开发者阅读。

## 检查入口

```bash
npm run docs:quality:check
npm run docs:contract:check
npm run docs:all:check
```

`docs:quality:check` 是轻量质量门禁；它检查本页、术语表、公开文案禁区、抽样注释覆盖和 CI 接线。`docs:contract:check` 继续保护已冻结的基础注释契约。`docs:all:check` 会重新生成 CLI / Web JSDoc、Core / VS Code TSDoc、文档 manifest 和公开文档站数据。自动化抽样不能替代新增或结构性修改代码必须遵守的 HIA ROP 人工复核。

## 术语抽查

公开文档、README、CLI 帮助、Web UI 和 VS Code 文案应优先使用以下术语：

| 中文 | English | 使用边界 |
| --- | --- | --- |
| 字素 | glyph cell | 字符画输出中的单个字符单元，不等同于像素。 |
| 字素字体 | glyph font | 字符画最终显示时使用的字体，影响预览、导出、宽度计算和裱框。 |
| 视觉字体 | visual font | 输入文字被栅格化为中间图像时使用的字体，只影响文字 Banner 采样。 |
| 宽字素 | wide glyph | 在目标环境中按两个普通列宽计算的字素。 |
| 裱框 | box frame | 文字框体、标题、阴影、内外边距和布局阶段框线。 |
| 语义文档 | semantic document | `semantic-document@1` 的版本化 JSON / DSL 内容模型。 |
| Unicode Art Font (UAF) | Unicode Art Font (UAF) | 项目自有的 Unicode 艺术字字体数据格式。 |
| Unicode 显示宽度 | Unicode display width | 字符或字素在目标文本环境中的列宽语义。 |
| 字素簇 | grapheme cluster | 用户感知的 Unicode 文本单元，不等同于输出网格的 glyph cell。 |
| 字体回退 | font fallback | 首选字体不可用或缺字形时采用替代字体的显示行为。 |
| ANSI 转义序列 | ANSI escape sequence | 终端控制和样式使用的转义序列。 |
| 终端能力 | terminal capability | 终端对字符集、宽度、颜色和控制序列的实际支持范围。 |

避免使用会造成歧义的表达，例如“像素字符”“字素字符”或把 `fontReduce` 写成未解释的 `fontreduce`。旧字段名可以在迁移语境中出现，但必须说明现代字段，例如 `font` 对应 `visualFont.family`。

## 注释抽样

自动检查只抽样保护高风险公共边界；它不会因为未静态分析每个函数而豁免 ROP。新增或结构性修改的代码仍必须为每个语义节点、流程块、非显然局部变量和非明显自明语句提供适用的双语解释：

| 区域 | 抽样文件 | 关注点 |
| --- | --- | --- |
| Core 配置 | `packages/core/src/types/config.ts` | 视觉字体、字素字体、宽字素规则、reserved / experimental 字段说明。 |
| Core 能力 | `packages/core/src/capabilities.ts` | stable、experimental、reserved、legacy 能力边界。 |
| Core 输出与错误 | `packages/core/src/types/output.ts` | 输出尺寸、UTF-8 字节差异、机器可读错误码。 |
| CLI | `packages/cli/src/console.js` | 双语 JSDoc、配置归一、宿主字段和安全输入边界。 |
| Web | `packages/web/src/gallery-index.js`、`packages/web/src/main.js` | 静态画廊安全边界和公开 UI 文案。 |
| VS Code | `packages/vscode-extension/src/config/types.ts`、`packages/vscode-extension/src/webview/protocol.ts` | 配置模型、WebView 消息协议和宿主信任边界。 |

这些抽样文件发生公共行为变化时，应同步复核注释。新增稳定公共 API 时，也应把相同标准扩展到新入口，而不是只满足当前抽样。存量源码的全面 ROP 覆盖会以独立治理工程推进；在此之前，每次 touch-improve 仍是强制要求。

## 双语要求

JavaScript 与 TypeScript 的新增或结构性修改节点都使用完整、语义对等的中文与英文。JavaScript 使用 HIA JSDoc 的 `@lang zh-CN` 与 `@lang en` 成对描述；TypeScript 使用 TSDoc-compatible block，并采用相同的 canonical `@lang zh-CN`、`@lang en` 与 inline `<lang>` 形式。节点内部的普通流程、变量与语句注释同样需要显式中英双语；DLR / 术语 parser 尚未冻结时，不能以其未接入为由只保留一种语言。

中英文注释必须描述同一行为：

- 输入、输出、默认值和错误边界一致。
- stable / experimental / reserved / legacy / deprecated 状态一致。
- 不在某一种语言里隐藏许可证、浏览器、字体或宿主限制。

## 公开文案

公开文档面向使用者、二次开发者和贡献者，不应暴露内部协作过程。以下内容不进入 README、包 README、docs、Marketplace 文案或 GitHub Pages 文档站：

- 内部计划代号、临时阶段号、会话日志和本机绝对路径。
- AI 协作工具名称或内部任务交接记录。
- 私有工作区、临时审计文件和一次性调试文件。
- “逐行复刻”“复制源码”这类容易造成许可证误解的表述。

可以保留公开路线、已知限制和迁移说明，但措辞应聚焦使用者需要知道的事实。

## manual review

自动检查通过后，仍建议人工抽查：

1. 新增或修改的公共 API 注释是否解释“为什么存在”和“边界在哪里”。
2. 本次触及的语义节点、流程块、非显然局部变量和非明显自明语句是否有紧邻的双语 ROP 注释，并且说明真实意图、状态变化或风险。
3. 配置字段是否明确影响视觉字体、字素字体、字素宽度、输出环境还是宿主 UI。
4. 示例是否能复制运行，且不依赖未提交文件、私有字体或本机路径。
5. 用户能否从 README、Quickstart、Recipes、API Reference、Compatibility 和 Release 找到同一事实。
6. 文案是否像公开项目说明，而不是内部开发纪要。

## 与文档站的关系

本页属于 [开发者文档站信息架构](developer-documentation-architecture.md) 的 API Reference 分区。文档站展示的是公开数据投影；源码正文、私有计划、日志和本地中间产物不进入 GitHub Pages。
