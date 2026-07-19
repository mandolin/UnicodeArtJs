# 实验性静态资源发现

UnicodeArtJs 正在把 UAF 字体、语义文档、声明式扩展清单和静态画廊资源整理成更容易发现、校验和追溯的资源路径。这个方向当前仍是 experimental：它适合高级用户和宿主开发者试用，但还不是稳定的远程市场、插件安装协议或账号平台。

本页说明公开术语和安全边界。具体 JSON 字段、签名格式和发布流程在稳定前仍可能调整。

## 基本概念

| 术语 | 含义 |
| --- | --- |
| 资源 | 可被 Core 或宿主读取的声明式 JSON，例如 `unicode-art-font@1`、`semantic-document@1` 或 `unicode-art-extension@1`。 |
| 资源发现 | 让用户或宿主看到资源标题、类型、作者、许可证、来源、hash 和下载入口。发现不等于安装。 |
| 静态索引 | 由维护者发布的只读资源列表。索引可以帮助宿主展示资源，但宿主仍应在导入前请求用户确认。 |
| 资源 hash | 对资源文件内容计算的摘要，用于确认“拿到的是同一份文件”。hash 不替代许可证审计、内容审核或安全审计。 |
| 来源说明 | 记录资源是原创、导入、派生还是混合来源，以及是否有 AI 辅助。 |
| 作者页 / 作品页 | 面向用户的静态展示页面，只展示资源信息、来源和链接，不执行资源内容。 |
| 撤回 | 当资源存在许可证、来源、质量或安全问题时，维护者可以标记下架或替换。 |

## 当前可用路径

当前公开可用的是 [静态作品画廊](gallery.md)。画廊随网站发布，资源位于同源 `gallery/artworks/` 下，并通过 Core 校验 UAF 或语义文档格式。

画廊同时发布最小资源清单 `gallery/resource-manifest.json`。该清单记录同源资源的 ID、类型、路径、文件大小、sha256、许可证和审核日期，可用以下命令在本地复核：

```bash
npm run resource-discovery:check
npm run resource-trust:check
npm run web-resource-discovery:check
unicode-art resource validate packages/web/public/gallery/resource-manifest.json
```

这些入口都只读取本地静态文件或同源随站资源：它们会确认清单与 `gallery/index.json` 一致、资源路径没有越出 `artworks/`、文件大小和 sha256 与实际内容一致，并对 UAF / 语义文档做基本结构检查。它们不联网、不下载、不安装，也不执行资源内容。

同目录还包含三个 experimental 信任链 sidecar：

- `resource-lock.json`：锁定 `resource-manifest.json`、撤回列表和每个资源的 size / sha256。
- `resource-revocations.json`：记录当前已知撤回列表；当前为空，表示没有已知撤回。
- `resource-signature.json`：记录签名 envelope。当前公开状态为 `maintainer-signed`，表示 `resource-lock.json` 已由维护者生产签名；能力整体仍是 experimental，签名不替代许可证和来源审计。仓库的 `resource-trust:check` 会同时验证 `unsigned-draft`、signed、invalid、expired 和 revoked 等路径，确保草案状态不会被误判为签名通过，也不会把坏签名误判为可信。

在线工具也提供“资源发现”实验页。该页面只读取本站随同发布的 `gallery/resource-manifest.json`、`gallery/index.json` 和同源 `gallery/artworks/` 资源，展示资源类型、许可证、size、sha256 和浏览器端重新计算的校验结果。页面不会读取任意远程 URL，不会安装资源，也不会执行资源内容。

声明式扩展清单仍是本地资源包机制。作者可以用 [声明式扩展作者指南](extension-authoring.md) 制作本地包，并用 CLI 或宿主工具做预检。它不是脚本插件，也不是自动安装入口。

## 仍在实验中的内容

以下能力仍处于设计与原型阶段：

- 独立的静态资源索引。
- 作者页和作品页的公开数据格式。
- 真实维护者签名私钥流程的长期轮换、撤回和多宿主展示。
- 多宿主对同一份信任链 sidecar 的统一展示。
- CLI、VS Code 和桌面宿主对同一份资源索引的统一展示。

这些能力公开前会继续保持“静态优先、审核优先、用户确认优先”。

## 安全边界

资源发现能力必须遵守以下边界：

- Core 不联网、不访问文件系统、不下载资源、不执行资源内容。
- Web 只读取同源、已审核、随站发布的资源，或读取用户显式选择的本地文件。
- CLI、VS Code 和桌面宿主读取本地资源前必须有明确路径或用户操作。
- 宿主不得因为看到资源索引就自动安装、自动启用或自动更新资源。
- 宿主不得执行索引、清单、字体或语义文档中的脚本、命令、HTML、WASM 或远程代码。
- 任何远程下载、缓存、签名验证或导入动作都应有清楚的用户确认和失败回退。

## 信任与许可证

资源索引只能帮助维护和验证事实来源，不能替代人工判断：

- hash 只能证明文件内容一致，不能证明内容一定安全或许可一定正确。
- `unsigned-draft` 只表示文件可被 hash lock 复核，不表示维护者签名已经启用；`maintainer-signed` 表示维护者发布链验证通过，但仍不替代许可证、来源和内容审核。
- 许可证字段应使用清晰的 SPDX 表达式，但最终仍需要维护者审核来源和归属。
- 原创、导入、派生、混合来源应分开标注。
- AI 辅助创作应明确说明，避免把来源不明素材包装成原创资源。
- 撤回记录应优先于展示记录；被撤回资源不应继续作为推荐资源出现。

## 宿主接入建议

宿主可以分阶段接入静态资源发现：

1. 先展示资源标题、类型、许可证、来源和 hash。
2. 读取资源文件后重新计算 hash。
3. 在 CLI 中可先用 `unicode-art resource inspect <manifest> --json` 读取只读摘要。
4. 在 Web 中可先用“资源发现”实验页查看同源静态清单与浏览器端 hash 复核结果。
5. 调用 Core 校验 UAF、语义文档或 UAEM。
6. 在用户确认后再导入到当前工作区。
7. 缓存时记录来源、hash、Core 版本和导入时间。
8. 发现撤回或校验失败时，不替换用户当前内容。

更完整的宿主读取边界见 [宿主侧载与资源读取边界](host-sideload-boundary.md)。其中的“资源发现导入确认矩阵”定义了
CLI、Web、VS Code Extension、Desktop 和 Compatible 应用在导入确认、缓存目标和失败回退上的共同要求。

## 不属于当前能力的事项

当前 experimental 资源发现不包含：

- 账号系统、自助上传、评论、点赞或私信。
- 当前不提供动态插件市场。
- 当前不提供自动安装、自动更新或后台同步。
- 远程代码执行。
- 对第三方素材的法律审计承诺。
- 对所有浏览器、终端和字体渲染的像素级一致性承诺。

这些方向如果进入开发，会使用单独的设计、权限模型和发布说明。

## 相关文档

- [创作生态总览](creative-ecosystem.md)
- [静态作品画廊](gallery.md)
- [声明式扩展清单](extension-manifest.md)
- [声明式扩展作者指南](extension-authoring.md)
- [宿主侧载与资源读取边界](host-sideload-boundary.md)
- [实验能力稳定性矩阵](experimental-stability.md)
