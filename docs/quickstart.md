# UnicodeArtJs Quickstart

这页给出最短上手路径。想看更多场景和完整片段，请继续看 [Recipes](recipes.md)。

在线工具站：<https://mandolin.github.io/UnicodeArtJs/>

## 选择入口

| 想做的事 | 推荐入口 |
| --- | --- |
| 立即试用图片或文字转换 | 打开在线工具站 |
| 在脚本、服务或桌面宿主中调用 | 安装 `unicode-art-js` |
| 在终端批量转换文件 | 安装 `unicode-art-cli` |
| 在 VS Code 里把选中文本转成 Banner | 安装 VS Code Extension |
| 研究语义布局、UAF 艺术字或扩展资源包 | 从 `docs/recipes.md` 和 `examples/` 开始 |

## 在线试用

1. 打开 <https://mandolin.github.io/UnicodeArtJs/>。
2. 选择“图片转字符画”或“文字 Banner”。
3. 调整高度、字符集、视觉字体、字素字体和裱框。
4. 使用 TXT、HTML、PNG 或复制按钮导出结果。

`视觉字体` 影响输入文字被渲染成图像时的形状；`字素字体` 影响字符画结果的显示、导出和对齐。两者不是同一个概念。

## Core

安装：

```bash
npm install unicode-art-js
```

最小文本示例：

```js
import { OutputFormat, PresetCharset, textToArt } from 'unicode-art-js';

const result = await textToArt('Hello', {
  height: 10,
  charset: { type: PresetCharset.ASCII },
  outputFormat: OutputFormat.PLAIN_TEXT
});

console.log(result.content);
```

Node 默认使用 `@napi-rs/canvas` 渲染文字、使用 `@napi-rs/image` 解码 PNG / JPEG / WebP / BMP。浏览器项目请从 `unicode-art-js/browser` 导入。

## CLI

安装：

```bash
npm install -g unicode-art-cli
```

常用命令：

```bash
unicode-art text "Hello" --height 10
unicode-art image photo.png --height 24 --charset EXTENDED --image-backend napi-rs --output output.txt
unicode-art text "UnicodeArtJs" --box '{"style":"round","padding":1,"title":"Demo"}'
```

PowerShell 中建议用单引号包住 `--box` 的 JSON 字符串，避免双引号转义影响可读性。

## VS Code Extension

Marketplace：<https://marketplace.visualstudio.com/items?itemName=mandolin.unicode-art-js-vscode>

1. 安装 `UnicodeArtJs`。
2. 在编辑器里选中文本。
3. 右键选择 `UnicodeArtJs: Generate Unicode Art: Default Template`。
4. 需要完整参数时，运行 `UnicodeArtJs: Open Converter`。

如果本地安装或更新 VSIX 后菜单没有出现，运行 `Developer: Reload Window`。

## 本仓库示例

在仓库根目录安装依赖后，可以运行已提交的最小示例：

```bash
npm run build:core
node examples/node/text-banner.mjs
node examples/node/image-file.mjs
node examples/node/semantic-document.mjs
node examples/node/uaf-font.mjs
```

一次性检查公开示例：

```bash
npm run recipes:check
```

## 下一步

- 更多可复制场景：[Recipes](recipes.md)
- 配置字段和兼容别名：[配置模型 vNext](config-model-vnext.md)
- 字体回退和浏览器差异：[字体行为与浏览器回退](font-behavior.md)
- 支持入口和问题报告：[支持与反馈](support.md)
