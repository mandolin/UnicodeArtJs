# 语义布局作者指南

`semantic-document@1` 是 UnicodeArtJs 用来描述布局模板的 JSON AST。它适合保存表格、标题、页脚、原字输出、普通文本转字符画，以及嵌入 UAF 艺术字。它不是 HTML，不执行脚本，也不从 URL 自动加载资源。

如果你只想把一段文字快速转成字符画，请先看 [常见使用 Recipes](recipes.md)。如果你想制作可复用的布局模板、画廊作品或扩展资源包，本页是推荐入口。字段的机器契约见 [UAF 与语义布局 Beta 契约](semantic-uaf-beta.md)。

## 最小文档

```json
{
  "version": 1,
  "rows": [
    {
      "role": "header",
      "cells": [
        { "blocks": [{ "kind": "raw-text", "text": "Name" }] },
        { "blocks": [{ "kind": "raw-text", "text": "Value" }] }
      ]
    },
    {
      "cells": [
        { "blocks": [{ "kind": "raw-text", "text": "Mode" }] },
        { "blocks": [{ "kind": "art-text", "text": "Core" }] }
      ]
    }
  ]
}
```

`version` 当前固定为 `1`。`rows` 至少包含一行，每行的 `cells` 至少包含一个单元格，每个单元格的 `blocks` 至少包含一个内容块。

## 行和单元格

| 字段 | 位置 | 说明 |
| --- | --- | --- |
| `role` | row | 可选 `header`、`body`、`footer`。不直接决定视觉样式，主要给宿主和后续工具保留语义。 |
| `role` | cell | 可选 `corner`、`row-header`、`column-header`、`body`、`footer`。 |
| `rowSpan` | cell | 正整数，表示跨越多少逻辑行。不能越过文档底部，不能和其它单元格冲突。 |
| `colSpan` | cell | 正整数，表示跨越多少逻辑列。 |
| `align` | cell | 可选 `left`、`center`、`right`。 |
| `verticalAlign` | cell | 可选 `top`、`middle`、`bottom`。 |
| `extensions` | document / row / cell | 扩展命名空间，推荐使用反向 DNS 风格键名。 |

跨行跨列是按逻辑表格放置的。一个单元格占用的位置会让后续单元格自动向右寻找空位，所以作者最好先画出草稿网格，再写 JSON。

## 内容块

`blocks` 按出现顺序组装。`display` 缺省为 `inline`，多个 inline block 会横向拼接；设置为 `block` 时会先换到新块。

| `kind` | 用途 | 说明 |
| --- | --- | --- |
| `raw-text` | 原字输出 | 按原文本输出，换行会拆成多行，不做字素化转换。 |
| `art-text` | 普通文本转字符画 | 交给宿主的 Core 文本渲染器处理。可用 `options` 覆盖该块的转换参数。 |
| `art-font-text` | UAF 艺术字 | `font` 必须是完整 `unicode-art-font@1` JSON 对象，不能写 URL 或文件路径。 |

`raw-text` 适合标签、页脚、表格值和需要保留原字符的说明。`art-text` 适合把短文本按普通字符画算法转换。`art-font-text` 适合使用已经制作好的 UAF 艺术字字体。

## 字素宽度

语义布局使用字素列宽，而不是像素宽度。默认假定 ASCII 字素宽度为 1，中文和部分 Unicode 字素宽度为 2。文档可以在 `options` 中声明：

```json
{
  "options": {
    "glyphWidthProfile": "default",
    "wideCharRegex": "[一-龥]"
  }
}
```

`wideCharRegex` 优先级高于 `glyphWidthProfile`。如果没有特殊需求，建议先使用默认配置；只有当你的目标字素字体与默认宽字符规则不匹配时，再显式设置。

## 嵌入 UAF 字体

`art-font-text` 使用完整嵌入字体，示例：

```json
{
  "kind": "art-font-text",
  "text": "UA",
  "font": {
    "format": "unicode-art-font",
    "version": 1,
    "meta": {
      "id": "org.example.line",
      "name": "Example Line",
      "authors": ["Example Author"],
      "license": { "expression": "MIT", "origin": "original" }
    },
    "metrics": { "height": 2, "defaultAdvance": 2, "letterSpacing": 1, "fallbackGlyph": "?" },
    "glyphs": {
      "U": { "lines": ["UU", "UU"] },
      "A": { "lines": ["AA", "AA"] },
      "?": { "lines": ["??", "??"] }
    }
  }
}
```

如果多个文档共用同一个字体，分发时可以把字体和文档一起放入 UAEM 资源包；但 `semantic-document@1` 本身仍保存完整字体对象，保证单文件可复现。

## 受限 DSL

DSL 是导入便利层，不是长期保存格式。保存、画廊、扩展资源包和跨宿主传递都应使用 JSON AST。

当前 DSL 支持：

| 写法 | 含义 |
| --- | --- |
| `{h}` | 行首表头。 |
| `{f}` | 行首页脚。 |
| `{rowspan:n}` / `{c:n}` | 单元格跨行。 |
| `{colspan:n}` / `{r:n}` | 单元格跨列。 |
| `{t:...}` | 原字输出块。 |
| `{n}` | 语义行分隔符。 |
| `|` | 默认单元格分隔符。 |
| `\\`、`\{`、`\}`、`\|` | 字面量转义。 |

例如：

```text
{h}Name|Value{n}{c:2}{t:Core}|Alpha{n}{t:Raw\|Text}{n}{f}{r:2}{t:MIT}
```

这个 DSL 可以导入为 JSON AST，但 DSL 不能表达所有 JSON 字段，例如单元格角色、水平/垂直对齐、文档级字素宽度配置和嵌入 UAF 字体。

## 本地验证

使用 CLI 渲染 JSON 文档：

```bash
node packages/cli/src/console.js document packages/core/tests/fixtures/semantic-uaf-beta/author-document.uadoc.json --height 4 --box "{\"style\":\"ascii\",\"renderStage\":\"layout\",\"mode\":\"grid\",\"separators\":{\"rows\":true,\"columns\":true},\"cell\":{\"padding\":{\"left\":1,\"right\":1}}}" --no-config --lang zh-CN
```

使用 CLI 导入 DSL：

```bash
node packages/cli/src/console.js document path/to/source.txt --document-format dsl --row-separator semantic --column-separator "|" --no-config
```

修改语义布局、UAF 或扩展资源包相关文件后，建议运行：

```bash
npm run semantic-document-authoring:check
npm run semantic-uaf-beta:check
npm run creative-ecosystem:check
```

发布前仍应运行：

```bash
npm run release:gate
```

## 常见错误

- 把 DSL 当成长期存储格式。长期保存请使用 JSON AST。
- 在 JSON 中写未知字段。v1 会拒绝未知字段，扩展数据应放入 `extensions`。
- `rowSpan` 跨越文档底部，或跨行跨列后和其它单元格冲突。
- 在 `art-font-text.font` 中写文件路径、URL 或包名。v1 只接受完整 UAF JSON 对象。
- 忘记为 `raw-text` 中的换行考虑单元格高度。
- 让 `art-text` 依赖目标机器不存在的视觉字体。需要跨环境复现时，优先使用 UAF 或固定的公开字体策略。

更多字段边界见 [UAF 与语义布局 Beta 契约](semantic-uaf-beta.md)，UAF 字体制作见 [UAF 字体作者指南](uaf-authoring.md)。
