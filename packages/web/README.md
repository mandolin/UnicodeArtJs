# UnicodeArtJs Web

UnicodeArtJs Web 是一个浏览器端字符画工具站，可以把图片或文字转换成 Unicode 字符画，并提供预览、裱框、复制和导出功能。

在线体验：<https://mandolin.github.io/UnicodeArtJs/>

## 功能

- 图片转字符画，支持浏览器可解码的常见图片格式。
- 文字 Banner，支持中文等双宽字符场景。
- 自定义字符集、视觉字体、字素字体、矩阵大小、宽高比、反色和行尾裁剪。
- 裱框、标题、留白和阴影。
- 中英文界面切换，并将语言同步给 Core 的 `locale`。
- TXT、HTML、PNG 导出和剪贴板复制。
- 实验性的艺术字与布局编辑器：使用 canonical JSON 编辑、校验和预览语义文档或 UAF 艺术字字体。
- 编辑器支持本地模板、JSON 导入导出，以及将 UAF 艺术字嵌入语义文档。
- 编辑器可检查用户显式选择的 UAEM 声明式扩展清单，并显示当前 Web 兼容性。
- 静态作品画廊收录项目审核通过的原创 UAF 与语义布局 JSON，可预览、复制、下载或送入编辑器继续修改。
- 开发文档页汇总 Core、CLI、Web 和 VS Code Extension 的公开 API 文档入口、包版本和检查命令。
- 亮色、暗色、高对比度、Solarized Light、Nord 主题。

## 艺术字与布局编辑器

在线页面顶部的“编辑器”用于创建两类 experimental JSON：

- **布局文档**：以 `semantic-document@1` 的 canonical JSON 描述表格、标题、页脚与文本块。
- **UAF 艺术字字体**：以 `unicode-art-font@1` JSON 描述字形，并可即时渲染样本文字，或嵌入布局文档的 `art-font-text` 块。

选择内置示例后可直接校验或渲染。模板只保存在当前浏览器的 `localStorage` 中，不会上传到服务器；需要跨设备保存时，请使用“导出 JSON”。导入文件会先经过 Core 校验，格式无效时不会替换当前编辑内容。

该编辑器是 source-first 工作台：JSON 是唯一的可交换格式。目前不提供拖拽网格、云同步、远程字体或第三方艺术字素材市场。

编辑器中的“扩展清单（开发者）”只读取用户选择的一份 UAEM JSON，并调用 Core 判断
格式、声明能力和 Web 兼容性。浏览器不会因此读取同目录资源，也不会安装或执行扩展代码；
这是有意保留的安全边界。CLI 可以在本地受控目录中完成完整资源预检。格式说明见
../../docs/extension-manifest.md。

## 静态作品画廊

“作品画廊”只读取同源 `public/gallery` 下的审核静态资源。索引会限制资源类型和相对路径，
实际资源仍由 Core 的 UAF 或语义文档校验器解析。画廊不提供上传、账号、远程 URL 或可执行扩展加载。
作品的作者、MIT 许可证、来源状态和审核日期会显示在预览旁；详细格式与添加要求见
[../../docs/gallery.md](../../docs/gallery.md)。

## 开发文档页

“开发文档”读取同源 `public/docs/manifest.json`，展示公开文档入口、包版本、接口面、稳定性和检查命令。该页面只链接仓库中的公开文档，不展示本地生成目录、内部规划资料或一次性调试记录。

更新文档入口数据时，在仓库根目录运行：

```bash
npm run docs:all
```

提交前可运行：

```bash
npm run docs:all:check
```

## 本地运行

在仓库根目录安装依赖后运行：

```bash
npm --workspace packages/web run dev
```

常用命令：

```bash
npm --workspace packages/web run build
npm --workspace packages/web test
npm --workspace packages/web run test:e2e
npm --workspace packages/web run check
```

检查线上 GitHub Pages：

```bash
npm --workspace packages/web run test:pages
```

也可以指定任意部署地址：

```bash
BASE_URL=https://example.com/UnicodeArtJs/ npm --workspace packages/web run test:e2e
```

PowerShell：

```powershell
$env:BASE_URL = 'https://example.com/UnicodeArtJs/'
npm --workspace packages/web run test:e2e
Remove-Item Env:BASE_URL
```

## 二次开发

Web 包使用 Vite 5、Vanilla JavaScript、jQuery 3 和自写 CSS。Core 通过 `unicode-art-js/browser` 入口加载。

页面默认在 GitHub Pages 上优先使用 CDN 版 jQuery；如果 CDN 不可用，`src/main.js` 会动态导入 npm 依赖中的本地 jQuery。二次开发者使用 Vite 打包时，jQuery 会进入正常的 bundler 依赖图。

主要文件：

| 文件 | 说明 |
| --- | --- |
| `index.html` | 页面结构、SEO 元信息和无障碍标记。 |
| `src/main.js` | UI 状态、Core 调用、语言切换、导出逻辑。 |
| `src/styles/main.css` | 主题、布局、响应式和可访问性样式。 |
| `public/docs/manifest.json` | GitHub Pages 开发文档页使用的公开数据快照。 |
| `tests/unit.test.js` | 轻量单元测试。 |
| `tests/e2e-smoke.mjs` | Playwright 冒烟测试，可测本地或远端页面。 |

## 字体

`visualFont` 仅在“文字 Banner”模式影响输入文字被渲染成中间图像时的形状，不会改变字符画预览区的字形。`glyphFont` 同时影响字符模板匹配、预览区、HTML 导出和 PNG 导出的显示；切换后会自动重新生成字符画。为了获得稳定对齐效果，建议使用 Sarasa Mono SC、LXGW WenKai Mono、Source Code Pro、Liberation Mono 等开源等宽或混合等宽字体。

本项目不随网页打包字体文件。字体选项会使用访问者本机浏览器可用的字体；缺失时浏览器会按字体列表回退。若要比较字体差异，请在同一台设备上安装对应字体后重新生成。

“字素宽度规则”是 experimental 配置，提供 Unicode 参考宽度、新宋体、等距更纱黑体 SC、霞鹜文楷等宽和自定义宽字符正则。它会参与裱框、语义布局和输出列数计算；选择“自定义正则”时，正则会覆盖内置规则，填写的是完整的宽字素集合，而非对默认集合的补丁。

“字距”也是保留的配置契约，当前版本不会改变输出；页面会明确标注这一点，避免误以为设置未生效。

Web 工作台与可导入模块的公开边界、浏览器安全限制和字体回退说明见
[Web 集成与数据边界](../../docs/web-integration.md)。其中 `src/main.js` 和 `window.app` 是页面内部实现，
不构成稳定 SDK；`src/gallery-index.js` 才是当前明确可导入的 Web 模块。

## 浏览器基线

当前以 Chrome 120+ 为主要验证基线。Firefox、Safari、Edge 等现代浏览器通常可用，但字体渲染、Canvas 导出和剪贴板权限可能存在浏览器差异。

## 许可证

MIT License。
