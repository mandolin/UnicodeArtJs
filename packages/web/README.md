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
- 亮色、暗色、高对比度、Solarized Light、Nord 主题。

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
| `tests/unit.test.js` | 轻量单元测试。 |
| `tests/e2e-smoke.mjs` | Playwright 冒烟测试，可测本地或远端页面。 |

## 字体

`visualFont` 影响输入文字被渲染成中间图像时的形状；`glyphFont` 影响生成后的字符画在预览区、HTML 导出和 PNG 导出中的显示。为了获得稳定对齐效果，建议使用 Sarasa Mono SC、LXGW WenKai Mono、Source Code Pro、Liberation Mono 等开源等宽或混合等宽字体。

“字素宽度规则”目前作为实验配置入口提供，后续会继续接入更细的字体宽度 profile 和自定义宽字符正则。

## 浏览器基线

当前以 Chrome 120+ 为主要验证基线。Firefox、Safari、Edge 等现代浏览器通常可用，但字体渲染、Canvas 导出和剪贴板权限可能存在浏览器差异。

## 许可证

MIT License。
