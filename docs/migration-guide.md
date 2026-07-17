# 迁移指南

本页面向已经在使用 UnicodeArtJs 的项目。它把版本、宿主、字体、输入格式和实验能力的迁移路径放在一起，帮助你先定位风险，再决定升级、回退或保持当前版本。

## 先判断你属于哪种迁移

| 迁移场景 | 先看什么 | 推荐动作 |
| --- | --- | --- |
| 升级 `unicode-art-js` Core | [生态兼容性与升级说明](ecosystem-compatibility.md) 与本页 Core 清单 | 固定目标版本，干净安装，跑文字、图片、Box 和宽字符 fixtures。 |
| CLI 跟随 Core 升级 | 本页 CLI 清单与 [发布门禁](release-gate.md) | 确认 CLI 依赖范围解析到目标 Core，再跑 `npm run recipes:check` 和 `npm run check:cli`。 |
| Web / Browser Core 升级 | [字体行为与浏览器回退](font-behavior.md) 与 [Web 集成](web-integration.md) | 在 Chrome 120+ 基线复核文字、图片、导出和字体回退提示。 |
| VS Code Extension 升级 | [VS Code Extension 集成](vscode-extension-integration.md) | 复核 VSIX 内 Core 依赖、选区插入、Converter、模板和字体显示。 |
| 桌面宿主升级 | [宿主接入指南](host-integration.md) 与 [桌面宿主基线](desktop-host-baseline.md) | 记录 Core 版本、宿主 runtime、项目文件版本和安装器版本，不静默改写项目文件。 |
| 从 legacy 字段迁移到统一配置 | [配置模型 vNext](config-model-vnext.md) | 新配置写 `visualFont`、`glyphFont`、`outputTarget`、`locale`，旧字段只作为兼容读入。 |

## 当前版本基线

| 入口 | 当前公开基线 | 升级重点 |
| --- | --- | --- |
| Core | `unicode-art-js@1.2.x` | Node 文字渲染为 `@napi-rs/canvas` Skia；图片默认后端为 `@napi-rs/image`。 |
| CLI | `unicode-art-cli@1.0.x` | 发布前确认依赖解析到目标 Core，并复核命令行 JSON、配置文件和输出文件路径。 |
| Browser Core / Web | GitHub Pages 与同仓 Browser Core | 当前以 Chrome 120+ 为主要验证基线；字体和 Canvas 差异不承诺逐像素一致。 |
| VS Code Extension | Marketplace `unicode-art-js-vscode@0.3.x` | VSIX 打包使用已发布 Core 依赖；本地联调不能把 `file:` 依赖带入发布物。 |
| Desktop / Compatible 应用 | 独立仓库与独立锁文件 | 需要单独维护 SBOM、NOTICE、安装器、回退和许可证材料。 |

版本号会继续变化；真正发布前以包的 `package.json`、lockfile、`npm view`、Marketplace 页面和 GitHub Release 为准。

## Core 迁移清单

1. 阅读目标版本的 `getCoreCapabilities()` 输出，确认所用能力是 stable、experimental、reserved 还是 legacy。
2. 新代码优先使用 `visualFont`、`glyphFont`、`outputTarget` 和 `locale`。旧 `font`、`fontStyle`、`fontReduce`、`glyphFontFamily` 等字段继续读入，但不要作为新文档示例。
3. 若你依赖 Node 图片输入，确认默认格式仍是 PNG / JPEG / JPG / WebP / BMP。GIF、SVG、TIFF、PDF 等不属于默认稳定路径。
4. 若你依赖文字 Banner 的精确形状，固定视觉字体、Core 版本、Node 版本和宿主渲染器；Skia、浏览器 Canvas 和其它渲染器可能产生轻微差异。
5. 若你依赖裱框、语义布局或列数，复核 `glyphFont.widthProfile` / `wideCharRegex`。这些规则会影响字素宽度计算，但仍处于 experimental。

## CLI 迁移清单

1. 升级前记录当前 `unicode-art --version`、`npm view unicode-art-cli version` 和解析到的 `unicode-art-js` 版本。
2. 迁移配置文件时，把旧 `font` 理解为视觉字体；字素字体应使用 `glyphFont` 或 `--glyph-font`。
3. PowerShell 中继续用单引号包住 `--box` JSON，例如 `--box '{"style":"round","padding":1}'`。
4. 升级后至少跑一组文字、图片和 document 命令，确认 stdout、`--output`、`--format html` 和错误语言符合预期。
5. 如果要启用 legacy `sharp` 后端，应用或使用者需要自行安装 `sharp` 并承担对应依赖义务；默认路径不再安装它。

## Web 与浏览器迁移清单

1. 以 Chrome 120+ 或 Edge 120+ 作为首要基线，再按需要补测其它浏览器。
2. 视觉字体只影响文字 Banner 的输入图像；字素字体影响预览、模板匹配、HTML/PNG 导出和列宽。切换字素字体后应重新生成。
3. 如果字体在 Brave 中不生效，优先检查字体指纹保护、Shields、浏览器设置和页面字体提示；不要先假设 Core 算法出错。
4. URL 图片读取受 CORS 限制。需要稳定导入时，优先使用本地文件、Blob、ImageBitmap 或宿主 adapter。
5. Browser Core 的取消是协作式；UI 可以防止旧结果覆盖新预览，但不能保证中断已经进入同步计算的阶段。

## VS Code Extension 迁移清单

1. 安装或更新 VSIX 后，如果命令没有出现，先运行 `Developer: Reload Window`。
2. 选中文本右键菜单应能看到默认模板、自定义模板和 Open Converter 入口。
3. Converter 中的 Visual Font 与 Glyph Font 分别影响输入渲染和结果显示，不应合并为一个设置。
4. 若编辑器中字符画变形，先检查 `editor.fontFamily`、字体回退和 VS Code 字体度量优化，再判断是否为生成结果问题。
5. 发布 VSIX 前运行扩展自己的 `npm run check`、`npm run package`、`npm run inspect:vsix`，并按 [VS Code Extension 发布检查](vscode-extension-release-checklist.md) 复核。

## 回退策略

- 回退 Core 或 CLI 时，优先回退到上一个已发布 npm 版本，并用 lockfile 确认真实解析版本。
- 回退 Web 时，优先回退 GitHub Pages 部署记录或对应 commit。
- 回退 VS Code Extension 时，重新安装上一个 VSIX 或 Marketplace 版本，并重载窗口。
- 回退桌面应用时，使用上一个安装器和上一个项目文件备份；新版本读取旧项目时不能静默覆盖原文件。

## 常见误判

| 现象 | 先查哪里 |
| --- | --- |
| 字体下拉变了，但预览没变 | [字体行为与浏览器回退](font-behavior.md) |
| 图片在浏览器能打开，但 Web 页面不能转换 | [可选输入格式与 Adapter 策略](optional-input-adapters.md) |
| Node 和浏览器输出不完全一致 | [已知限制](known-limitations.md) |
| 旧配置里的 `font` 和新 UI 的视觉字体/字素字体对不上 | [配置模型 vNext](config-model-vnext.md) |
| experimental 能力是否能写进长期格式 | [实验能力稳定性矩阵](experimental-stability.md) |
