# 开发说明

UnicodeArtJs 的根目录是私有编排包，不发布到 npm。公开包仍位于 `packages/*`，并各自保留独立版本号。

## 环境

- Node.js：仓库开发使用 22.x。
- npm：仓库开发使用 10.x。
- 仓库包含 `mise.toml`，如已安装 mise，建议通过 mise 固定工具版本。

```bash
mise install
mise exec -- npm --version
```

## 安装依赖

当前使用 npm workspaces 和根目录单一 `package-lock.json`。依赖从仓库根目录安装：

```bash
npm run install:packages
```

如需模拟 CI 的干净安装：

```bash
npm run ci:packages
```

## 常用命令

```bash
npm run check
npm run build
npm run test
npm run release:gate
```

也可以只检查某个包：

```bash
npm run check:core
npm run check:cli
npm run check:web
npm run check:vscode
```

`release:gate` 是当前推荐的发布前总入口，会额外执行 Core/CLI pack dry-run、VSIX 隔离打包、VSIX 内容扫描、版本/依赖图检查和共享 fixture 校验。更多说明见 [发布门禁与版本图](release-gate.md)。

## Lockfile 策略

现阶段由根目录维护唯一 `package-lock.json`。旧根原型 lockfile 已归档到 WorkZone，不进入公开仓库状态。

如果后续发现原生 optional dependency、发布打包或跨平台 CI 有不可接受问题，可回退到“私有根编排 + 各包 lockfile”的保守模式。

## 生成文件

不要提交本地生成的 `.vsix`、`.tgz`、调试截图、临时对比输出或一次性测试脚本。如果临时文件有长期价值，应先整理成正式 fixture 或自动化测试。

## CLI API 文档试点

根工作区将 HIA JSDoc 工具作为开发依赖使用，不会进入 Core、CLI、Web 或 VS Code 扩展的运行时依赖。当前已为 CLI 提供可重复的双语 API 文档试点：

```bash
npm run docs:cli
npm run docs:cli:check
```

生成结果位于被 Git 忽略的 `.generated-docs/cli/`，其中包括本地 HTML、双语索引、搜索索引、源码链接元数据和 HIA integration JSON。`docs:cli:check` 会从干净目录重新生成，并检查双语输出、关键 doclet 与 GitHub 源码链接。

Core 与 VS Code Extension 的 TypeScript 文档化仍在适配阶段，因此当前不将编译产物生成的文档作为公开 API 文档发布。开发者可运行下列探针复核当前边界：

```bash
npm run docs:core:probe
```

该探针会记录直接 TypeScript 输入与保留注释的编译 JavaScript 输入的实际结果；它用于工具链评估，不是稳定文档生成入口。

## 改动提示

修改 Core 行为时，需要同时关注 CLI、Web 和 VSCode Extension 是否共享同一契约。Node 图像解码后端单独规划，因为它影响 Core、CLI 和 VSCode，但不直接影响浏览器运行时。
