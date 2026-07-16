# 生态兼容性与升级说明

UnicodeArtJs 的 Core、命令行、网页、VS Code 插件和桌面应用并不使用同一种分发方式。本页说明它们之间的兼容边界、升级顺序与回退方式，帮助使用者按自己的场景选择合适入口。

## 选择入口

| 需求 | 推荐入口 | 分发档位 |
| --- | --- | --- |
| 在 Node.js 项目中调用转换算法 | `unicode-art-js` | Clean |
| 在终端批量处理文字或图片 | `unicode-art-cli` | Clean |
| 在浏览器中预览和导出 | 在线工具站或 `unicode-art-js/browser` | Clean |
| 在 VS Code 中处理选中文本 | UnicodeArtJs VS Code 插件 | Clean |
| 使用原生窗口、项目文件和本地文件对话框 | UnicodeArt App 桌面应用 | Compatible |

`Clean` 入口遵循主仓库的严格宽松许可证依赖政策。`Compatible` 应用保持独立仓库、独立锁文件和独立发布材料；它们不会改变 Core npm 包的 MIT 许可或默认安装内容。两种档位都可以免费或商业使用，区别在于发布者需要履行的第三方组件义务不同。详细边界见 [Compatible 应用与 Adapter 指南](compatible-project-guide.md)。

桌面宿主的项目文件、错误模型、Core capability 和扩展侧载边界见 [桌面宿主基线](desktop-host-baseline.md)。独立应用应使用 `*.uaproj` v1 或提供显式转换流程，不应静默改写用户项目。

## 当前兼容基线

| 入口 | 已验证或声明的基线 | 稳定性与说明 |
| --- | --- | --- |
| Core | `unicode-art-js@1.2.1`；Node.js 18+，仓库验证使用 Node.js 22 | Node 文字与图片转换、配置、输出、Box 和 i18n 是稳定能力。 |
| Browser Core | `unicode-art-js/browser@1.2.1`；Chrome 120+ | 浏览器高层转换入口仍标为 experimental；不同浏览器和字体的像素渲染可有轻微差异。 |
| CLI | 已发布的 `unicode-art-cli@1.0.2` 使用 `unicode-art-js` 的 `1.2.x` 发布线 | CLI 与 Core 通过共享 fixture 保持输出契约。发布新版 CLI 前应把依赖范围调整为当前 Core 发布线并执行发布门禁。 |
| Web | GitHub Pages 使用同仓 Browser Core | 推荐 Chrome 120+、Edge 120+ 或其他 Chromium 浏览器。字体是否可用由本机系统与浏览器字体策略决定。 |
| VS Code 插件 | VS Code 1.90+；插件发行物声明自己的 Core semver 范围 | 安装页显示的版本是可安装版本；扩展每次发布前必须验证 VSIX 内的 Core 依赖、字体显示和选区插入流程。 |
| UnicodeArt App | 桌面候选线 `0.1.x` 使用 `unicode-art-js@^1.2.1`，锁文件固定当前验证版本 | 属于 Compatible 档位；Windows Beta 发布前仍需完成安装器、NOTICE、SBOM、干净系统安装和卸载验证。 |

Electron UniArt 目前仅保留独立宿主接入契约，没有对外提供安装包；它不属于可安装版本矩阵。

## 兼容规则

1. Core 按语义化版本发布。稳定 API 的破坏性变化只能进入新的主版本；新增能力优先通过 `getCoreCapabilities()` 公开稳定性和运行时边界。
2. 应用必须使用已发布的 Core npm 包作为提交状态，不得把本地 `file:` 或工作目录链接写入公开发布物。
3. 同一条 Core 次版本线内，应用应同时验证文字、图片、Box、宽字符、错误和取消路径。共享 fixture 用于校验 CLI 与 Core 的结果一致性；桌面或 Web 还要验证各自的输入、文件和显示边界。
4. 视觉字体影响输入文字的采样图像，字素字体影响结果显示和模板宽度。浏览器、编辑器或系统未提供指定字体时会回退，不能把回退后的外观当作算法结果差异。
5. Browser Core 的渲染环境与 Node 原生渲染环境不同。除明确的 fixture 契约外，不承诺跨渲染引擎逐像素一致。

## 升级与回退

### 升级 Core

1. 先阅读 Core 的版本说明和 `getCoreCapabilities()` 输出，确认目标运行时支持所需能力。
2. 在应用仓库把 `unicode-art-js` 改为目标 semver 范围，执行干净安装，确认 lockfile 解析到预期版本。
3. 执行应用自身检查，并用共享 fixture 验证关键文字、图片和 Box 输出。
4. 对 Web、VS Code 与桌面应用补做字体回退、文件流程和取消流程检查。

### 回退应用

- Core、CLI、VS Code 插件和网页均应保留上一个已验证版本或部署记录；发现回归时优先回退到该版本，而不是直接修改用户项目文件。
- UnicodeArt App 的首轮 Beta 不执行自动下载更新。应用只会引导使用者前往受控的 GitHub Release 页面获取版本，因此回退以重新安装上一个候选安装包为准。
- 项目文件 `*.uaproj` 采用版本化 JSON。新版本读取旧项目时必须按 [桌面宿主基线](desktop-host-baseline.md) 保留用户意图或给出明确错误；不要静默覆盖用户原始项目。

## 反馈渠道

更完整的路由说明见 [支持与反馈](support.md)，提交前也建议先查看 [已知限制](known-limitations.md)。

- Core、CLI、网页和 VS Code 插件：<https://github.com/mandolin/UnicodeArtJs/issues>
- UnicodeArt App：<https://github.com/mandolin/tauri-uniart/issues>
- Electron UniArt：<https://github.com/mandolin/electron-uniart/issues>

提交问题时请说明使用的包或应用版本、Core 解析版本、操作系统、运行时版本、字体名称，以及可复现的最小输入。请勿附上含有私密内容的项目文件、绝对路径或系统日志。
