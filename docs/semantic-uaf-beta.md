# UAF 与语义布局 Beta 契约

本页说明 UnicodeArtJs 当前准备长期保留的 UAF 艺术字字体与语义布局主路径。它们仍属于实验能力集合，但下列 JSON 字段、校验规则和跨入口 fixture 已按 beta 契约保护；后续调整应优先通过新增版本或 `extensions` 命名空间完成。

## 适用范围

- UAF 指 `unicode-art-font` v1 JSON 文档，用于描述由普通字素组合出的多行艺术字字形。
- 语义布局指 `semantic-document` v1 JSON AST，用于描述行、单元格、标题、页脚、原字输出和嵌入 UAF 艺术字。
- 受限 DSL 可以继续作为导入便利层，但不作为长期交换格式；保存、画廊、扩展包和跨宿主传递应使用 JSON AST。
- CLI、Web、VS Code 和桌面宿主应把 JSON 交给 Core 校验，不自行放宽字段或执行外部代码。

## UAF v1 主路径

UAF v1 必须使用：

- `format: "unicode-art-font"`
- `version: 1`
- `meta.id`：反向 DNS 风格 ID。
- `meta.license.expression`：受限 SPDX expression。
- `meta.license.origin`：`original`、`derived` 或 `imported`。
- `metrics.height` 与 `metrics.defaultAdvance`：正整数。
- `glyphs`：单个 Unicode 标量到固定高度字形行的映射。

主路径承诺：

- 字形行不能包含换行、制表符或行尾空格。
- 字形 `advance` 不能小于该字形图案的实际字素列宽。
- `fallbackGlyph` 必须引用已存在字形。
- `ltr` 是当前唯一可渲染方向；声明 `rtl` 的字体会得到结构化错误。
- `glyphWidthProfile` 与 `wideCharRegex` 可用于度量图案行和渲染结果，但不改变 JSON 字段结构。

## 语义文档 v1 主路径

语义文档 v1 必须使用：

- `version: 1`
- `rows[]`：至少一行。
- `rows[].role`：可选 `header`、`body`、`footer`。
- `cells[]`：每行至少一个单元格。
- `cells[].rowSpan` / `cells[].colSpan`：正整数，不能越过文档边界或与其它单元格冲突。
- `cells[].role`：可选 `corner`、`row-header`、`column-header`、`body`、`footer`。
- `blocks[]`：至少一个内容块。

当前主路径内容块：

| `kind` | 作用 | 说明 |
| --- | --- | --- |
| `raw-text` | 原字输出 | 文本按换行拆成多行，不做字素化转换。 |
| `art-text` | 普通文本转字符画 | 由宿主提供的 Core 文本渲染器处理。 |
| `art-font-text` | UAF 艺术字 | `font` 必须是完整 UAF JSON 对象，不接受 URL 或文件路径。 |

主路径承诺：

- 未知字段会被拒绝；可扩展数据必须放在 `extensions` 命名空间。
- 表格列宽、外框、分隔线和输出尺寸使用同一套字素宽度计算器。
- 文档级 `options.glyphWidthProfile` / `options.wideCharRegex` 可以覆盖调用配置中的平铺宽度字段。
- 对象化配置中的 `glyphFont.widthProfile` / `glyphFont.wideCharRegex` 是跨入口推荐写法。

## Golden Fixtures

当前 beta 契约由以下 fixture 保护：

- `packages/core/tests/fixtures/semantic-uaf-beta/beta-font.uafont.json`
- `packages/core/tests/fixtures/semantic-uaf-beta/beta-document.uadoc.json`
- `packages/core/tests/fixtures/semantic-uaf-beta/expected-font.txt`
- `packages/core/tests/fixtures/semantic-uaf-beta/expected-document.txt`

这些 fixture 覆盖：

- UAF v1 字体解析、许可证字段、fallback 字形和 LTR 渲染。
- 语义文档中的 header、footer、row-header、column-header、raw-text 与 art-font-text。
- layout 阶段 ASCII grid Box 的主路径输出。
- Core、CLI 和 Web 测试入口对同一份 JSON 的一致消费。

运行检查：

```bash
npm run semantic-uaf-beta:check
```

该命令会构建 Core，验证公开文档与 fixture，使用 Core API 渲染 golden 输出，并通过 CLI 子进程读取同一份语义文档和 UAF 字体。

## 暂不承诺

- RTL 重排、kerning、smushing、grapheme cluster、emoji ZWJ 和复杂脚本布局。
- 从外部 URL 或本地相对路径自动加载 UAF 字体。
- 把 DSL 作为长期存储格式。
- 自动修复非严格等宽字素字体的实际像素偏差。
- 第三方扩展执行代码或远程下载资产。

作者制作 `.uafont.json` 时可先阅读 [UAF 字体作者指南](uaf-authoring.md)，再按本文的 beta 契约确认字段和 fixture 兼容性。相关说明见 [实验能力稳定性矩阵](experimental-stability.md)、[字素宽度与布局一致性](glyph-width-layout.md) 和 [声明式扩展清单](extension-manifest.md)。
