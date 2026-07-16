# 字素宽度与布局一致性

UnicodeArtJs 的字符画输出假定显示环境使用严格混合等宽字体：ASCII 字素占 1 列，中文和部分 Unicode 字素占 2 列。`glyphWidthProfile` 与 `wideCharRegex` 用来描述这种“字素列宽”规则，并让 Box、语义表格、UAF 艺术字、HTML/ANSI/纯文本结果统计共享同一套计算。

## 配置入口

推荐使用对象字段：

```ts
const config = {
  glyphFont: {
    family: "'Sarasa Mono SC', 'LXGW WenKai Mono', monospace",
    widthProfile: 'sarasa-mono-sc',
    wideCharRegex: undefined
  }
};
```

兼容字段仍可使用：

```ts
const config = {
  glyphFontFamily: "'Sarasa Mono SC', monospace",
  glyphWidthProfile: 'sarasa-mono-sc',
  wideCharRegex: '[\\u4e00-\\u9fff]'
};
```

当对象字段和兼容字段同时出现时，`glyphFont.widthProfile` 与 `glyphFont.wideCharRegex` 优先。

## 内置 Profile

| Profile | 状态 | 说明 |
| --- | --- | --- |
| `default` | 稳定 | 历史 Unicode 参考宽度规则。 |
| `reference` | 稳定 | `default` 的显式别名。 |
| `nsimsun` | experimental | 新宋体 profile，目前以参考宽度为基线。 |
| `sarasa-mono-sc` | experimental | 等距更纱黑体 SC profile，将 Box Drawing 字符按 1 列处理。 |
| `lxgw-wenkai-mono` | experimental | 霞鹜文楷等宽 profile，将 Box Drawing 字符按 1 列处理。 |

`wideCharRegex` 是完整宽字素集合，不是对内置 profile 的增量补丁。传入后，匹配该正则字符类的字素按 2 列计算，其余按 1 列计算。

## 已统一的路径

| 路径 | 使用的计算入口 | 说明 |
| --- | --- | --- |
| post-stage Box | `createGlyphWidthCalculatorFromConfig()` | 外框、标题、阴影、padding、margin 都按同一列宽计算。 |
| layout-stage Box | `createGlyphWidthCalculatorFromConfig()` | `lines`、`cells`、`grid` 模式中的单元格归一和外框使用同一规则。 |
| 语义文档布局 | `createGlyphWidthCalculatorFromConfig()` | raw-text、art-text、art-font-text、跨行跨列和表格边界共享规则。 |
| UAF 艺术字 | `GlyphWidthCalculator` | `advance`、`letterSpacing` 与缺字回退会按传入计算器统计。 |
| 输出指标 | `createGlyphWidthCalculatorFromConfig()` | `ArtResult.cols` 使用配置后的字素宽度，而不是字符串长度。 |
| pure/browser 数据路径 | `createGlyphWidthCalculatorFromConfig()` | 无效 profile 或 regex 会在转换前校验。 |

## 仍需注意

- 当前单位是“字素列”，不是浏览器或编辑器的真实像素宽度。
- `glyphWidthProfile` 仍是 experimental；它描述已知混合等宽字体的经验规则，不能保证所有字体版本完全一致。
- 自定义 `wideCharRegex` 只接受单个 Unicode 字符类，例如 `[\\u4e00-\\u9fff]`，避免把复杂正则放入布局热路径。
- 组合 emoji、ZWJ 序列和复杂 grapheme cluster 暂按 code point 迭代，不在当前稳定承诺范围内。
- Web/VS Code/桌面宿主仍应使用实际显示字体做视觉验收；Core 只保证列宽规则一致。

## 相关文档

- [配置模型 vNext](config-model-vnext.md)
- [字体行为与浏览器回退](font-behavior.md)
- [实验能力稳定性矩阵](experimental-stability.md)
- [宿主接入指南](host-integration.md)
