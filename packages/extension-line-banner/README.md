# Line Banner

这是 UnicodeArtJs 的官方 UAEM v1 声明式扩展示例。它用于验证扩展清单、资源路径、
UAF 字体和语义文档的协作边界，不包含 JavaScript、WASM、网络下载或安装脚本。

创建自己的资源包前，请阅读仓库的[声明式扩展作者指南](../../docs/extension-authoring.md)
和[UAEM v1 清单规范](../../docs/extension-manifest.md)。本示例可作为最小目录结构和
许可证标注的参考，但不应通过复制其 `meta.id` 冒充官方扩展。

在仓库根目录执行：

    npm run build:core
    node packages/cli/src/console.js extension validate packages/extension-line-banner/unicode-art-extension.json --lang zh-CN

该资源包及其中的所有示例资产均为原创，并以 MIT 许可提供。
