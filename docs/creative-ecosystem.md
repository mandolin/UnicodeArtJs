# 创作生态总览

UnicodeArtJs 的创作生态围绕“可验证的数据资产”展开。当前重点不是运行第三方代码，而是让艺术字字体、语义布局文档、扩展资源包和静态画廊使用同一套 Core 校验、许可证说明和宿主边界。

## 当前能力

| 能力 | 格式 | 当前定位 | 主要入口 |
| --- | --- | --- | --- |
| Unicode Art Font | `unicode-art-font@1` | Beta 候选艺术字字体格式 | [UAF 字体作者指南](uaf-authoring.md)、[UAF 与语义布局 Beta 契约](semantic-uaf-beta.md) |
| Semantic Document | `semantic-document@1` | Beta 候选语义布局 JSON AST | [语义布局作者指南](semantic-document-authoring.md)、[UAF 与语义布局 Beta 契约](semantic-uaf-beta.md) |
| UAEM | `unicode-art-extension@1` | 声明式本地资源包清单 | [声明式扩展清单](extension-manifest.md) |
| Static Gallery | `unicode-art-gallery-index@1` | 审核后的同源静态作品索引 | [静态作品画廊](gallery.md) |
| Static Resource Discovery | experimental 静态资源发现 | 展示资源 ID、来源、许可证、hash 和作者 / 作品入口 | [实验性静态资源发现](resource-discovery-experimental.md) |

这些格式共享几条边界：

- 资产必须是 UTF-8 JSON，不依赖本机绝对路径。
- 资源包和画廊不执行脚本、不安装依赖、不自动联网。
- 官方示例和默认画廊优先收录原创、来源明确、许可证清晰的资产。
- Core 负责结构、版本、许可证字段和兼容性校验；宿主负责文件读取、用户确认、缓存和 UI。
- 多宿主侧载和资源读取边界统一见 [宿主侧载与资源读取边界](host-sideload-boundary.md)。
- 资源发现只负责展示和校验线索，不表示自动安装、动态市场或法律审计已经完成。

## 作者路径

1. 先从 [常见使用 Recipes](recipes.md) 了解文本、图片、语义文档和扩展资源包的最短路径。
2. 如果要制作艺术字字体，先阅读 [UAF 字体作者指南](uaf-authoring.md)，再对照 [UAF 与语义布局 Beta 契约](semantic-uaf-beta.md)，并从 `packages/extension-line-banner/assets/line-font.uafont.json` 复制最小结构。
3. 如果要制作布局模板，先阅读 [语义布局作者指南](semantic-document-authoring.md)，优先写 `semantic-document@1` JSON，而不是把受限 DSL 当作长期保存格式。
4. 如果要分发本地资源包，使用 [声明式扩展作者指南](extension-authoring.md) 编写 `unicode-art-extension.json`。
5. 如果要提交默认画廊，先阅读 [静态画廊投稿指南](gallery-submission.md)，确认作品来源、许可证、双语说明和审核材料；维护者审核与回退标准见 [静态画廊审核指南](gallery-review.md)。

## 宿主路径

宿主可以按能力逐步接入，而不需要一次性实现完整编辑器：

- Core：解析 UAF、语义文档和 UAEM，输出结构化错误。
- CLI：适合完整本地资源包预检，因为它能读取清单目录内声明的资源。
- Web：适合单文件预览、画廊展示和用户显式选择的清单检查。
- VS Code Extension：适合把选中文本、模板和后续本地资源包管理接入编辑器工作流。
- Desktop：适合更完整的离线创作工作台、项目文件和可控缓存。

宿主不得把 UAEM v1 当成代码插件系统。若未来需要动态能力、签名、远程分发或市场机制，应使用新格式版本和独立权限模型。

## 稳定性策略

当前创作格式仍处于 experimental / beta 候选区间。进入稳定候选前，需要至少满足：

- 字段、错误码、迁移路径和扩展位清晰。
- Core、CLI、Web 和至少一个编辑器宿主能消费同一份 canonical fixture。
- 官方示例包和静态画廊作品能通过自动检查。
- 许可证、来源、署名和 AI 辅助创作说明可以被人工复核。

修改相关格式、文档或示例后，至少运行：

```bash
npm run creative-ecosystem:check
npm run uaf-authoring:check
npm run semantic-document-authoring:check
npm run semantic-uaf-beta:check
npm run extension-sdk:check
npm run extension-example:check
npm run host-sideload:check
npm run gallery:check
```

进入发布前仍应运行：

```bash
npm run release:gate
```
