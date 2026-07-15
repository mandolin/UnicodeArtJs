# 宿主接入指南

本指南面向桌面应用、网页应用、编辑器扩展和自定义图像 adapter 的开发者。目标是让各宿主复用同一份
UnicodeArtJs Core 行为，同时把文件系统、窗口、平台权限和运行时依赖留在宿主自己的边界内。

## 选择入口

| 场景 | 推荐入口 | 稳定性 | 说明 |
| --- | --- | --- | --- |
| Node.js 命令或服务 | `unicode-art-js` | 稳定 | 使用 Node 文本/图片转换入口。 |
| Chrome 120+、Tauri WebView、Web 页面 | `unicode-art-js/browser` | 高层转换为实验能力 | 不引入 Node、Sharp 或文件系统 API。 |
| 自定义 decoder 或像素管线 | `unicode-art-js/pure` | 稳定 | 宿主负责把输入归一化为 `CoreImageData`。 |

独立应用应使用已经发布的 npm 版本范围；本地联调可临时链接，但不得将本地路径依赖提交到仓库或发布物中。

## 启动时读取能力边界

不要在 UI 中硬编码“哪些选项已经稳定”。在启动时读取 Core 能力快照，并仅把 `stable` 选项作为默认承诺：

```ts
import { getCoreCapabilities } from 'unicode-art-js/browser';

const core = getCoreCapabilities();

console.log(core.version);
console.log(core.stableFeatures.map((feature) => feature.id));
console.log(core.experimentalFeatures.map((feature) => feature.id));
console.log(core.reservedConfig.map((feature) => feature.id));
```

`experimental` 能力可以提供给愿意尝试的用户，但宿主应标明其状态。`reserved` 配置字段已经保留输入形状，
但未必会影响当前输出；不要把它们宣传为已生效的功能。

## Tauri 或浏览器宿主

Tauri 的 renderer 应使用浏览器入口。文件选择、保存、项目恢复等工作由 Tauri 的窄 command/capability API
负责，转换本身仍在 renderer 使用浏览器 Core 完成。不要把 `fs`、任意命令执行或框架对象暴露给 Core。

```ts
import {
  imageToArt,
  OutputFormat,
  PresetCharset
} from 'unicode-art-js/browser';

const controller = new AbortController();

const result = await imageToArt(file, {
  height: 24,
  matrixSize: 6,
  charset: { type: PresetCharset.ASCII },
  outputFormat: OutputFormat.PLAIN_TEXT,
  visualFont: { family: 'Noto Sans SC', reduce: 0 },
  glyphFont: {
    family: 'Sarasa Mono SC, LXGW WenKai Mono, Source Code Pro, monospace'
  },
  outputTarget: 'web',
  locale: 'zh-CN'
}, {
  signal: controller.signal,
  maxInputPixels: 16_000_000,
  maxOutputCells: 300_000,
  progress: ({ stage, progress }) => {
    updateProgress(stage, progress);
  }
});

preview.textContent = result.content;
```

`imageToArt()` 可接收浏览器支持的 `File`、`Blob`、`ImageBitmap`、Canvas 图像和已规范化的图像数据。
远程 URL 仍受浏览器 CORS 规则限制。转换会在阶段边界检查 `AbortSignal`，因此取消是协作式而非强制中断。

## 自定义图像 Adapter

若宿主有自己的 decoder，应使用 `unicode-art-js/pure`，不要把 decoder 专有对象或文件句柄传入 Core：

```ts
import { imageDataToArt, type CoreImageData } from 'unicode-art-js/pure';

const pixels: CoreImageData = {
  width: 320,
  height: 180,
  data: grayscalePixels
};

const result = imageDataToArt(pixels, config, { charDataMap });
```

`CoreImageData.data` 是一维灰度字节数组，长度必须为 `width * height`。RGBA 数据应先由宿主转换；浏览器宿主可直接使用
`browserPlatformAdapter.loadImage()` 取得规范化数据。宿主负责图像解码、方向、透明背景、文件大小限制与权限校验。

## 配置、结果与错误

- 新接入应使用 `visualFont`、`glyphFont`、`outputTarget` 和 `locale` 的分组配置；旧 `font` 等字段仅为兼容别名。
- `glyphFont.widthProfile` 与 `glyphFont.wideCharRegex` 为 experimental 配置，会参与裱框、语义布局和输出列数计算；四向视觉字体纠偏和 `outputTarget` 仍属于 reserved 配置。所有稳定性状态均以 `getCoreCapabilities()` 为准。
- `ArtResult` 提供内容、行列数、耗时与 metadata。保存文件、HTML 包装、复制到剪贴板和项目状态属于宿主责任。
- 捕获 `UnicodeArtError` 时优先读取 `code`、`messageKey`、`messageParams` 和 `locale`，不要依赖人类可读错误文本。

## 版本与发布

每个独立宿主应记录 Core 版本、宿主 runtime 和已知字体/渲染差异，并使用固定 fixture 覆盖文本、图片、Box、
宽字符、错误和取消路径。若应用属于 Compatible 档位，另须遵守
[Compatible 应用与 Adapter 指南](compatible-project-guide.md) 中的 SBOM、NOTICE、产物扫描和许可证材料要求。
