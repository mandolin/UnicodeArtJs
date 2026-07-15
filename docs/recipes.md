# UnicodeArtJs Recipes

这页收集常见使用场景的可复制示例。示例尽量使用已发布 API、已提交 fixture 和开源字体名称，不依赖本机私有路径、密钥或网络下载。

在线工具站：<https://mandolin.github.io/UnicodeArtJs/>

## 本仓库内运行示例

仓库根目录提供一组可执行 Node 示例：

```bash
npm run build:core
node examples/node/text-banner.mjs
node examples/node/image-file.mjs
node examples/node/semantic-document.mjs
node examples/node/uaf-font.mjs
```

一次性检查全部 recipes：

```bash
npm run recipes:check
```

## Core：文本生成字符画

适合在 Node.js 服务、脚本或桌面宿主中调用 Core。

```js
import {
  OutputFormat,
  PresetCharset,
  textToArt
} from 'unicode-art-js';

const result = await textToArt('UnicodeArtJs', {
  height: 12,
  charset: { type: PresetCharset.ASCII },
  outputFormat: OutputFormat.PLAIN_TEXT,
  visualFont: {
    family: 'Noto Sans SC, Noto Sans, Arial, sans-serif',
    reduce: 0
  },
  glyphFont: {
    family: 'Sarasa Mono SC, LXGW WenKai Mono, Source Code Pro, Liberation Mono, monospace',
    widthProfile: 'default'
  },
  box: { style: 'round', padding: 1, title: 'Text' },
  locale: 'en-US'
});

console.log(result.content);
```

可运行文件：`examples/node/text-banner.mjs`。

## Core：图片文件生成字符画

默认 Node 图片后端是 `napi-rs`，当前稳定目标是 PNG / JPEG / WebP / BMP。下面示例使用仓库内测试图片，应用中可替换为自己的图片路径。

```js
import {
  imageToArt,
  OutputFormat,
  PresetCharset
} from 'unicode-art-js';

const result = await imageToArt('packages/core/tests/test-image-zhong.png', {
  height: 16,
  charset: { type: PresetCharset.EXTENDED },
  outputFormat: OutputFormat.PLAIN_TEXT,
  imageBackend: 'napi-rs',
  trimTrailingSpaces: true,
  locale: 'zh-CN'
});

console.log(result.content);
```

可运行文件：`examples/node/image-file.mjs`。

## CLI：命令行生成与导出

安装后使用：

```bash
npm install -g unicode-art-cli
unicode-art text "Recipe" --height 8 --chars " .:-=+*#%@" --box '{"style":"ascii","padding":1,"title":"CLI"}'
unicode-art image photo.png --height 24 --charset EXTENDED --image-backend napi-rs --output output.txt
```

在仓库源码中验证同一类命令：

```bash
node packages/cli/src/console.js text "Recipe" --no-config --height 8 --chars " .:-=+*#%@" --box '{"style":"ascii","padding":1,"title":"CLI"}'
node packages/cli/src/console.js image packages/core/tests/test-image-zhong.png --no-config --height 12 --charset ASCII --image-backend napi-rs
```

PowerShell 中 JSON 参数建议使用单引号包住整体字符串：

```powershell
unicode-art text "Recipe" --box '{"style":"ascii","padding":1,"title":"CLI"}'
```

## Web：在线工具站

不需要安装：

1. 打开 <https://mandolin.github.io/UnicodeArtJs/>。
2. 使用“图片转字符画”上传本地图片，或切换到“文字 Banner”输入文字。
3. 需要对齐稳定时，将“字素字体（显示用）”设为本机已安装的严格混合等宽字体，例如 Sarasa Mono SC 或 LXGW WenKai Mono。
4. 使用“TXT / HTML / PNG / 复制”导出结果。
5. 使用“开发文档”查看 Core、CLI、Web 和 VS Code Extension 的公开文档入口。

如果切换字体后预览没有变化，先看页面上的字体可用性提示，再确认本机字体安装和浏览器隐私设置。浏览器端二次开发请使用 `unicode-art-js/browser`；字体回退说明见 [字体行为与浏览器回退](font-behavior.md)，更小的 adapter 示例见 [浏览器 Adapter 最小示例](browser-adapter-minimal-example.md)。

## VS Code：选中文本生成 Banner

1. 从 Marketplace 安装 `UnicodeArtJs`。
2. 在编辑器中选中文本。
3. 右键选择 `UnicodeArtJs: Generate Unicode Art: Default Template`。
4. 需要调整参数时运行 `UnicodeArtJs: Open Converter`。
5. 在 Converter 中分别设置 `Visual Font` 和 `Glyph Font`；前者影响输入文字栅格化，后者影响预览、HTML 导出和编辑器显示。
6. 调整完成后可保存默认模板或 Template 1 / 2 / 3。

如果安装或更新 VSIX 后命令没有出现，运行 `Developer: Reload Window`。

## 语义文档：表格、页脚和原字输出

语义文档使用 JSON 作为长期保存格式。`raw-text` 会原样输出，`art-text` 会经过字符画转换。

```js
import {
  OutputFormat,
  PresetCharset,
  semanticDocumentToArt
} from 'unicode-art-js';

const document = {
  version: 1,
  rows: [
    {
      role: 'header',
      cells: [
        { blocks: [{ kind: 'raw-text', text: 'Name' }] },
        { blocks: [{ kind: 'raw-text', text: 'Value' }] }
      ]
    },
    {
      cells: [
        { blocks: [{ kind: 'raw-text', text: 'Mode' }] },
        { blocks: [{ kind: 'art-text', text: 'Core' }] }
      ]
    }
  ]
};

const result = await semanticDocumentToArt(document, {
  height: 8,
  charset: { type: PresetCharset.ASCII },
  outputFormat: OutputFormat.PLAIN_TEXT,
  box: { style: 'ascii', renderStage: 'layout', mode: 'grid' }
});

console.log(result.content);
```

可运行文件：`examples/node/semantic-document.mjs`。

CLI 也可以读取 JSON 文档：

```bash
unicode-art document table.json --height 12 --box '{"style":"ascii","renderStage":"layout","mode":"grid"}'
```

## UAF 艺术字字体与 UAEM 扩展清单

UAF 是 UnicodeArtJs 的版本化艺术字字体 JSON，不是操作系统字体文件。UAEM 是声明式扩展清单，只描述本地资源，不执行代码。

渲染 UAF：

```js
import fs from 'node:fs';
import {
  parseUnicodeArtFontJson,
  renderUnicodeArtFontText
} from 'unicode-art-js';

const font = parseUnicodeArtFontJson(
  fs.readFileSync('packages/extension-line-banner/assets/line-font.uafont.json', 'utf8')
);

console.log(renderUnicodeArtFontText(font, 'UA').content);
```

可运行文件：`examples/node/uaf-font.mjs`。

检查官方声明式扩展示例：

```bash
unicode-art extension inspect packages/extension-line-banner/unicode-art-extension.json --json
unicode-art extension validate packages/extension-line-banner/unicode-art-extension.json --lang zh-CN
```

更多格式说明见 [声明式扩展清单](extension-manifest.md) 和 [声明式扩展作者指南](extension-authoring.md)。

## 示例维护约定

- 新增稳定公共入口时，应补一个最小 recipe 或说明为什么暂不适合。
- 示例不得依赖未提交 fixture、本机私有字体文件、密钥或一次性调试目录。
- 修改示例、README 或公开命令后运行 `npm run recipes:check`。
