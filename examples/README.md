# UnicodeArtJs Examples

本目录提供可直接运行的最小示例。示例优先覆盖公开稳定入口，并尽量使用仓库内已提交的 fixture，避免依赖本机私有路径、字体文件或网络资源。

运行全部示例检查：

```bash
npm run recipes:check
```

单独运行 Node 示例前，请先在仓库根目录构建 Core：

```bash
npm run build:core
node examples/node/text-banner.mjs
node examples/node/image-file.mjs
node examples/node/semantic-document.mjs
node examples/node/uaf-font.mjs
```

更多使用场景见 [docs/recipes.md](../docs/recipes.md)。

如果只是第一次试用，建议先看 [Quickstart](../docs/quickstart.md)。
