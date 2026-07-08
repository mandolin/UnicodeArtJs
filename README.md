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
const { textToArt, imageToArt } = require('unicode-art-js');

const textArt = textToArt('Hello', {
  font: 'Noto Sans SC',
  height: 10,
  charset: 'ASCII'
});

console.log(textArt);

const imageArt = await imageToArt('photo.jpg', {
  width: 80,
  matrixSize: 6
});

console.log(imageArt);
```

### 在浏览器中使用

```js
import { textToArt } from 'unicode-art-js/browser';

const result = await textToArt('中文测试', {
  height: 20,
  charset: 'EXTENDED',
  font: 'Noto Sans SC'
});

document.querySelector('pre').textContent = result.content;
```

### 使用命令行

```bash
unicode-art text "Hello" --height 10
unicode-art image photo.jpg --width 80
unicode-art text "UnicodeArtJs" --box "{\"enabled\":true,\"style\":\"round\",\"padding\":1}"
```

## 包和应用

| 位置 | 说明 |
| --- | --- |
| `packages/core` | 核心库，npm 包名为 `unicode-art-js`。 |
| `packages/cli` | 命令行工具，npm 包名为 `unicode-art-cli`。 |
| `packages/web` | 在线工具站，部署到 GitHub Pages。 |
| `packages/vscode-extension` | VS Code 插件。 |
| `packages/electron-app` | 桌面端预留目录。 |

## 字体说明

字符画的最终效果与显示字体有关。为了获得稳定的对齐效果，建议在终端、网页或编辑器中使用混合等宽字体，例如 Sarasa Mono SC、LXGW WenKai Mono、Source Code Pro、Liberation Mono 等。

生成文字 Banner 时，`font` / `visualFont` 影响输入文字被渲染成图像的形状；`glyphFont` 影响字符画结果在页面或编辑器中的显示方式。二者不是同一个概念。

## 许可证与来源说明

本项目采用 [MIT License](LICENSE)。

UnicodeArtJs 是 TypeScript / JavaScript 的独立实现。它的功能目标参考了 [UnicodeArt](https://github.com/mandolin/UnicodeArt) 的公开行为和使用体验，并通过测试尽量保持常用参数下的结果接近；实现上不复制 GPL 源码、注释或逐行结构。

项目依赖优先选择 MIT、Apache-2.0、BSD、ISC 等宽松许可证。更多说明见 [docs/license-audit.md](docs/license-audit.md)。

## 相关链接

- 在线工具站：<https://mandolin.github.io/UnicodeArtJs/>
- Core npm 包：<https://www.npmjs.com/package/unicode-art-js>
- CLI npm 包：<https://www.npmjs.com/package/unicode-art-cli>
- VS Code 插件：<https://marketplace.visualstudio.com/items?itemName=mandolin.unicode-art-js-vscode>
- 问题反馈：<https://github.com/mandolin/UnicodeArtJs/issues>
