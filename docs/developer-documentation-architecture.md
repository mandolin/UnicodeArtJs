# 开发者文档站信息架构

UnicodeArtJs 的开发者文档站面向三类读者：想快速使用工具的人、想把 Core 集成进自己项目的人，以及想参与扩展或贡献的人。本页定义公开文档的组织方式，避免文档入口随着功能增加而变得松散。

## 读者路径

| 读者 | 常见问题 | 推荐入口 |
| --- | --- | --- |
| 使用者 | 如何把文字或图片转成字符画？如何导出？ | Quickstart、Recipes、Web、CLI |
| 二次开发者 | 如何调用 Core？如何选择 Node 或浏览器入口？ | API Reference、Integration、Configuration |
| 扩展作者 | 如何写资源包、艺术字或声明式扩展？ | Extension、Gallery、Semantic / UAF |
| 发布维护者 | 发版前要检查什么？版本和许可证边界是什么？ | Release、Compatibility、License |
| 贡献者 | 如何提交问题、示例或作品？ | Contribute、Support、Gallery Submission |

## 文档分区

| 分区 | 用途 | 当前主要页面 |
| --- | --- | --- |
| Quickstart | 最短安装、运行和预览路径。 | `README.md`、`docs/quickstart.md`、`docs/recipes.md` |
| API Reference | Core、CLI、Web、VS Code Extension 的 API 和生成状态。 | `docs/code-documentation.md`、`docs/documentation-pipeline.md` |
| Integration | 宿主、浏览器、Web、VS Code 和 Compatible 应用集成边界。 | `docs/host-integration.md`、`docs/web-integration.md`、`docs/vscode-extension-integration.md` |
| Configuration | 字体、宽字素、语言、输出环境和配置模型。 | `docs/config-model-vnext.md`、`docs/glyph-width-layout.md`、`docs/font-behavior.md` |
| Extension | UAEM、官方扩展、语义布局和 UAF。 | `docs/extension-sdk.md`、`docs/extension-manifest.md`、`docs/semantic-uaf-beta.md` |
| Compatibility | 浏览器、Node、字体、adapter、已知限制和生态边界。 | `docs/known-limitations.md`、`docs/optional-input-adapters.md`、`docs/ecosystem-compatibility.md` |
| Release | 发布门禁、性能基线、VS Code 发布和运行时依赖。 | `docs/release-gate.md`、`docs/performance-and-release-plan.md`、`docs/runtime-sbom.md` |
| Contribute | 反馈、画廊投稿、支持和公开路线。 | `docs/support.md`、`docs/gallery-submission.md`、`docs/roadmap.md` |

## 导航原则

- 首页先回答“能做什么、怎么开始、在哪里试用”。
- API Reference 只承诺公开入口和稳定性，不把中间产物误写成最终 API 站。
- Integration 页面解释宿主边界，避免把 Web、CLI、VS Code 和桌面应用混成一个运行环境。
- Compatibility 页面优先解释风险和限制，而不是把所有边界藏在发布说明里。
- Contribute 页面只放公开可执行流程，不包含内部计划、日志和临时审计过程。

## 数据边界

Web 文档站当前读取 `packages/web/public/docs/manifest.json`。这份 manifest 只包含公开展示字段：包名、版本、接口面、文档类型、稳定性、公开指南链接、检查命令和指标摘要。它不包含本地生成目录、源码正文、内部计划或会话记录。

后续如果公开符号级 API 索引，应继续遵循：

- 不提交完整 `.generated-docs/` 中间产物。
- 不嵌入 TypeScript 源码正文。
- 不暴露本机绝对路径。
- 每个公开入口都能回到仓库文档或 GitHub Pages 页面。

## 检查命令

修改本文、文档站分区、公开文档索引或 Web 文档入口时，运行：

```bash
npm run docs:architecture:check
```

进入发布或合并前，仍建议运行：

```bash
npm run docs:all:check
npm run public-entry:check
```
