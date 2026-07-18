# UnicodeArtJs 静态作品画廊

[UnicodeArtJs 在线工具](https://mandolin.github.io/UnicodeArtJs/)顶部的“作品画廊”收录可直接预览、复制、下载或送入编辑器的示例资产。

首版画廊是纯静态内容：作品索引和 JSON 源文件都随网站发布到 GitHub Pages，不依赖账号、数据库、对象存储或长期服务器。页面不会上传作品，也不会下载或执行第三方代码。

## 已展示的内容

- `unicode-art-font@1`：项目原创的 UAF 艺术字字体及其示例文字。
- `semantic-document@1`：表格、混排字素宽度和原字输出等布局文档。
- 每个作品都在索引中标明作者、许可证、来源状态和审核日期。

当前内置作品均为 UnicodeArtJs 原创并采用 MIT License。第三方字体、FIGlet 语料、图片和不可核验来源的字符画不会自动进入默认画廊。

## 使用方式

1. 打开在线工具并选择“作品画廊”。
2. 用关键词或标签筛选作品，点击卡片查看字符画预览与元数据。
3. 使用“复制字符画”或“下载源文件”取得作品内容。
4. 使用“在编辑器中打开”将同一份 canonical JSON 交给 source-first 编辑器继续修改；编辑器仍会通过 Core 校验该文件。

## 静态索引

画廊索引位于 `packages/web/public/gallery/index.json`，格式为：

```json
{
  "format": "unicode-art-gallery-index",
  "version": 1,
  "meta": {
    "name": { "zh-CN": "名称", "en-US": "Name" },
    "license": { "expression": "MIT", "origin": "original" },
    "reviewedAt": "YYYY-MM-DD"
  },
  "artworks": []
}
```

每件作品必须具备小写稳定 ID、双语标题和说明、标签、作者、`original` 来源状态、许可证与审核日期。资源只能放在同目录的 `artworks/` 中，且仅允许 `.uadoc.json` 或 `.uafont.json`。浏览器加载前会拒绝越出资源根目录的路径，载入后仍会调用 Core 校验对应文档或字体格式。

## 投稿与添加审核作品

画廊现在接受可审查的候选投稿。建议先提交 Gallery artwork proposal Issue 说明作品类型、来源和许可证；准备好 JSON 资产后，再通过 PR 修改 `packages/web/public/gallery/artworks/` 与 `packages/web/public/gallery/index.json`。

详细步骤、索引示例、许可确认和审核清单见 [静态画廊投稿指南](gallery-submission.md)。维护者审核与回退流程见 [静态画廊审核指南](gallery-review.md)。

新增画廊作品前，请确认：

- 资产为原创，或具备可公开再分发的明确许可与完整归属信息；首版默认只收录原创资产。
- UAF 或语义文档能够通过 Core 校验，且不依赖本机路径、远程 URL 或脚本。
- 索引中的标题、说明、标签与许可信息准确，中文和英文都可读。
- 对照审核指南完成人工预览；上线后如发现来源、许可证或渲染问题，应按回退流程移除索引条目。
- 运行 `npm run gallery:check`、`npm --workspace packages/web test`，必要时运行 `npm --workspace packages/web run test:e2e`。

作品画廊仍然是受控静态画廊，不是开放上传平台。后续的资源发现、作者页和作品页会优先保持静态展示与用户确认边界，相关术语见 [实验性静态资源发现](resource-discovery-experimental.md)。搜索服务、账号系统与内容审核后台会在需要时以独立设计进入后续版本。
