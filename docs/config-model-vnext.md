# 配置模型 vNext

UnicodeArtJs 同时提供 Core、CLI、Web、VS Code Extension 和桌面宿主。不同入口可以有自己的界面和默认值，但同一个配置名必须表达同一个含义。本页定义当前推荐的统一配置模型，并说明旧字段如何迁移。

## 核心术语

| 术语 | 含义 | 当前状态 |
| --- | --- | --- |
| 视觉字体 `visualFont` | 输入文字在文字 Banner 模式下渲染成中间图像时使用的字体。 | 推荐字段 |
| 字素字体 `glyphFont` | 字符画生成后，输出字素在预览、导出或编辑器中显示时使用的字体。 | 推荐字段 |
| 字素宽度规则 `glyphWidthProfile` / `wideCharRegex` | 计算某个字素显示列宽时使用的 profile 或用户自定义宽字素正则。 | `glyphWidthProfile` 仍是实验能力 |
| 输出目标 `outputTarget` | 描述结果主要面向普通文本、终端、Web、VS Code、桌面宿主、HTML 或 ANSI。 | 当前主要用于配置协调和后续宿主分支 |
| 语言 `locale` | Core 错误和提示消息语言。 | 已生效；不影响算法结果 |

## 推荐配置形状

Core 推荐调用方优先传入对象化字段：

```ts
const config = {
  visualFont: {
    family: 'Noto Sans SC',
    style: 'regular',
    reduce: 0
  },
  glyphFont: {
    family: "'Sarasa Mono SC', 'LXGW WenKai Mono', 'Source Code Pro', monospace",
    widthProfile: 'default',
    wideCharRegex: undefined
  },
  outputTarget: 'web',
  locale: 'zh-CN'
};
```

旧字段仍保持兼容：

| 旧字段 | 推荐字段 | 归一化规则 |
| --- | --- | --- |
| `font` | `visualFont.family` | 未传 `visualFont.family` 时使用 `font`。 |
| `fontStyle` | `visualFont.style` | 未传 `visualFont.style` 时使用 `fontStyle`。 |
| `fontReduce` | `visualFont.reduce` | 未传 `visualFont.reduce` 时使用 `fontReduce`。 |
| `glyphFontFamily` | `glyphFont.family` | 未传 `glyphFont.family` 时使用 `glyphFontFamily`。 |
| `glyphWidthProfile` | `glyphFont.widthProfile` | 未传 `glyphFont.widthProfile` 时使用 `glyphWidthProfile`，默认 `default`。 |
| `wideCharRegex` | `glyphFont.wideCharRegex` | 未传 `glyphFont.wideCharRegex` 时使用 `wideCharRegex`；空字符串等价于未设置。 |
| `lang` / `i18n.lang` | `locale` | CLI 会把命令行或配置文件里的语言设置映射到 Core `locale`。 |

当对象字段和旧字段同时出现时，对象字段优先。这样可以让旧配置继续运行，同时让新入口逐步迁移到更清楚的结构。

## 字段职责

### `visualFont`

`visualFont` 只描述输入文字如何被渲染为采样图像。它适用于文字 Banner、语义文档中的 art-text 内容块，以及后续需要先“文字转图像”的路径。

`visualFont.reduceTop`、`visualFont.reduceRight`、`visualFont.reduceBottom`、`visualFont.reduceLeft` 是为视觉字体手动纠偏保留的方向性字段。当前稳定路径只使用统一的 `visualFont.reduce` / `fontReduce`，界面可以展示为后续能力，不应承诺已经改变输出。

### `glyphFont`

`glyphFont.family` 描述字符画最终展示时的字素字体。浏览器和 VS Code 会用它控制预览区域和导出内容的 `font-family`；浏览器 Core 还会用它生成字符模板。Node Core 在未显式指定字素字体时会回退到视觉字体。

`glyphFont.widthProfile` 和 `glyphFont.wideCharRegex` 用于列宽计算，影响裱框、语义布局、UAF 艺术字宽度和导出结果的解释。`wideCharRegex` 是完整的用户自定义规则，优先级高于 profile。

### `outputTarget`

`outputTarget` 描述结果主要被谁消费。当前它不直接改变采样算法，但可以帮助 CLI、Web、VS Code 和桌面宿主选择导出提示、默认格式和兼容说明。

有效值为：

| 值 | 建议场景 |
| --- | --- |
| `plain` | 普通纯文本、未知宿主 |
| `terminal` | 终端输出 |
| `web` | Web 页面预览或导出 |
| `vscode` | VS Code Extension |
| `electron` | Electron 或其他桌面宿主 |
| `html` | HTML 输出 |
| `ansi` | ANSI 输出 |

### `locale`

`locale` 只影响 Core 产生的错误、诊断和提示消息，不改变转换算法。当前支持 `zh-CN` 与 `en-US`。CLI 的 `--lang`、Web 的语言下拉和 VS Code 的宿主语言都应映射到此字段。

## 各入口命名对照

| 概念 | Core | CLI | Web | VS Code Extension |
| --- | --- | --- | --- | --- |
| 视觉字体 | `visualFont.family` / `font` | `--visual-font` / `--font` | “视觉字体（渲染用）” | `unicodeArtJs.visualFont` / `unicodeArtJs.font` |
| 字素字体 | `glyphFont.family` / `glyphFontFamily` | `--glyph-font` | “字素字体（显示用）” | `unicodeArtJs.glyphFont` |
| 字素宽度 profile | `glyphFont.widthProfile` / `glyphWidthProfile` | `--glyph-width-profile` | “字素宽度规则（实验）” | `unicodeArtJs.glyphWidthProfile` |
| 自定义宽字素正则 | `glyphFont.wideCharRegex` / `wideCharRegex` | `--wide-char-regex` | “自定义宽字素正则” | `unicodeArtJs.wideCharRegex` |
| 输出目标 | `outputTarget` | `--output-target` | 固定为 `web` | 固定为 `vscode` |
| 语言 | `locale` | `--lang` | “语言” | 跟随 VS Code `vscode.env.language` |
| 视觉字体收缩 | `visualFont.reduce` / `fontReduce` | `--font-reduce` | “视觉字体收缩” | `unicodeArtJs.fontReduce` |

## 迁移建议

1. 新代码优先写入 `visualFont`、`glyphFont`、`outputTarget` 和 `locale`。
2. 旧配置文件可以继续使用 `font`、`fontStyle`、`fontReduce`、`glyphFontFamily`、`glyphWidthProfile` 和 `wideCharRegex`。
3. UI 中同时保留旧字段时，应明确标注旧字段只是兼容别名，不应让用户误以为它和新字段是两套独立配置。
4. 修改字体、宽字素规则、语言或输出目标时，应同步检查 Core、CLI、Web、VS Code Extension 的命名是否仍保持一致。

## 相关文档

- [实验能力稳定性矩阵](experimental-stability.md)
- [字体行为与浏览器回退](font-behavior.md)
- [宿主接入指南](host-integration.md)
- [Web 集成与数据边界](web-integration.md)
- [VS Code Extension 集成与数据边界](vscode-extension-integration.md)
