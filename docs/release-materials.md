# Release Materials

本页提供 UnicodeArtJs 各发布渠道的发布说明模板和发布后核验清单。它补充 [Release Gate and Version Graph](release-gate.md)，侧重“发布时对外怎么写、发布后怎么确认”，不替代测试、打包和人工审查。

## 发布渠道

| 渠道 | 面向对象 | 主要材料 |
| --- | --- | --- |
| GitHub Release | 关注仓库更新、下载 VSIX 或桌面宿主资产的使用者。 | release notes、包级 tag、关联 commit、资产列表。 |
| npm Core | 二次开发者和 CLI / VS Code Extension 的运行时依赖。 | npm 版本说明、运行时依赖、兼容边界、回退方式。 |
| npm CLI | 命令行使用者。 | 安装命令、命令变化、输出格式变化、回退方式。 |
| VS Code Marketplace | VS Code 使用者。 | Marketplace 描述、版本说明、菜单和 Converter 行为变化。 |
| GitHub Pages | Web 工具站使用者。 | 页面入口、浏览器基线、字体行为、导出行为。 |

## 发布说明模板

复制下面模板到 GitHub Release、npm 发布记录、Marketplace 更新说明或站点公告时，应删除不适用的小节。

````markdown
# UnicodeArtJs <channel> <version>

## Summary

一句话说明本次发布解决了什么问题，或面向哪个使用场景。

## Highlights

- 用户能直接感知的改进。
- API、CLI、Web、VS Code 或文档入口的关键变化。
- 性能、兼容性或许可证边界的变化。

## Breaking changes

- 没有破坏性变化时写 “None.”。
- 有破坏性变化时写清迁移路径，并链接 docs/migration-guide.md。

## Upgrade

```bash
npm install unicode-art-js@<version>
npm install -g unicode-art-cli@<version>
```

VS Code 使用者可从 VS Code Marketplace 更新 `UnicodeArtJs` 扩展。

## Compatibility

- Node.js: 22+
- Browser: Chrome / Edge 120+ baseline
- Known limitations: docs/known-limitations.md
- Runtime inventory: docs/runtime-sbom.md

## Verification

- `npm run release:gate`
- `npm run release:verify:publish`
- GitHub Actions CI: <run URL>
- GitHub Pages: https://mandolin.github.io/UnicodeArtJs/
- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=mandolin.unicode-art-js-vscode

## Links

- Migration guide: docs/migration-guide.md
- VS Code release checklist: docs/vscode-extension-release-checklist.md
- Support: docs/support.md
````

## 发版前材料检查

发版前先确认代码和材料同步：

```bash
npm run release:gate
npm run native-components:check
npm run release:verify:publish
```

只改发布说明、文档入口、版本说明模板或公开链接时，也应至少运行：

```bash
npm run release-materials:check
npm run public-entry:check
npm run docs:all:check
```

## Web Studio experimental 变更与候选评估

Web Studio 目前仍是公开可见的 experimental 工作台。页面可以提供 source-first 编辑、CellCanvas、导入导出、资源提案和本地诊断，但这不表示已经发布稳定 Studio、稳定项目格式或全宿主 Beta。

只更新 Web Studio 的说明、迁移提示或站点入口时，发布材料应保持以下事实：

- 当前范围只涵盖 Web；不能外推到 Core、CLI、VS Code、Tauri 或 Electron。
- `studio-project@0` / `.uart-project.json` 是内部项目包络，不能作为长期交换格式或版本兼容承诺。
- 浏览器本地草稿和一次下载请求不等同于用户已确认的文件备份；跨浏览器或清理站点数据前，应先导出并确认所需文件。
- 资源、AI 提案和任何写入仍遵循显式确认与宿主边界；不写成自动安装、自动写文件或 provider direct apply。

如未来准备公开 Beta candidate 文案，先完成实际辅助技术、浏览器缩放/字体、文件保存与恢复等人工观察，并由维护者作出明确准入决定。材料准备、自动 smoke 或单一浏览器通过本身都不是 Beta candidate 声明。

候选评估前的材料清单：

1. 当前版本的 Web 自动 gate、构建和公开文档检查已通过。
2. 人工观察记录已脱敏，明确列出 pass、fail 或 blocked；缺失的观察不能写成通过。
3. 已确认 source model、内部项目包络、资源/AI review-only 和 host-owned write 边界没有被改变。
4. 迁移说明清楚说明 source JSON、导出投影、内部项目包络和浏览器本地草稿的不同用途。
5. 对外文案仍写 Web Studio experimental，直到有针对 Web 的明确候选决定；不发布 npm 包、VSIX、GitHub Release 或稳定格式声明。

## 渠道入口一致性

在发布或只改公开入口的合并前，按以下顺序核对各渠道。仓库内的 README、包 metadata 和发布材料可以随提交更新；npm、Marketplace、GitHub About 与 Pages 的实时状态必须在发布后重新读取，不能由本地检查代替。

1. **GitHub 仓库与 About**：确认 About 描述准确概括“文本和图片转 Unicode art”的 Core、CLI、Web 与 VS Code 入口；主页应为 <https://mandolin.github.io/UnicodeArtJs/>，并保留仓库、Issues、Quickstart、Recipes 和发布材料的可访问链接。
2. **npm Core / CLI**：同时复核版本、许可证、主页、仓库和问题追踪地址。Core 与 CLI 都应指向本公开仓库；如果已发布版本缺少较新的 metadata，先在下一次包发布中带上已修正的 package metadata，不要为文档改动单独伪造版本。
3. **VS Code Marketplace**：确认显示名、简短描述和 README 一致使用 `VS Code` 产品名；Marketplace 版本应与 VSIX 的 `package.json` 版本对应。
4. **GitHub Pages**：确认主页返回成功，公开文档 manifest 可读取，并且页面的文档入口、版本和 API Reference 投影来自同一次提交。

可使用以下只读命令收集 npm metadata：

```bash
npm view unicode-art-js version license homepage repository bugs --json --registry=https://registry.npmjs.org/
npm view unicode-art-cli version license homepage repository bugs --json --registry=https://registry.npmjs.org/
```

涉及仓库设置的 About 文本、Homepage 或 topics 时，只有具备仓库设置权限的维护者可以更新；应在对应发布记录中保留变更后的页面 URL 与复核时间。

## npm Core

发布 `unicode-art-js` 前：

```bash
cd packages/core
npm pack --dry-run
npm publish --access public --registry=https://registry.npmjs.org/
npm view unicode-art-js version --registry=https://registry.npmjs.org/
```

发布后核验：

- `npm view unicode-art-js version` 返回新版本。
- `npm view unicode-art-js license dependencies` 不出现禁止进入运行时的许可证边界。
- `npm view unicode-art-js version license homepage repository bugs --json` 中的主页、仓库和问题追踪地址指向当前公开入口。
- 在临时目录安装 `unicode-art-js@<version>`，执行最小 `textToArt` 和 `imageToArt` smoke。
- 为该版本创建或确认包级 tag，例如 `core-v1.2.1`。

## npm CLI

CLI 平时可使用本地 Core 依赖；发布前必须切换为 npm Core 版本，并通过严格发布校验。

```bash
cd packages/cli
npm run core:dep:npm
cd ../..
npm run release:verify:publish
cd packages/cli
npm pack --dry-run
npm publish --access public --registry=https://registry.npmjs.org/
npm view unicode-art-cli version --registry=https://registry.npmjs.org/
npm run core:dep:local
cd ../..
npm install
```

发布后核验：

- `npm view unicode-art-cli version` 返回新版本。
- 在临时目录通过 `npx unicode-art-cli@<version> text "UnicodeArtJs"` 执行 smoke。
- 复核 CLI README、帮助输出和 `docs/quickstart.md` 的安装命令仍一致。
- `npm view unicode-art-cli version license homepage repository bugs --json` 中的主页、仓库和问题追踪地址指向当前公开入口。
- 为该版本创建或确认包级 tag，例如 `cli-v1.0.2`。

## VS Code Marketplace

VS Code Extension 默认使用 npm Core 依赖，发布前按 [VS Code Extension Release Checklist](vscode-extension-release-checklist.md) 复核 VSIX 内容。

```bash
cd packages/vscode-extension
npm run package
npm run inspect:vsix
vsce publish --packagePath ".\\unicode-art-js-vscode-<version>.vsix"
```

发布后核验：

- Marketplace 页面可访问：<https://marketplace.visualstudio.com/items?itemName=mandolin.unicode-art-js-vscode>
- Marketplace 的显示名和简短描述使用 `VS Code` 产品名，并与 extension README 保持一致。
- 在干净 VS Code profile 安装或更新扩展。
- 右键菜单、命令面板、Converter、模板保存和插入动作能正常执行。
- 为该版本创建或确认包级 tag，例如 `vscode-v0.3.0`。

## GitHub Pages

Web 工具站由 `Deploy Web to GitHub Pages` 工作流发布。发布前确认：

```bash
npm run docs:all:check
npm run check:web
npm run build:web
npm run test:web:e2e
npm run resource-discovery:check
npm run resource-trust:check
npm run web-resource-discovery:check
```

发布后核验：

- 工作流 `Deploy Web to GitHub Pages` 成功。
- 工作流步骤 `Wait for deployed resource discovery files` 成功，确认 Pages 上的 `resource-manifest.json`、`resource-lock.json`、`resource-revocations.json`、`resource-signature.json` 和随站资源字节已完成传播。
- 页面入口可访问：<https://mandolin.github.io/UnicodeArtJs/>
- Text Banner 和 Image to Art 至少各执行一次 smoke。
- 视觉字体和字素字体选择在 Chrome / Edge 120+ 中可见并能影响对应行为。
- “资源发现”实验页能展示同源资源、size、sha256、`maintainer-signed` 或 `unsigned-draft` 信任状态和不自动安装边界。
- 文档页能读取公开 manifest，且不暴露内部路径。

## Creative Ecosystem / Docs-only Update

如果一次更新只涉及 UAF、语义文档、UAEM、静态画廊、HIA 文档化门禁或公开文档站信息，不一定需要同步发布 npm Core、CLI 或 VS Code Marketplace 新版本。发版判断应以用户是否需要安装新包获得能力为准。

这类更新至少核验：

```bash
npm run docs:all:check
npm run creative-ecosystem:check
npm run resource-discovery:check
npm run resource-trust:check
npm run web-resource-discovery:check
npm run host-sideload:check
npm run docs:public-site:check
npm run release-materials:check
npm run native-components:check
npm run docs:hia:target:check
npm run release:gate
```

发布后确认 GitHub Pages 与 CI 成功，并在 release notes 中明确 “No runtime package bump” 或列出实际发布的包级 tag。
如果更新涉及 `resource-lock.json`、`resource-revocations.json` 或 `resource-signature.json`，release notes 应说明当前信任状态，例如 `maintainer-signed` 或 `unsigned-draft`，并提示发现不等于安装、签名不替代许可证和来源审计。
如果更新包含资源撤回，release notes 应列出被撤回资源的 `resourceId`、原因、`revokedAt`、可选 `replacedBy`、对缓存资源的影响，以及宿主应如何提示用户不要继续导入或推荐该资源。

## GitHub Release

GitHub Release 用于汇总跨渠道发布结果。建议使用包级 tag：

- `core-v<version>`
- `cli-v<version>`
- `vscode-v<version>`

如果一次发布覆盖多个包，可在 release notes 中列出所有 tag、npm 版本、Marketplace 版本和 GitHub Pages 部署 run。

## post-release 核验

每次发布收尾时记录：

- 本地 `npm run release:gate` 是否通过。
- 远端 CI 和 GitHub Pages run 是否通过。
- 资源发现信任链是否通过 `resource-trust:check`，Pages 资源等待步骤是否成功。
- `npm view unicode-art-js version` 和 `npm view unicode-art-cli version` 的返回值。
- Marketplace 页面版本、安装 smoke 和命令面板 smoke。
- 是否需要回写 README、package metadata、`docs/quickstart.md`、`docs/migration-guide.md` 或 `docs/known-limitations.md`。
- 如果发现安装、字体、浏览器或原生依赖问题，优先补到公开文档和回归检查，再考虑继续发布。
