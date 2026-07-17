# unicode-art-cli

Unicode Art CLI - 将文本和图片转换为 Unicode 字符画的命令行工具。

本工具基于 MIT 许可的 `unicode-art-js` Core 独立实现构建。项目功能目标参考 UnicodeArt 的公开行为和使用体验，并通过兼容性测试尽量对齐常用参数下的输出效果；公开文档不将本项目描述为 GPL 源码的直接移植或逐行翻译。

## 📦 安装

### 全局安装

```bash
npm install -g unicode-art-cli
```

### 本地安装

```bash
npm install unicode-art-cli
```

## 🚀 快速开始

### 图片转字符画

```bash
# 基本用法
unicode-art image photo.jpg

# 指定输出文件
unicode-art image photo.jpg -o output.txt

# 自定义高度
unicode-art image photo.jpg -e 30

# 使用扩展字符集
unicode-art image photo.jpg --charset EXTENDED

# 反转颜色
unicode-art image photo.jpg -v
```

### 文本转字符画

```bash
# 基本用法
unicode-art text "Hello World"

# 指定开源视觉字体和大小
unicode-art text "你好世界" --visual-font "Noto Sans SC" -e 10

# 居中对齐
unicode-art text "Center" --text-align center

# 使用中文简字符集
unicode-art text "中文测试" --charset CHINESE_SIMPLE
```

### 语义文档转字符画（实验性）

`document` 命令默认读取版本化 JSON AST，可用于表头、页脚、跨行跨列单元格、原字输出和嵌入式
Unicode 艺术字（`art-font-text`）区块。
普通 `text` 命令不会隐式解析这些标记，因此已有脚本不会因为 DSL 语法产生歧义。

```bash
unicode-art document table.json --height 12 --box '{"style":"ascii","renderStage":"layout","mode":"grid"}'

# 显式读取轻量 DSL；JSON 仍是推荐的长期保存格式
unicode-art document table.uadsl --document-format dsl --row-separator semantic --height 12
```

JSON 使用 `rowSpan` / `colSpan`；轻量 DSL 使用 `{rowspan:2}` / `{colspan:2}`，并兼容旧的
`{c:2}` / `{r:2}`。`{t:原字}` 表示原字直接输出，不经过字符画转换。DSL 的 `{h}` 和 `{f}`
分别表示表头和页脚，默认单元格分隔符为 `|`，行分隔符可选换行、`{n}` 或二者配对。

## 📖 命令参考

### 通用选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-c, --config <path>` | 配置文件路径 | 自动查找 |
| `--lang <locale>` | 语言 (zh-CN\|en-US) | zh-CN |
| `-i, --image <path>` | 图片输入模式 | - |
| `-t, --text <text>` | 文本输入模式 | - |
| `--no-config` | 禁用配置文件自动发现 | false |
| `--help` | 显示帮助信息 | - |
| `--version` | 显示版本号 | - |

### 输入模式

#### `image` 命令

```bash
unicode-art image <input> [options]
```

**参数**:
- `<input>` - 输入图片路径（必需）

**选项**:
- `-o, --output <path>` - 输出文件路径
- `-p, --print [mode]` - 指定输出文件时同时打印到终端，兼容 `spec|all|debug`
- `-e, --height <number>` - 输出高度（行数）
- `-w, --width <number>` - 输出宽度（列数）
- `-a, --chars <string>` - 自定义字符集
- `--charset <type>` - 预设字符集 (ASCII\|EXTENDED\|CHINESE_SIMPLE)
- `-f, --font <name>` - 视觉字体名称或路径（兼容旧参数）
- `--visual-font <name>` - 视觉字体名称或路径
- `--glyph-font <name>` - 字素显示字体
- `--glyph-width-profile <name>` - 字素宽度 profile 名称（实验性，影响裱框、布局与输出列数）
- `--wide-char-regex <regex>` - 完整宽字素集合正则（实验性，优先于 profile）
- `--font-style <style>` - 字体样式 (regular\|bold\|italic\|bold-italic)
- `--font-reduce <number>` - 视觉字体渲染内边距/字号收缩量
- `-m, --matrix <size>` - 矩阵大小（默认6）
- `-r, --ratio <number>` - 垂直水平比例（默认2.0）
- `-v, --invert` - 反转颜色
- `--interpolation <type>` - 插值算法 (nearest\|bilinear\|bicubic\|lanczos)
- `--wide-char-ratio <number>` - 宽字符匹配阈值（默认1.5）
- `--trim-trailing-spaces` - 去除行尾空格
- `--format <format>` - 输出格式 (plain\|html\|ansi)
- `--output-target <target>` - 输出目标环境 (plain\|terminal\|web\|vscode\|electron\|html\|ansi)
- `--image-backend <backend>` - Node 图片后端 (`napi-rs`|`sharp`)。默认 `napi-rs`；`sharp` 是 legacy opt-in 后端，需要用户自行安装 `sharp`
- `-b, --box <json-or-style>` - 裱框配置，支持 `true`、`false`、内置样式名或 JSON 对象
- `-d, --debug <tags>` - 调试标签，逗号分隔
- `--no-config` - 禁用配置文件自动发现

#### `text` 命令

```bash
unicode-art text <text> [options]
```

**参数**:
- `<text>` - 输入文本字符串（必需）

**选项**:
- 包含所有 `image` 命令的选项，外加：
- `--text-align <align>` - 文本对齐 (left\|center\|right)
- `--line-spacing <number>` - 行间距（默认1.0）
- `--height-mode <mode>` - 高度模式 (line\|total)

`text -` 可以从 stdin 读取文本：

```bash
echo "Hello" | unicode-art text - --height 8
```

#### `document` 命令（实验性）

```bash
unicode-art document <input> [options]
```

- `<input>` - JSON / DSL 文档文件路径；传入 `-` 时从 stdin 读取。
- `--document-format <format>` - `json`（默认）或 `dsl`。
- `--row-separator <mode>` - DSL 行分隔模式：`lineBreak`、`semantic`、`both`。
- `--column-separator <separator>` - DSL 单元格分隔符，默认 `|`。
- 其余字符集、视觉字体、字素字体、尺寸、输出、`--box` 和语言选项与 `text` 命令一致。
- canonical JSON 可使用 `{ "kind": "art-font-text", "text": "A", "font": { ...UAF v1... } }`
  嵌入已校验的 UAF 字体；DSL 暂不提供艺术字标签，避免字体资产与轻量文本语法耦合。

#### `font` 命令（实验性）

```bash
unicode-art font validate <input> [--json] [--lang zh-CN|en-US]
unicode-art font inspect <input> [--json] [--lang zh-CN|en-US]
```

- `<input>` - `.uafont.json` 文件路径；传入 `-` 时从 stdin 读取。
- `validate` - 校验 UAF 版本、字形行数、advance、宽度规则、SPDX expression 和来源字段。
- `inspect` - 输出字体 ID、作者、许可证、字形数量和度量信息，不渲染艺术字。
- `--json` - 输出机器可读摘要，便于 CI 或后续编辑器工具使用。

当前命令不会下载、安装或打包第三方 FIGlet 字体。`official bundle candidate` 仅表示该 SPDX
expression 是否符合 UnicodeArtJs 的首轮宽松许可白名单，不能替代对字体来源和版权的人工审计。

#### extension 命令（实验性）

    unicode-art extension validate <manifest> [--json] [--lang zh-CN|en-US]
    unicode-art extension inspect <manifest> [--json] [--lang zh-CN|en-US]

- manifest 是本地 unicode-art-extension.json 文件，不能使用 stdin。
- validate 会校验 UAEM 清单、当前 CLI/Core 兼容性，并在 manifest 所在目录内逐个读取和
  校验已声明的 UAF 字体或语义文档资源。
- inspect 输出相同的本地资源摘要；即使与当前 CLI 不兼容，也会保留兼容性原因供开发者查看。
- 两个命令都不会安装、注册、下载或执行扩展代码。读取资源前会复核 realpath 仍位于
  manifest 根目录内，以避免符号链接逃逸。

完整格式请见仓库的 docs/extension-manifest.md，以及 packages/extension-line-banner 官方示例。

## 📝 配置文件

支持以下格式的配置文件：

- `.unicode-artrc.yml`
- `.unicode-artrc.json`
- `unicode-art.config.js`

### 示例配置 (.unicode-artrc.yml)

```yaml
# 输出配置
output:
  format: plain
  target: terminal
  trimTrailingSpaces: false

# 图片输入配置
image:
  backend: napi-rs # napi-rs | sharp

# 尺寸配置
size:
  height: 20

# 字符集配置
charset:
  type: ASCII

# 字体配置
font:
  name: "Noto Sans SC"
  style: regular
  reduce: 0.8

# 统一配置模型（推荐新写法）
visualFont:
  family: "Noto Sans SC"
  style: regular
  reduce: 0
glyphFont:
  family: "Sarasa Mono SC, LXGW WenKai Mono, Source Code Pro, Liberation Mono, monospace"
  widthProfile: default
  wideCharRegex: ""

# 算法配置
algorithm:
  matrixSize: 6
  ratio: 2.0
  interpolation: bilinear
  wideCharRatio: 1.5

# 颜色配置
color:
  invert: false

# 文本配置
text:
  align: left
  lineSpacing: 1.0
  heightMode: line

# 国际化
i18n:
  lang: zh-CN
```

`--lang` / `i18n.lang` 会同步传递给 Core 的 `locale` 配置，因此 Core 层配置错误也会尽量使用对应语言输出。

## 开发者文档

CLI 的命令入口、配置归并和输出边界可通过仓库根目录的 HIA 文档生成器检查：

```bash
npm run docs:cli:check
```

该文档用于追溯当前实现。稳定使用方式仍以本 README、`unicode-art --help` 和已发布的配置契约为准；
`src/console.js` 中的辅助函数不是可由第三方稳定 `require` 的 SDK。

## 发布准备

仓库开发态默认使用本地 Core：

```bash
npm --workspace packages/cli run core:dep:status
```

发布 CLI 前切换到 npm Core 依赖：

```bash
npm --workspace packages/cli run core:dep:npm
npm --workspace packages/cli run release:verify
npm --workspace packages/cli run smoke:pack-install
```

发布完成后切回本地 Core，便于后续联动开发：

```bash
npm --workspace packages/cli run core:dep:local
```

## 🎨 字符集说明

### ASCII
基础ASCII字符集，适合英文文本和简单图像。
```
 .:-=+*#%@
```

### EXTENDED
扩展字符集，包含更多灰度级别。
```
 ░▒▓█▀▄■□○●◇◆▲▼★☆
```

### CHINESE_SIMPLE
简化中文字符集，包含3500+常用汉字。

## 💡 使用技巧

### 1. 调整输出质量

```bash
# 更高分辨率（更多行数）
unicode-art image photo.jpg -e 50

# 更精细的字符匹配
unicode-art image photo.jpg -m 8
```

### 2. 优化性能

```bash
# 使用最近邻插值（更快但质量略低）
unicode-art image photo.jpg --interpolation nearest

# 禁用早期终止（更准确但更慢）
# （需要通过配置文件设置 enableEarlyTermination: false）
```

### 3. 特殊效果

```bash
# 反转颜色（黑底白字）
unicode-art image photo.jpg -v

# HTML彩色输出
unicode-art image photo.jpg --format html -o output.html

# 为输出添加外框
unicode-art text "Hello" --box round
unicode-art text "Hello" --box "{\"style\":\"ascii\",\"padding\":1,\"title\":\"Demo\"}"
# PowerShell JSON 写法
unicode-art text "Hello" --box '{\"style\":\"ascii\",\"padding\":1,\"title\":\"Demo\"}'
# 固定宽度、换行和阴影
unicode-art text "HelloWorld" --box '{\"style\":\"ascii\",\"width\":8,\"overflow\":\"wrap\",\"shadow\":{\"style\":\"block\"}}'
# Layout stage 网格裱框
unicode-art text "AB" --box '{\"renderStage\":\"layout\",\"mode\":\"grid\",\"style\":\"ascii\",\"separators\":{\"rows\":true,\"columns\":true},\"cell\":{\"minWidth\":1,\"minHeight\":1}}'

# ANSI彩色终端输出
unicode-art image photo.jpg --format ansi
```

## 🔧 故障排除

### 文本渲染运行时加载失败

CLI 随 `unicode-art-js` 使用 `@napi-rs/canvas` 的 Skia 运行时，不需要额外
安装 `canvas`。若出现原生运行时加载错误，请先确认当前 Node 版本受支持，并在
干净目录重新安装 CLI；不要手动安装旧的 node-canvas 作为修复方式。

### 字体找不到

确保系统中安装了指定的字体，或使用字体文件路径：

```bash
unicode-art text "Hello" -f "/path/to/font.ttf"
```

### 配置文件加载失败

检查配置文件语法是否正确，或使用默认配置：

```bash
# 不使用配置文件
unicode-art image photo.jpg --no-config
```

## 📊 性能基准

| 图像尺寸 | 预计耗时 | 内存占用 |
|---------|---------|---------|
| 100×100 | 50-100ms | ~10MB |
| 200×200 | 150-300ms | ~20MB |
| 800×600 | 500-1000ms | ~40MB |
| 1920×1080 | 1500-3000ms | ~80MB |

*实际性能取决于硬件配置和字符集大小*

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。提交前建议先查看仓库的 [支持与反馈](../../docs/support.md)
和 [已知限制](../../docs/known-limitations.md)，以便选择正确组件并提供最小复现命令。

## 📄 许可证

MIT License
