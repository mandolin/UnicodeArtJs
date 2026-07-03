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

# 指定字体和大小
unicode-art text "你好世界" -f "Microsoft YaHei" -e 10

# 居中对齐
unicode-art text "Center" --text-align center

# 使用中文简字符集
unicode-art text "中文测试" --charset CHINESE_SIMPLE
```

## 📖 命令参考

### 通用选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-c, --config <path>` | 配置文件路径 | 自动查找 |
| `--lang <locale>` | 语言 (zh-CN\|en-US) | zh-CN |
| `-i, --image <path>` | 图片输入模式 | - |
| `-t, --text <text>` | 文本输入模式 | - |
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
- `-f, --font <name>` - 字体名称或路径
- `--font-style <style>` - 字体样式 (regular\|bold\|italic\|bold-italic)
- `--font-reduce <number>` - 视觉字体渲染内边距/字号收缩量
- `-m, --matrix <size>` - 矩阵大小（默认6）
- `-r, --ratio <number>` - 垂直水平比例（默认2.0）
- `-v, --invert` - 反转颜色
- `--interpolation <type>` - 插值算法 (nearest\|bilinear\|bicubic\|lanczos)
- `--wide-char-ratio <number>` - 宽字符匹配阈值（默认1.5）
- `--trim-trailing-spaces` - 去除行尾空格
- `--format <format>` - 输出格式 (plain\|html\|ansi)
- `-b, --box <json-or-style>` - 裱框配置，支持 `true`、`false`、内置样式名或 JSON 对象
- `-d, --debug <tags>` - 调试标签，逗号分隔

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
  trimTrailingSpaces: false

# 尺寸配置
size:
  height: 20

# 字符集配置
charset:
  type: ASCII

# 字体配置
font:
  name: Arial
  style: regular
  reduce: 0.8

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

### canvas未安装

如果遇到文本渲染错误，需要安装canvas：

```bash
npm install canvas
```

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

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License
