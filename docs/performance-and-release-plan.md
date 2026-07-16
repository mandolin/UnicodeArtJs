# 性能基线与发布计划

UnicodeArtJs 会同时面向库、命令行、网页、编辑器扩展和桌面宿主。性能和发布检查因此分成两类：可自动保护的契约，以及需要在发布前人工判断的实际体验。

## 当前基线

- 开发和 CI 使用 Node.js 22.x 与 npm 10.x。
- Core 的 Node 文本渲染默认使用 `@napi-rs/canvas@1.0.2`。
- Core 的 Node 图片解码默认使用 `@napi-rs/image@1.14.0`。
- 浏览器能力以 Chrome 120+ 为主要基线，其他现代浏览器按实际反馈逐步补充。
- GitHub Actions 覆盖 Ubuntu、Windows 和 macOS 的 native install smoke；Windows 本机发布前仍建议再做一次手动 smoke。

## 性能检查

Core 当前提供一个稳定输入的 benchmark，用来观察 `batchMatch` 这类核心匹配流程是否出现明显退化：

```bash
npm run benchmark:core
```

也可以直接运行 Core workspace 内的命令：

```bash
npm --workspace packages/core run benchmark
```

该 benchmark 输出 JSON，包括场景、尺寸、耗时和参考目标。耗时会受 CPU、系统负载、Node 版本和原生包实现影响，因此当前不把具体毫秒阈值作为 CI 强制门槛。CI 和 `release:gate` 只检查 benchmark、文档、发布面和版本图是否保持可追踪。

## 发布前门禁

日常发布前建议从仓库根目录运行：

```bash
npm run release:gate
```

`release:gate` 会覆盖 Core、CLI、Web、VS Code Extension、文档、recipes、画廊、宿主基线、可选输入格式、打包 dry-run 和发布事实核验。性能与发布计划本身由以下命令保护：

```bash
npm run performance-release:check
```

远端需要等待 GitHub Actions 的 `CI / Full Check`、三端 `Native Install` 和 `Deploy Web to GitHub Pages` 完成。发布 VS Code 扩展前，还应按 [VS Code Extension 发布检查](vscode-extension-release-checklist.md) 复核 VSIX 内容和 Marketplace 页面。

## 版本决策

| 类型 | 适用场景 |
| --- | --- |
| Patch | bug 修复、文档修正、打包 metadata 修正、非破坏性的 fixture 或检查脚本更新。 |
| Minor | 新公开能力、新稳定配置字段、新默认 adapter 能力，或不破坏兼容性的可见工作流改善。 |
| Major | 破坏 Core API、输出语义、包导出、项目文件或命令行兼容性的变更。 |

## 发布面

- `unicode-art-js`
- `unicode-art-cli`
- GitHub Pages web app
- VS Code Marketplace extension
- Compatible desktop hosts

Core、CLI、Web、VS Code Extension 和 Compatible 桌面宿主可以独立决定是否发版。只改公开文档或检查脚本时，通常不需要 npm 或 Marketplace 发版；只要 GitHub Pages 和公开仓库内容同步即可。

## 已知风险

- 不同操作系统、Canvas 实现、字体栅格器和浏览器安全策略会导致渲染结果存在轻微差异。
- 浏览器高级转换能力仍按现代浏览器优先推进，不承诺旧浏览器像素级一致。
- VSIX 会包含 npm 版 Core 与必要原生包；发布前必须继续扫描 `sharp`、libvips、`node-canvas` 等默认路径禁入项。
- 桌面宿主使用独立仓库维护，安装器、升级、卸载和回退验证不由 Core 仓库的 `release:gate` 取代。

## 发布窗口建议

进入一次正式发布窗口前，至少满足：

- `npm run release:gate` 本地通过。
- `npm run benchmark:core` 已运行并记录结果，无明显异常退化。
- 远端 CI 与 GitHub Pages 部署通过。
- 需要发布的包已切换到发布期依赖策略，并完成 pack 或 VSIX 检查。
- 发布说明能清楚说明运行时依赖、字体行为、已知限制和兼容边界。
