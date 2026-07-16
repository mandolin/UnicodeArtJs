# 已知限制

本页记录 UnicodeArtJs 当前公开能力中容易被误判为 Bug 的边界。这里的限制不代表永远不会支持，只表示当前版本不应把它们当作稳定承诺。

## 字体与显示

- Web 工具站不会打包或重新分发字体文件。视觉字体和字素字体都依赖使用者本机已安装字体，以及浏览器是否允许站点访问这些字体。
- 视觉字体只影响文字 Banner 的采样图像；字素字体影响预览、导出、裱框宽度和字符模板匹配。修改字素字体后通常需要重新生成。
- Brave 或启用字体指纹保护的浏览器可能限制字体检测和回退行为；同一设置在 Chrome 或 Edge 中正常，不代表 Brave 一定能显示同样字体。
- 终端、网页、编辑器和图片导出使用的字体或渲染器不同，同一段字符画可能出现宽度、基线或边角贴合差异。
- `glyphFont.widthProfile` 和 `glyphFont.wideCharRegex` 仍属于 experimental。自定义 `wideCharRegex` 是完整宽字素集合，不是对内置规则的增量补丁。

更多字体说明见 [字体行为与浏览器回退](font-behavior.md)。

## 浏览器入口

- `unicode-art-js/browser` 的高层图片和文字转换入口可用，但仍标为 experimental；当前基线是 Chrome 120+。
- 浏览器端图片 URL 读取受 CORS 限制。即使图片在地址栏能打开，也不一定能被页面脚本读取。
- 浏览器取消使用 `AbortSignal` 协作检查，不能保证中断已经进入同步计算的阶段。
- 浏览器 Canvas、Node Skia 和其它宿主渲染器不承诺逐像素完全一致。需要严格回归时，应固定浏览器、版本、字体和配置。

## Node 图片与文字后端

- Core 默认 Node 图片后端是 `napi-rs`，稳定目标格式为 PNG / JPEG / WebP / BMP。
- GIF 首帧、SVG、TIFF、AVIF、HEIC 等格式不属于默认稳定图片契约。需要这些格式时，建议先在宿主中转换为 PNG 或使用显式可选 adapter。
- Core 默认 Node 文字渲染是 `@napi-rs/canvas` 的 Skia 路径，不再默认使用 node-canvas/Cairo。更换渲染器可能改变抗锯齿、字体度量和结果字符分布。
- `sharp` 是 legacy opt-in 后端。它不会随 Core 默认路径安装；如果应用显式需要，应自行安装并承担对应依赖与许可证义务。

## 实验能力

以下能力可以试用，但字段语义、默认值或渲染细节仍可能调整：

- Browser 高层转换、缓存生命周期、进度与取消。
- 语义文档布局、表格、表头/页脚、跨行跨列和原字输出。
- Unicode Art Font (UAF) 文档、渲染和与语义布局组合。
- UAEM 声明式扩展清单。
- layout-stage Box 模式，例如 `lines`、`cells` 和 `grid`。
- glyph width profile 与自定义宽字素正则。

宿主界面应优先通过 `getCoreCapabilities()` 读取稳定性边界，不要把 experimental 控件展示成稳定承诺。

## 桌面应用

UnicodeArt App、Electron UniArt 等桌面项目使用独立仓库、独立锁文件和独立发布材料。它们可以复用 `unicode-art-js`，但安装器、窗口、项目文件、系统权限、更新和卸载问题应在对应桌面仓库跟踪。

相关说明见 [生态兼容性与升级说明](ecosystem-compatibility.md) 和 [Compatible 应用与 Adapter 指南](compatible-project-guide.md)。

## 画廊与示例

- 静态作品画廊只收录来源、许可证和结构明确的原创或可授权示例。
- 画廊不运行脚本、不加载远程作品资源、不包含私有路径，也不托管第三方字体文件。
- 投稿前请先阅读 [静态画廊投稿指南](gallery-submission.md)。
