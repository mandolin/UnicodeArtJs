# 可选输入格式与 Adapter 策略

UnicodeArtJs 的默认 Core 路径只承诺经过当前供应链审计的图片输入。更多格式可以通过宿主、独立 adapter 或外部转换器接入，但不应把额外 native 依赖静默加入 Core、CLI、Web 或 VS Code 的默认安装内容。

## 默认 Clean 路径

| 运行环境 | 当前默认输入 | 说明 |
| --- | --- | --- |
| Node Core / CLI / VS Code | PNG / JPEG / JPG / WebP / BMP | 通过 `@napi-rs/image@1.14.0` 解码，随后归一化为灰度 `CoreImageData`。 |
| Browser Core / Web | 浏览器可解码的图片对象 | 由浏览器能力和 CORS 决定；不同浏览器是否支持 BMP、AVIF 或 SVG 不作 Core 稳定承诺。 |
| Pure Core | `CoreImageData` | 宿主已经完成解码、方向处理、透明背景和尺寸限制。 |

默认路径不承诺 GIF、SVG、TIFF、PDF、HEIF、AVIF 或视频输入。若用户传入默认后端不支持的格式，Core 应返回 `UNSUPPORTED_FORMAT`，宿主不应把该错误翻译成“转换成功但结果为空”。

## 推荐接入路线

### 1. Pure Host Adapter

宿主已经有自己的 decoder 时，推荐使用 `unicode-art-js/pure`：

```ts
import { imageDataToArt, type CoreImageData } from 'unicode-art-js/pure';

const image: CoreImageData = {
  width: decoded.width,
  height: decoded.height,
  data: grayscaleBytes
};

const result = imageDataToArt(image, config, { charDataMap });
```

宿主负责：

- 限制输入字节数、像素数和动画帧数。
- 处理 EXIF orientation、透明背景、色彩空间和多页格式。
- 把错误映射到自己的宿主错误码，同时保留 Core `UNSUPPORTED_FORMAT` 等机器可读信息。

### 2. Compatible Adapter

如果 adapter 需要 MPL-2.0、LGPL 或系统 runtime，应放在独立 Compatible 项目中维护。它可以依赖 `unicode-art-js`，但不加入主仓 root workspace，也不污染 Core 默认 lockfile。

Compatible adapter 至少需要：

- 独立仓库、版本、lockfile、CI 和发布标签。
- `LICENSE`、`THIRD_PARTY_NOTICES`、SBOM 或等价依赖清单。
- 对 MPL / LGPL 组件的源码获取、修改说明和适用替换/重链说明。
- 最小 fixture，覆盖成功解码、格式拒绝、过大输入、透明背景和错误路径。

官方默认发布物不接受 GPL / AGPL 组件。确实需要这些组件时，应作为清楚标识的独立产品线处理。

### 3. 外部转换器

SVG、TIFF、PDF、HEIF、视频等格式可以先由宿主或用户显式转换为 PNG / WebP，再交给 Core。外部转换器不得作为隐藏依赖打进 Core 默认路径；若应用内提供转换器，也应按 Compatible 档位记录许可证、NOTICE 和产物扫描。

## 格式策略

| 格式 | 当前策略 | 进入默认 Core 的条件 |
| --- | --- | --- |
| PNG | 默认支持 | 已在 `@napi-rs/image` 首批格式内。 |
| JPEG / JPG | 默认支持 | 已在 `@napi-rs/image` 首批格式内。 |
| WebP | 默认支持 | 已在 `@napi-rs/image` 首批格式内。 |
| BMP | 默认支持 | 已在 `@napi-rs/image` 首批格式内；浏览器端仍以浏览器实际能力为准。 |
| GIF | 暂不进入默认路径 | 首帧语义、动画帧忽略提示、decoder 覆盖和许可证审计通过后，可作为 opt-in adapter 或后续默认候选。 |
| SVG | 外部转换器或独立 adapter | 需要脚本、外链、字体、尺寸、滤镜和安全沙盒策略；默认 Core 不直接解析。 |
| TIFF | 外部转换器或独立 adapter | 需要多页、压缩、色彩 profile 和大图内存策略；默认 Core 不直接解析。 |
| PDF | 外部转换器或独立 adapter | 需要页选择、字体与渲染引擎许可证策略；不属于图片默认路径。 |
| HEIF / AVIF / 视频 | 后续评估 | 需要平台 codec、专利/许可证、帧选择和性能策略。 |

## Adapter API 建议

后续官方或社区 adapter 可以围绕一个很窄的 decode 契约设计：

```ts
export interface UnicodeArtImageDecodeOptions {
  alphaBackground?: string;
  maxInputBytes?: number;
  maxInputPixels?: number;
  frame?: number;
}

export interface UnicodeArtImageAdapter {
  readonly id: string;
  readonly supportedFormats: readonly string[];
  decode(input: Uint8Array | ArrayBuffer, options?: UnicodeArtImageDecodeOptions): Promise<CoreImageData>;
}
```

这只是推荐形状，不是当前 stable API。真正进入 Core 前，还需要配套错误码、fixture、文档、许可证审计和跨端测试。

## 发布前检查

修改图片输入格式、adapter、VS Code 图片文件入口或发布依赖时，运行：

```bash
npm run optional-adapters:check
npm run release:gate
```

`optional-adapters:check` 会核对默认格式清单、Core capability、VS Code 暴露入口、公开文档和发布门禁是否一致。它不能替代真实图片回归测试，但可以防止默认 Clean 路径在不知情的情况下扩大供应链边界。
