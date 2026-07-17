# 静态画廊投稿指南

UnicodeArtJs 静态作品画廊展示可在 GitHub Pages 中直接预览、复制、下载或送入编辑器的审核作品。当前画廊只接受声明式 JSON 资产，不接受脚本、远程 URL、压缩包、图片素材包或未审计第三方字体。

在线画廊：<https://mandolin.github.io/UnicodeArtJs/>

## 可投稿内容

当前优先接受两类内容：

- `semantic-document@1`：语义布局文档，文件扩展名为 `.uadoc.json`。
- `unicode-art-font@1`：UAF 艺术字字体，文件扩展名为 `.uafont.json`。

作品必须是原创，或拥有明确、可核验、允许公开再分发的宽松许可。首轮官方画廊优先收录原创 MIT / CC0 / BSD / Apache-2.0 等宽松许可作品；第三方 FIGlet 字体、图片转制作品、不可确认来源的字符画暂不进入默认画廊。

## 投稿方式

建议先提交 Gallery artwork proposal Issue，确认作品是否适合默认画廊，再发 PR。已经很明确的小修或官方示例补充，也可以直接发 PR。维护者会按 [静态画廊审核指南](gallery-review.md) 复核来源、许可证、预览和回退风险。

PR 需要包含：

- 新增或修改的作品 JSON，位于 `packages/web/public/gallery/artworks/`。
- 更新后的 `packages/web/public/gallery/index.json`。
- 标题、说明、标签、作者、许可证和审核日期。
- 许可来源说明，确认没有复制 GPL/专有/来源不明内容。
- 本地验证结果。

## 文件与索引规则

作品文件名应简短、稳定、全小写，可使用数字、连字符和点号。推荐格式：

```text
packages/web/public/gallery/artworks/my-work.uadoc.json
packages/web/public/gallery/artworks/my-font.uafont.json
```

索引条目示例：

```json
{
  "id": "my-work",
  "kind": "semantic-document",
  "source": "artworks/my-work.uadoc.json",
  "title": {
    "zh-CN": "我的作品",
    "en-US": "My Artwork"
  },
  "description": {
    "zh-CN": "一句清楚描述作品用途或特点的话。",
    "en-US": "A clear sentence describing the artwork."
  },
  "tags": ["layout", "original"],
  "author": "Your Name",
  "license": {
    "expression": "MIT",
    "origin": "original"
  },
  "reviewedAt": "2026-07-16"
}
```

UAF 艺术字字体还需要提供 `sample`，用于画廊预览：

```json
{
  "id": "my-font",
  "kind": "unicode-art-font",
  "source": "artworks/my-font.uafont.json",
  "sample": "UA",
  "title": {
    "zh-CN": "我的艺术字",
    "en-US": "My Art Font"
  },
  "description": {
    "zh-CN": "原创 UAF 字形示例。",
    "en-US": "An original UAF glyph example."
  },
  "tags": ["font", "original"],
  "author": "Your Name",
  "license": {
    "expression": "MIT",
    "origin": "original"
  },
  "reviewedAt": "2026-07-16"
}
```

## 许可确认

投稿前请确认：

- 作品内容是你原创，或你有权按所声明许可证公开再分发。
- 没有复制 GPL、专有字体、商业素材、网站生成结果或来源不明字符画。
- 如果作品参考了公开资料，只参考想法或行为，不复制其源码、字形数据、注释或可版权保护的表达。
- 作品 JSON 不包含本机路径、密钥、账号、远程 URL、脚本或可执行内容。
- UAF 字形和语义文档中嵌入的文字、图案、表格内容也满足同样许可要求。

## 本地验证

提交前在仓库根目录运行：

```bash
npm run gallery:check
npm --workspace packages/web test
```

如果改动影响 Web 页面或画廊交互，再运行：

```bash
npm --workspace packages/web run test:e2e
```

合并前推荐运行：

```bash
npm run release:gate
```

`gallery:check` 会检查：

- 公开投稿文档和模板是否存在。
- 画廊索引是否可解析。
- 每个索引条目指向的作品文件是否存在。
- UAF 与语义文档是否能被 Core 解析。
- 许可证、来源、日期、路径和双语元数据是否符合画廊约束。

## 审核清单

维护者审核 PR 时应确认：

- 作品符合当前画廊范围。
- 文件路径位于 `packages/web/public/gallery/artworks/`。
- 索引 ID、source 和文件名稳定且不重复。
- 中英文标题和说明自然、准确，没有内部开发过程文字。
- 标签数量合理，能帮助筛选。
- 许可证表达清楚，来源状态可信。
- 本地 `gallery:check` 和 Web 测试通过。
- 需要人工预览时，在线或本地页面能正常渲染作品。
- 如果合并后发现来源、许可证或渲染问题，可以按审核指南中的回退流程移除索引条目。

## 不适合默认画廊的内容

以下内容目前不进入默认画廊：

- 需要远程下载或运行脚本的作品。
- 依赖本机私有字体、图片或路径的作品。
- 未经许可的第三方 FIGlet 字体、艺术字字形或图片转制结果。
- 广告、政治宣传、攻击性内容或难以审核来源的内容。
- 需要账号系统、评论系统或服务端存储才能展示的内容。

这些内容可以作为独立扩展、外部站点或 Compatible 应用探索，但不应混入当前 GitHub Pages 静态画廊。
