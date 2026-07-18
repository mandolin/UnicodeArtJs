# 实验能力稳定性矩阵

UnicodeArtJs 会把公开能力分为 stable、experimental、reserved 和 legacy。这里进一步说明当前 experimental 能力的稳定化去向，帮助使用者和宿主开发者判断哪些能力可以试用，哪些能力还不适合写入长期兼容承诺。

本页不是发布时间表，也不表示所有 experimental 能力都会进入 stable。真正提升稳定性前，需要同时具备测试覆盖、跨入口一致性、迁移策略和清晰文档。

## 状态含义

| 状态 | 含义 |
| --- | --- |
| Stable 候选 | 当前行为已经较清晰，后续主要补齐测试、文档或公开 schema 后可考虑稳定化。 |
| Beta 候选 | 主路径可用，但仍需要冻结格式、错误模型、fixtures 或跨入口行为。 |
| 继续 experimental | 能力有价值，但边界、默认值或宿主差异仍明显，暂不承诺兼容。 |
| 保留 reserved | 配置入口已保留，但当前不完整影响输出。 |
| 保留 legacy | 继续兼容旧入口或旧后端，但不再推荐为默认路径。 |

## Experimental 能力矩阵

| 能力 ID | 当前范围 | 稳定化去向 | 进入下一状态前需要完成 |
| --- | --- | --- | --- |
| `browser.highLevelConversion` | 浏览器 `textToArt()` / `imageToArt()`，基线为 Chrome 120+。 | Beta 候选 | 固定浏览器输入边界、缓存语义、错误模型和最小跨浏览器 smoke。 |
| `browser.abortSignal` | 浏览器入口的协作式取消。 | 继续 experimental | 明确每个阶段的取消检查点，并增加取消路径 fixtures。 |
| `box.layoutStage` | layout 阶段 `lines` / `cells` / `grid` 裱框。 | Beta 候选 | 冻结布局阶段命名、分隔规则、溢出行为和语义文档组合输出。 |
| `glyph.widthCalculation` | `glyphFont.widthProfile` 与 `wideCharRegex`，影响列数、裱框和布局。 | Beta 候选 | 建立 profile 规则表、字体回退说明、Box/表格/HTML/PNG 导出 fixtures。 |
| `semantic.document` | 版本化语义文档 JSON AST 与受限 DSL。 | Beta 候选 | 已建立 JSON AST v1 主路径 beta 契约与 golden fixture；DSL 保持解析便利层，不作为长期交换格式。 |
| `artFont.document` | UAF v1 JSON 文档、许可证/provenance 校验与字形度量。 | Beta 候选 | 已建立 UAF JSON v1 主路径 beta 契约；继续明确错误码、fallback glyph 和许可证字段约束。 |
| `artFont.render` | UAF 多行艺术字渲染，并可嵌入语义文档。 | Beta 候选 | 已建立 LTR 主路径 fixture；RTL、组合字形和复杂排版仍不承诺。 |
| `extension.manifest` | UAEM v1 声明式扩展清单与兼容性协商。 | Beta 候选 | 已建立 [声明式扩展 SDK](extension-sdk.md)、官方示例包和检查脚本；继续观察宿主接入反馈。 |
| `extension.declarativeResources` | 只声明本地 semantic-document 与 unicode-art-font 资源，不执行代码。 | Beta 候选 | 已明确 CLI、Web、VS Code 和桌面宿主的资源读取与信任边界；动态能力仍需新格式版本。 |

## Web 层公开试点

| 能力 ID | 当前范围 | 稳定化去向 | 进入下一状态前需要完成 |
| --- | --- | --- | --- |
| `web.gallery.staticIndex` | GitHub Pages 静态画廊索引、审核作品和投稿流程。 | Stable 候选 | 冻结索引字段、审核 checklist、作品类型扩展策略和内容政策边界。 |

## 资源发现公开试点

| 能力 ID | 当前范围 | 稳定化去向 | 进入下一状态前需要完成 |
| --- | --- | --- | --- |
| `resource.discovery.staticDraft` | 静态资源发现术语、hash、来源和作者 / 作品页原型。 | 继续 experimental | 公开最小 validator、撤回语义和用户确认边界。 |
| `resource.discovery.hashLock` | 资源文件 sha256 摘要与本地校验思路；当前画廊已有 `resource-manifest.json` 与 `resource-discovery:check`。 | 继续 experimental | CLI / Web 至少一条公开 verify 路径，且文档明确 hash 不替代许可证审计。 |
| `resource.discovery.trustChain` | 维护者签名、keyring 和撤回列表设计。 | 继续 experimental | 完成最小签名 envelope、撤回 fixture、发布后验证和迁移说明。 |

## 创作生态收口快照

UAF、语义文档、UAEM 资源包和静态画廊已经形成同一条作者路径：官方示例、公开指南、canonical fixture、Core / CLI / Web 消费路径和自动检查都能互相印证。这意味着它们适合继续面向高级用户和宿主开发者试用，但仍不等于格式已经进入长期 stable 承诺。

当前不建议只因为文档和门禁完善就提升格式稳定级别。下一次稳定化评审应重点看三类证据：

- 是否已经冻结公开 schema、错误码和迁移策略。
- 是否有更多真实作品或宿主接入反馈覆盖边界情况。
- 是否能在 `creative-ecosystem:check`、`host-sideload:check`、`docs:hia:target:check` 和 `release:gate` 中持续保持同一套事实来源。

## Reserved 与 Legacy 边界

| 能力 ID | 当前范围 | 稳定化去向 | 说明 |
| --- | --- | --- | --- |
| `config.charSpace` | 字符间距配置入口。 | 保留 reserved | 当前不会改变文本渲染或采样结果。 |
| `config.maxParallelTasks` | 并行任务上限配置入口。 | 保留 reserved | 当前没有启用 worker 并行策略。 |
| `config.visualFontDirectionalReduce` | 视觉字体四向纠偏入口。 | 保留 reserved | 当前仅保留配置形状，不影响算法。 |
| `config.outputTarget` | 输出环境入口。 | 保留 reserved | 当前用于宿主协调，不改变采样结果。 |
| `node.imageBackend.sharp` | legacy sharp 图像后端。 | 保留 legacy | 默认不安装，用户需自行安装并显式启用。 |
| `config.font` | 旧视觉字体字段。 | 保留 legacy | 继续归一到 `visualFont.family`。 |
| `config.fontStyle` | 旧视觉字体样式字段。 | 保留 legacy | 继续归一到 `visualFont.style`。 |
| `config.fontReduce` | 旧视觉字体收缩字段。 | 保留 legacy | 继续归一到 `visualFont.reduce`。 |
| `config.glyphFontFamily` | 旧字素字体字段。 | 保留 legacy | 继续归一到 `glyphFont.family`。 |

## 使用建议

- 应用默认流程应优先使用 `getCoreCapabilities().stableFeatures` 中的能力。
- 面向高级用户或开发者的界面可以暴露 Beta 候选能力，但需要标注当前仍属于 experimental。
- reserved 配置可以保存和迁移，但不要向用户承诺它已经影响输出。
- legacy 字段可继续读取旧配置；新文档、示例和 UI 应使用新的分组配置。

相关边界也可参考 [已知限制](known-limitations.md)、[宿主接入指南](host-integration.md)、[UAF 与语义布局 Beta 契约](semantic-uaf-beta.md)、[声明式扩展清单](extension-manifest.md)、[声明式扩展 SDK](extension-sdk.md) 和 [实验性静态资源发现](resource-discovery-experimental.md)。
