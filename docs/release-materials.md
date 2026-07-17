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
npm run release:verify:publish
```

只改发布说明、文档入口、版本说明模板或公开链接时，也应至少运行：

```bash
npm run release-materials:check
npm run public-entry:check
npm run docs:all:check
```

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
```

发布后核验：

- 工作流 `Deploy Web to GitHub Pages` 成功。
- 页面入口可访问：<https://mandolin.github.io/UnicodeArtJs/>
- Text Banner 和 Image to Art 至少各执行一次 smoke。
- 视觉字体和字素字体选择在 Chrome / Edge 120+ 中可见并能影响对应行为。
- 文档页能读取公开 manifest，且不暴露内部路径。

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
- `npm view unicode-art-js version` 和 `npm view unicode-art-cli version` 的返回值。
- Marketplace 页面版本、安装 smoke 和命令面板 smoke。
- 是否需要回写 README、package metadata、`docs/quickstart.md`、`docs/migration-guide.md` 或 `docs/known-limitations.md`。
- 如果发现安装、字体、浏览器或原生依赖问题，优先补到公开文档和回归检查，再考虑继续发布。
