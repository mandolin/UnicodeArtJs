# UnicodeArtJs

把文字和图片转换成字符画的 TypeScript / JavaScript 工具集。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/unicode-art-js.svg)](https://www.npmjs.com/package/unicode-art-js)
[![CLI](https://img.shields.io/npm/v/unicode-art-cli.svg?label=unicode-art-cli)](https://www.npmjs.com/package/unicode-art-cli)

UnicodeArtJs 面向几种常见使用场景：在网页里生成字符画、在命令行里处理图片或文本、在 VS Code 编辑器中把选中文本转换成 Banner。核心库以 MIT 协议发布，可作为普通 npm 包集成到自己的项目中。

在线体验：<https://mandolin.github.io/UnicodeArtJs/>

## 能做什么

- 将图片转换成 ASCII / Unicode 字符画。
- 将文本渲染成字符 Banner。
- 支持中文、日文等双宽字符场景。
- 支持自定义字符集、矩阵大小、宽高比例、反色、字体收缩等参数。
- 支持给字符画添加边框、标题、留白和阴影。
- 提供实验性的语义文档布局：表头/页脚、跨行跨列单元格与原字输出。
- 提供实验性的 Unicode 艺术字字体格式、校验、渲染与语义布局组合能力。
- 在线工具站提供 source-first 编辑器，可编辑、校验、预览和导入导出语义文档与 UAF 艺术字 JSON。
- 提供实验性的 UAEM 声明式扩展清单，可安全描述本地艺术字字体与语义文档资源。
- 在线工具站提供静态作品画廊，收录许可和来源信息明确的原创 UAF 与语义布局示例。
- 提供 Node、浏览器、CLI、Web 页面和 VS Code 插件等入口。

## 安装

### Core

```bash
npm install unicode-art-js
```

### CLI

```bash
npm install -g unicode-art-cli
```

### VS Code

在 VS Code Marketplace 搜索 `UnicodeArtJs`，或打开：

<https://marketplace.visualstudio.com/items?itemName=mandolin.unicode-art-js-vscode>

## 快速示例

### 在 Node.js 中使用

```js
import {
  imageToArt,
  OutputFormat,
  PresetCharset,
  textToArt
} from 'unicode-art-js';

const textArt = await textToArt('Hello', {
  height: 10,
  charset: { type: PresetCharset.ASCII },
  outputFormat: OutputFormat.PLAIN_TEXT
});

console.log(textArt.content);

const imageArt = await imageToArt('photo.jpg', {
  width: 80,
  matrixSize: 6,
  outputFormat: OutputFormat.PLAIN_TEXT
});

console.log(imageArt.content);
```

### 在浏览器中使用

```js
import {
  OutputFormat,
  PresetCharset,
  textToArt
} from 'unicode-art-js/browser';

const result = await textToArt('中文测试', {
  height: 20,
  charset: { type: PresetCharset.EXTENDED },
  outputFormat: OutputFormat.PLAIN_TEXT,
  visualFont: { family: 'Noto Sans SC, Noto Sans, sans-serif' },
  glyphFont: {
    family: 'Sarasa Mono SC, LXGW WenKai Mono, Source Code Pro, Liberation Mono, monospace',
    widthProfile: 'default'
  }
});

document.querySelector('pre').textContent = result.content;
```

### 使用命令行

```bash
unicode-art text "Hello" --height 10
unicode-art image photo.jpg --width 80
unicode-art text "UnicodeArtJs" --box "{\"enabled\":true,\"style\":\"round\",\"padding\":1}"

# 实验性语义文档：默认读取版本化 JSON AST
unicode-art document table.json --height 12 --box '{"style":"ascii","renderStage":"layout","mode":"grid"}'

# 实验性 Unicode 艺术字字体：校验本地 .uafont.json，不下载第三方资产
unicode-art font validate line-banner.uafont.json --lang zh-CN

# 将嵌入 UAF 字体的 canonical JSON 文档渲染为字符画
unicode-art document banner.json --height 12 --box false
```

更多可运行示例见 [docs/recipes.md](docs/recipes.md) 和 [examples/](examples/)。

## 包和应用

| 位置 | 说明 |
| --- | --- |
| `packages/core` | 核心库，npm 包名为 `unicode-art-js`。 |
| `packages/cli` | 命令行工具，npm 包名为 `unicode-art-cli`。 |
| `packages/web` | 在线工具站，部署到 GitHub Pages。 |
| `packages/vscode-extension` | VS Code 插件。 |

## 本地开发

仓库根目录是私有编排包，不发布到 npm。开发环境建议使用 Node.js 22 和 npm 10：

```bash
npm run install:packages
npm run check
```

更多命令和 lockfile 说明见 [docs/development.md](docs/development.md)。跨入口的版本、升级和回退方式见
[生态兼容性与升级说明](docs/ecosystem-compatibility.md)。

## 字体说明

字符画的最终效果与显示字体有关。为了获得稳定的对齐效果，建议在终端、网页或编辑器中使用混合等宽字体，例如 Sarasa Mono SC、LXGW WenKai Mono、Source Code Pro、Liberation Mono 等。

生成文字 Banner 时，`font` / `visualFont` 影响输入文字被渲染成图像的形状；`glyphFont` 影响字符画结果在页面或编辑器中的显示方式。二者不是同一个概念。

Web 工具站不会打包字体文件；浏览器会使用访问者本机字体，缺失时按字体栈回退。字体检测、Brave 隐私保护差异和自建站网络字体建议见 [docs/font-behavior.md](docs/font-behavior.md)。

## 许可证与来源说明

本项目采用 [MIT License](LICENSE)。

UnicodeArtJs 是 TypeScript / JavaScript 的独立实现。它的功能目标参考了 [UnicodeArt](https://github.com/mandolin/UnicodeArt) 的公开行为和使用体验，并通过测试尽量保持常用参数下的结果接近；实现上不复制 GPL 源码、注释或逐行结构。

Core、CLI、Web 和 VS Code 默认路径采用“清洁分发”策略，依赖优先选择 MIT、Apache-2.0、BSD、ISC 等宽松许可证。桌面应用或可选兼容 adapter 会作为独立项目发布；它们可能使用需要额外 NOTICE、源码获取或替换权利说明的组件，但不会改变 Core 的 MIT 许可或默认安装边界。更多说明见 [docs/license-audit.md](docs/license-audit.md)。

## 相关链接

- 在线工具站：<https://mandolin.github.io/UnicodeArtJs/>
- Core npm 包：<https://www.npmjs.com/package/unicode-art-js>
- CLI npm 包：<https://www.npmjs.com/package/unicode-art-cli>
- VS Code 插件：<https://marketplace.visualstudio.com/items?itemName=mandolin.unicode-art-js-vscode>
- 生态兼容性与升级说明：[docs/ecosystem-compatibility.md](docs/ecosystem-compatibility.md)
- 常见使用 Recipes：[docs/recipes.md](docs/recipes.md)
- 声明式扩展清单说明：[docs/extension-manifest.md](docs/extension-manifest.md)
- 声明式扩展作者指南：[docs/extension-authoring.md](docs/extension-authoring.md)
- 静态作品画廊说明：[docs/gallery.md](docs/gallery.md)
- 问题反馈：<https://github.com/mandolin/UnicodeArtJs/issues>
