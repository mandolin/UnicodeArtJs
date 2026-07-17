# Line Banner

这是 UnicodeArtJs 的官方 UAEM v1 声明式扩展示例。它用于验证扩展清单、资源路径、UAF 字体和语义文档的协作边界，不包含 JavaScript、WASM、网络下载或安装脚本。

创建自己的资源包前，请阅读仓库的[UAF 字体作者指南](../../docs/uaf-authoring.md)、[语义布局作者指南](../../docs/semantic-document-authoring.md)、[声明式扩展作者指南](../../docs/extension-authoring.md)、[UAEM v1 清单规范](../../docs/extension-manifest.md)和[声明式扩展 SDK](../../docs/extension-sdk.md)。复制本目录结构时，请同时阅读 [TEMPLATE.md](TEMPLATE.md)，并替换 `meta.id`、资源 ID、作者和许可证信息。

## 目录

```text
packages/extension-line-banner/
  unicode-art-extension.json
  assets/
    line-font.uafont.json
    banner-template.uadoc.json
  README.md
  TEMPLATE.md
  LICENSE
```

## 资源

- `assets/line-font.uafont.json`：原创 MIT UAF 字体，覆盖 `A`、`U`、`J` 和 fallback 字形，可作为最小字体模板。
- `assets/banner-template.uadoc.json`：原创 MIT 语义文档模板，演示 `art-font-text` 如何嵌入 UAF 字体。
- `unicode-art-extension.json`：UAEM v1 清单，声明两个本地资源，并限制宿主只读取清单目录内的声明文件。

## 验证

在仓库根目录执行：

```bash
npm run extension-example:check
node packages/cli/src/console.js extension validate packages/extension-line-banner/unicode-art-extension.json --lang zh-CN
node packages/cli/src/console.js extension inspect packages/extension-line-banner/unicode-art-extension.json --json --lang zh-CN
node packages/cli/src/console.js font validate packages/extension-line-banner/assets/line-font.uafont.json --lang zh-CN
node packages/cli/src/console.js document packages/extension-line-banner/assets/banner-template.uadoc.json --height 4 --no-config --lang zh-CN
```

这些命令只做本地预检，不安装、注册或执行扩展。

## 复制注意事项

- 不要复用官方 `org.unicodeartjs.line-banner` ID。
- 资源路径必须是相对 POSIX 路径，例如 `assets/my-font.uafont.json`。
- 如果资源不是原创，必须补充来源、署名和再分发许可。
- 浏览器宿主通常只能检查用户显式选择的清单文件，不能自动读取相邻资源；完整资源预检请使用 CLI。

该资源包及其中的所有示例资产均为原创，并以 MIT 许可提供。
