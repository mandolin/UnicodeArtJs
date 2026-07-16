# 依赖、许可证与分发档位

UnicodeArtJs 自有代码采用 [MIT License](../LICENSE)。这使个人、社区和商业团队都可以自由使用、修改、再发布和集成 Core；但最终分发物仍须同时遵守它所包含的每一个第三方组件的许可证。

本项目采用分发档位，而不是要求所有应用和实验使用完全相同的供应链。

| 档位 | 适用范围 | 依赖规则 | 发布要求 |
| --- | --- | --- | --- |
| Clean | Core、CLI、浏览器默认路径、Web 与 VS Code 默认产物 | 仅接受 MIT、Apache-2.0、BSD、ISC、Zlib、Unicode-3.0、OFL、CC0 等宽松许可证 | 固定版本、产物扫描、第三方通知与常规发布检查 |
| Compatible | 独立桌面应用、显式可选的兼容 adapter | 可以逐项接受 MPL-2.0 或 LGPL 组件；GPL/AGPL 不进入官方默认分发物 | 独立仓库/包、SBOM、NOTICE、许可证文本、源码获取说明，以及适用时的替换或重链说明 |
| Experimental | 研究、fork spike、临时验证 | 未经批准的组件不得进入正式发布物 | 不发布、不作为默认依赖、不作稳定承诺 |

Compatible 不是“低标准”或“免审计”档位。它只是在满足许可证义务、对使用者透明告知的前提下，允许采用 Clean 档位不接受的组件。组件的许可证不会改变 UnicodeArtJs 自有代码的 MIT 许可，但会影响包含该组件的具体安装包、应用或 adapter 的 NOTICE 与分发义务。

## 审查范围

引入或升级依赖时，需要分别检查：

- 直接生产依赖和可选依赖。
- 随平台安装的原生二进制及其底层库。
- 会进入 npm、VSIX、Web 或桌面安装包的传递依赖。
- 仅用于构建、测试、签名或发布的开发工具。
- 字体、图片、示例、测试 fixture 和生成资产的内容许可。

包顶层的 `license` 字段不能代替完整审查。原生包、预构建二进制和开发工具可能包含单独的许可证文件或附加使用条件。

## 当前需要持续复核的依赖

### Clean 默认 Node 原生运行时

Core 当前默认使用两个固定版本的 NAPI 原生运行时：

- `@napi-rs/image@1.14.0`：PNG、JPEG、WebP、BMP 的读取与调整。
- `@napi-rs/canvas@1.0.2`：通过 `@napi-rs/canvas/node-canvas` 兼容入口完成
  Node 文本栅格化，底层为 Skia。

两个 npm 主包与当前 Windows 平台包均声明 MIT。Canvas 平台二进制的已知文字
栈包含 Skia（BSD-3-Clause）、FreeType（FTL）、HarfBuzz（MIT-style）和 ICU
数据（Unicode-3.0），因此 Core 和 VSIX 都随包提供第三方通知。

完整的固定版本、证据边界与再审计规则见
[`runtime-sbom.md`](runtime-sbom.md)。这里的结论仅覆盖当前默认路径和已声明
的稳定格式，不替代未来平台包、原生包升级或扩展格式的审计。

更多图片格式不得绕过该边界直接进入默认 Core。GIF、SVG、TIFF、PDF、HEIF 等输入应先按
[`可选输入格式与 Adapter 策略`](optional-input-adapters.md) 选择 Pure Host Adapter、
Compatible Adapter 或外部转换器路线，并在发布物中补齐相应许可证材料。

### sharp 与 libvips

`sharp` 源码采用 Apache-2.0，但 npm 在常见平台上会安装预构建的 sharp/libvips 二进制。例如 Windows x64 包 `@img/sharp-win32-x64` 曾声明为 `Apache-2.0 AND LGPL-3.0-or-later`。

这不等同于认定 UnicodeArtJs 不能使用或分发 sharp，也不应简单描述为许可证“传染”。但它超出了 Clean 档位的严格目标，因此默认发布路径采用以下策略：

- Core 默认 Node 图片后端使用 `@napi-rs/image`。
- `sharp` 不进入 Core 默认 dependencies、CLI 默认安装路径或 VSIX 默认打包路径。
- 如保留 `sharp`，它只能作为 Compatible 档位的显式 adapter；用户需要自行安装并显式启用。
- 发布前继续执行 npm pack、VSIX 内容检查和 `sharp` / `@img/sharp-*` / `libvips` 搜索。

如果未来重新分发 sharp/libvips，需要按 Compatible 档位补齐 NOTICE、可替换性和平台二进制许可证审查，不得沿用当前默认路径结论。

### node-canvas / Cairo

`node-canvas` 是旧 Node 文本渲染路径，底层依赖 Cairo/Pango。即使其 npm 顶层
许可可接受，也不满足 Clean 档位对默认原生链的严格宽松许可证审计要求。

- Core 不再在 `dependencies`、`optionalDependencies` 或 peer dependency 中
  声明 `canvas`。
- 默认文字渲染固定为 `@napi-rs/canvas@1.0.2` 的 Skia 路径。
- 发布门禁会拒绝 `node_modules/canvas`、sharp 与 libvips 进入 lockfile 或 VSIX。

Skia 与 Cairo 的抗锯齿、字距和纵向度量并非逐像素相同；这属于受控的渲染后端
变更。发布回归以功能、边界不裁切、Core/CLI 一致性和固定后端输出为准，而不是
要求与旧 Cairo 文本逐字节一致。

## Compatible 发布物的额外材料

每个 Compatible 档位的版本都必须独立提供：

1. 锁定的依赖树、平台二进制清单和 SPDX/SBOM 报告。
2. 可读的 `THIRD_PARTY_NOTICES`、各许可证文本和版本对应关系。
3. MPL 组件的源码获取位置与修改文件说明。
4. LGPL 组件的来源、动态/静态链接方式、源码获取与适用的替换/重链说明。
5. 安装器、应用目录和更新包的实际产物扫描结果。

上面的项目是发布门槛，不构成法律意见。涉及应用商店、嵌入式设备、静态链接、修改上游 copyleft 文件或跨国商业发行时，应按实际分发方式取得专业法律意见。

## 发布工具

VS Code 官方发布工具 `@vscode/vsce` 本身采用 MIT，但其可选签名组件可能使用 Microsoft 的专用工具许可。此类组件只作为开发/发布工具使用，不应进入扩展运行时或作为项目组件再分发；发布流程仍需记录实际安装和打包边界。

## 参考实现边界

UnicodeArtJs 是 MIT 许可的独立 TypeScript/JavaScript 实现。兼容性工作可以使用公开行为、输入输出和黑盒测试作为依据，但不应复制 GPL 项目的源码、注释或具有表达性的内部实现结构。

对外文档使用“独立实现”“行为兼容测试”等准确表述。涉及参考项目的测试、源码链接和实现注释会持续审查，并逐步改为可独立复现的规范、公式和项目自有测试资产。

## 新依赖检查清单

1. 核对 package metadata、仓库 LICENSE、NOTICE 和第三方通知。
2. 检查生产、可选、平台和传递依赖，不只检查直接依赖。
3. 确认依赖是否会被打包、再分发，或只在本地开发时运行。
4. 记录引入理由、替代方案和许可证结论。
5. 执行 clean install、pack/VSIX 内容检查和许可证扫描。
6. 为依赖选择 Clean、Compatible 或 Experimental 档位；无法明确判断时先标记为待审查，不以猜测代替结论。

许可证审查是工程风险控制，不构成法律意见。对 LGPL、专用工具许可、字体再分发或商业发行有疑问时，应结合实际分发方式进一步确认。
