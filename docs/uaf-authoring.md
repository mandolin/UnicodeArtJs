# UAF 字体作者指南

UAF（Unicode Art Font）是 UnicodeArtJs 用来描述“由普通字素拼成的艺术字字体”的 JSON 格式。它不是操作系统字体文件，也不是 FIGlet 字体文件；当前 v1 只描述可校验、可渲染、可嵌入语义文档的声明式数据。

本指南面向想制作 `.uafont.json` 的作者。字段的机器契约见 [UAF 与语义布局 Beta 契约](semantic-uaf-beta.md)，扩展资源包分发见 [声明式扩展作者指南](extension-authoring.md)。

## 最小字体

下面是一份可被 Core 和 CLI 校验的最小结构：

```json
{
  "format": "unicode-art-font",
  "version": 1,
  "meta": {
    "id": "org.example.my-line-font",
    "name": "My Line Font",
    "authors": ["Example Author"],
    "description": "An original two-line Unicode art font.",
    "license": {
      "expression": "MIT",
      "origin": "original"
    },
    "creation": {
      "method": "human",
      "tool": "manual-grid"
    }
  },
  "metrics": {
    "height": 2,
    "defaultAdvance": 2,
    "letterSpacing": 1,
    "fallbackGlyph": "?"
  },
  "glyphs": {
    "A": { "lines": ["/\\", "||"] },
    "?": { "lines": ["??", "??"] }
  }
}
```

作者可以从官方示例 `packages/extension-line-banner/assets/line-font.uafont.json` 开始。它是原创 MIT 资源，覆盖 `A`、`U`、`J` 和 fallback 字形，适合用作最小可复制模板。

## 字段规则

| 字段 | 要求 | 说明 |
| --- | --- | --- |
| `format` | 固定为 `unicode-art-font` | 用来区分其它 JSON 资产。 |
| `version` | 固定为 `1` | 后续破坏性变更会使用新版本。 |
| `meta.id` | 反向 DNS 风格，如 `org.example.font` | 至少包含一个点，方便长期唯一。 |
| `meta.authors` | 1 到 16 个作者名 | 不要把许可证归属写成作者列表。 |
| `meta.license.expression` | 受限 SPDX expression | 官方默认资源优先使用 MIT、Apache-2.0、BSD、CC0 等宽松许可。 |
| `meta.license.origin` | `original`、`derived` 或 `imported` | 派生或导入资源必须补充 `sourceUrl` 与 `attribution`。 |
| `metrics.height` | 1 到 128 的整数 | 每个字形必须有完全相同的行数。 |
| `metrics.defaultAdvance` | 1 到 512 的整数 | 未显式声明 `advance` 的字形使用该宽度。 |
| `metrics.letterSpacing` | 非负整数 | 渲染相邻字形时追加的空列数。 |
| `metrics.fallbackGlyph` | 可选，必须引用已有字形 | 输入缺字时使用；不设置时缺字保留空白 advance。 |
| `glyphs` | 1 到 4096 个字形 | 每个键必须是单个 Unicode 标量。 |

UAF v1 拒绝未知字段。需要保留项目或工具私有信息时，使用 `extensions` 命名空间，并采用反向 DNS 风格键名，例如 `org.example.editor`。

## 字形绘制规则

- 每个 `glyphs[key].lines` 的长度必须等于 `metrics.height`。
- 字形行不能包含换行、回车、制表符或行尾空格。
- 单行最多 512 个 Unicode 标量。
- `advance` 不能小于该字形所有行的最大字素列宽。
- 字形键当前只接受单个 Unicode 标量，不支持 grapheme cluster 或 emoji ZWJ。
- `direction: "rtl"` 可以作为元数据声明，但当前渲染器会拒绝真正渲染 RTL 字体；LTR 是 v1 主路径。

行尾空格之所以被拒绝，是为了避免 JSON 编辑器、Git diff、压缩器或复制粘贴过程静默丢失字形宽度。需要留白时，使用 `advance` 表示视觉宽度。

## 宽字素与 advance

UAF 使用“字素列宽”度量，而不是像素宽度。默认假定 ASCII 字素占 1 列，中文和部分 Unicode 字素占 2 列。作者可以在字体中声明：

```json
{
  "metrics": {
    "glyphWidthProfile": "sarasa-mono-sc",
    "wideCharRegex": "[一-龥]"
  }
}
```

`wideCharRegex` 会覆盖 profile，用于校验字形行宽和渲染结果。这个规则只影响字符画的列宽计算，不代表浏览器或终端实际安装了某种字体。

## 常见错误

| 现象 | 常见原因 | 修复方式 |
| --- | --- | --- |
| `format` 或 `version` 错误 | 把普通 JSON 当作 UAF 读取 | 使用固定 `format: "unicode-art-font"` 和 `version: 1`。 |
| `meta.id` 无效 | ID 没有点、包含大写或下划线 | 使用反向 DNS 风格小写 ID。 |
| 许可证错误 | SPDX 写法不合法，或 `imported` 缺少来源 | 使用受支持的 SPDX 表达式；导入/派生资源补 `sourceUrl` 与 `attribution`。 |
| `lines` 行数错误 | 某个字形行数不等于 `metrics.height` | 所有字形都补齐到固定高度。 |
| 行尾空格错误 | 用空格直接保存字形右侧留白 | 删除行尾空格，用 `advance` 表达留白。 |
| `advance` 太小 | 字形图案比声明宽度更宽 | 增大 `advance` 或调整字形图案。 |
| fallback 无效 | `metrics.fallbackGlyph` 指向不存在的键 | 添加对应字形或删除 fallback。 |
| RTL 渲染失败 | 当前 v1 不实现 RTL 重排 | 暂时只发布 LTR 主路径字体。 |

## 本地验证

从仓库根目录运行：

```powershell
npm run build:core
node packages/cli/src/console.js font validate packages/extension-line-banner/assets/line-font.uafont.json --lang zh-CN
node packages/cli/src/console.js font inspect packages/extension-line-banner/assets/line-font.uafont.json --json
node examples/node/uaf-font.mjs
```

修改 UAF 作者文档、官方示例字体或 UAF 相关检查时，运行：

```bash
npm run uaf-authoring:check
npm run semantic-uaf-beta:check
npm run creative-ecosystem:check
```

发布前仍应运行：

```bash
npm run release:gate
```

## 发布与收录建议

- 官方默认画廊和示例包优先接受原创资产。
- 第三方 FIGlet 字体、图片转制结果或来源不清的字形不要直接进入默认画廊。
- AI 辅助创作应在 `meta.creation` 或 README 中说明工具和人工复核方式。
- 如果字体作为 UAEM 资源包分发，还需要提供 `unicode-art-extension.json`、README 和 LICENSE。
- 如果字体要进入默认画廊，还需要补充双语标题、说明、标签、作者、审核日期和许可证来源。
