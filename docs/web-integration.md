# Web 集成与数据边界

UnicodeArtJs Web 是基于浏览器的字符画工作台，不是一个向页面全局暴露控制器方法的 SDK。二次开发者应优先复用 `unicode-art-js/browser` 的公开入口；只有在维护本工具站本身时，才直接修改 `packages/web/src/main.js`。

## 模块边界

| 范围 | 用途 | 对外状态 |
| --- | --- | --- |
| `unicode-art-js/browser` | 浏览器中的图片、文字、能力查询与进度/取消入口 | Core 公开入口；高层图片/文字转换目前为 experimental。 |
| `packages/web/src/gallery-index.js` | 审核静态画廊索引的解析、双语文本读取与同源资源 URL 校验 | 可独立导入的 Web 模块，提供 HIA JSDoc 文档。 |
| `packages/web/src/main.js` | DOM 绑定、页面状态、导入导出、主题、编辑器和画廊控制器 | 工具站内部实现，不构成稳定 SDK。 |
| `public/gallery/` | 已审核的同源 UAF/语义文档示例 | 静态内容，不是上传或远程扩展分发接口。 |

页面中的 `window.app` 只用于页面启动和本地调试，不是稳定、版本化或受支持的第三方调用面。不要在其它应用中依赖它。

## Core 浏览器接入

新页面或独立应用应直接引入浏览器入口，并自行维护 DOM、文件选择、保存和权限：

```ts
import { imageToArt, OutputFormat, PresetCharset } from 'unicode-art-js/browser';

const controller = new AbortController();
const result = await imageToArt(file, {
  height: 24,
  matrixSize: 6,
  charset: { type: PresetCharset.ASCII },
  outputFormat: OutputFormat.PLAIN_TEXT,
  visualFont: { family: 'Noto Sans SC', reduce: 0 },
  glyphFont: { family: 'Sarasa Mono SC, LXGW WenKai Mono, monospace' },
  outputTarget: 'web',
  locale: 'zh-CN'
}, {
  signal: controller.signal,
  maxInputPixels: 16_000_000,
  maxOutputCells: 300_000
});

preview.textContent = result.content;
```

取消是协作式的。宿主应为用户提供取消按钮，但不能假设 `AbortSignal` 会中断已经完成的同步计算阶段。详细的多宿主选择、纯像素入口和能力查询见[宿主接入指南](host-integration.md)。

## 字体与输出

- **视觉字体**只影响文字 Banner 输入被栅格化为中间图像时的形状。
- **字素字体**影响字符模板匹配、预览、HTML/PNG 导出和最终字符画的显示对齐。
- 页面不打包字体文件。浏览器仅使用访问者本机可用字体，缺失时会按 font-family 回退；不同浏览器或系统的栅格化和回退结果可能不同。
- 官方工具站的字体可用性提示只用于诊断回退风险。Brave 或字体指纹保护可能让检测结果偏保守；需要稳定复现时，建议固定浏览器、系统和字体版本。
- 自建页面可以自行用 `@font-face` 加载有权分发的网络字体，再把对应 family 传入 Core。官方工具站暂不加载用户输入的任意字体 URL。
- `glyphWidthProfile` 与 `wideCharRegex` 目前仍是 experimental 配置。自定义正则描述完整宽字素集合，不是对内置规则的增量补丁。
- `charSpace`、四向视觉字体纠偏和 `outputTarget` 是 reserved 配置入口；在当前能力状态下可能不改变输出。

更多字体回退、Brave 差异和自建站网络字体建议见[字体行为与浏览器回退](font-behavior.md)。宿主在显示设置时应通过 `getCoreCapabilities()` 读取 stable、experimental、reserved 与 legacy 边界，不要把页面中的某个控件存在误说成全部行为已稳定。

## 本地数据与安全边界

- 转换输入、编辑器工作区和本地模板只保存在当前浏览器内存或 `localStorage`；页面不会把它们上传到项目服务器。
- 用户导入的语义文档、UAF 字体和 UAEM 清单必须先交给 Core 校验。无效导入不能替换当前已保存的可用工作区。
- Web 中的 UAEM 检查只读取用户显式选择的清单文本并评估 Web 兼容性；不会读取同目录资源、下载、安装、注册或执行扩展代码。
- 静态画廊只接受同源 `gallery/` 根目录内的审核 JSON。索引解析器会拒绝路径穿越、远程 URL、未知资源类型和未声明字段；展示文本使用 `textContent`，不拼接为 HTML。
- HTML 导出必须对字符画内容转义；浏览器文件、剪贴板和 Canvas 导出仍受对应浏览器的权限和安全策略约束。

## jQuery 与构建

GitHub Pages 页面优先使用 CDN jQuery；加载失败时，`main.js` 动态导入 npm 依赖中的本地 jQuery。通过 Vite 二次开发时，jQuery 会进入正常依赖图。页面代码不得依赖 CDN 一定可用，也不得把 CDN 脚本当成可执行扩展加载机制。

## 静态画廊模块

`gallery-index.js` 的三个导出函数可在浏览器或 Node 测试中使用：

```js
import {
  parseUnicodeArtGalleryIndex,
  getGalleryLocalizedText,
  resolveUnicodeArtGalleryArtworkUrl
} from './src/gallery-index.js';

const index = parseUnicodeArtGalleryIndex(jsonText);
const title = getGalleryLocalizedText(index.artworks[0].title, 'zh-CN');
const sourceUrl = resolveUnicodeArtGalleryArtworkUrl(index.artworks[0].source, pageUrl);
```

该模块仅校验静态索引与同源路径；资源内容仍需交由 Core 的 UAF 或语义文档校验器处理。可生成的 API 文档使用 `npm run docs:web:check` 验证。
