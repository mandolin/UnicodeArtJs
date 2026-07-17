# 声明式扩展 SDK

UnicodeArtJs 的扩展 SDK 目前指 UAEM v1（UnicodeArtJs Extension Manifest）及其配套的本地侧载规则。它是一个数据包契约，不是运行时代码插件系统。扩展可以声明艺术字字体、语义文档模板等本地资源；宿主可以解析清单、检查兼容性，并在用户明确选择后读取清单目录内的声明资源。

如果你只是想写一个扩展包，请先看[声明式扩展作者指南](extension-authoring.md)。本文面向需要接入宿主、做自动校验或准备官方扩展示例的开发者。

## SDK 边界

UAEM v1 固定为纯声明式 JSON：

- 扩展清单文件名建议为 `unicode-art-extension.json`。
- 支持资源种类为 `unicode-art-font` 与 `semantic-document`。
- 清单只保存相对 POSIX 路径，不保存绝对路径、远程 URL 或安装脚本。
- Core 只负责解析、结构校验、许可证字段语法和宿主兼容性判断。
- 文件读取、真实路径检查、用户信任提示、资源解析和缓存由宿主负责。

UAEM v1 明确不支持 JavaScript、WASM、shell 命令、二进制程序、依赖安装、网络下载、自动更新或后台服务。未来若需要动态能力，应使用新的格式版本和单独权限模型，不会在 v1 中静默扩大能力。

## 宿主能力矩阵

| 宿主 | 当前支持 | 资源读取策略 | 建议用途 |
| --- | --- | --- | --- |
| Core | 解析清单、校验结构、评估兼容性 | 不读取文件 | 所有宿主共享的事实来源 |
| CLI | 本地 `validate` / `inspect` 预检 | 只读取清单根目录内显式声明的资源 | 完整侧载预检、CI 校验、作者自测 |
| Web | 单文件清单检查 | 不自动读取相邻资源 | 浏览器中的兼容性预览和错误提示 |
| VS Code Extension | 使用 Core 契约，侧载资源仍应显式确认 | 后续由扩展宿主设计受控文件访问 | 编辑器内资源包管理 |
| Desktop | 使用 Core 契约，侧载资源仍应显式确认 | 后续由桌面宿主设计受控项目文件和缓存 | 本地创作工作台 |

宿主不能因为清单兼容就自动安装或执行扩展。CLI 的 `extension validate` 和 `extension inspect` 也只做本地预检，不写入全局状态。

## 权限模型

UAEM v1 的权限模型很窄，核心原则是“用户选择的本地目录 + 声明资源白名单”。

1. 用户或调用方显式提供清单文件。
2. 宿主把清单所在目录作为扩展根目录。
3. Core 校验资源路径必须是相对 POSIX 路径，不能包含 `..`、反斜杠、连续斜杠、控制字符或不匹配的资源后缀。
4. 具有文件系统权限的宿主读取资源前，还必须比较扩展根目录与资源文件的真实路径，阻止符号链接逃逸。
5. 宿主只读取 `resources[]` 中声明的文件，不扫描目录、不解析额外入口、不触发远程访问。
6. 宿主应向用户展示资源 ID、资源种类、许可证、来源和兼容性结果。

这套规则允许本地侧载验证，也避免把第三方资源包变成隐式代码执行入口。

## 官方扩展包要求

提交到 UnicodeArtJs 官方示例、画廊或后续官方扩展集合的资源包，需要满足以下条件：

1. `meta.id` 使用反向 DNS 风格，并且不能复用已有官方 ID。
2. `meta.license.expression` 使用宽松许可证表达式；派生或导入资源必须提供 `sourceUrl` 与 `attribution`。
3. `meta.creation` 标明创作方式；AI 辅助或导入资源需要保留可追溯说明。
4. 包内不能包含可执行代码、远程下载入口、压缩包、私密信息或受限再分发资产。
5. 每份资源都能被对应的 Core 解析器或 CLI 子命令单独校验。
6. README 说明用途、兼容 Core 版本、资源来源、授权和本地验证命令。
7. 包内包含可随资源一起复制的 LICENSE；作为模板的官方示例还应包含 TEMPLATE.md。
8. 新资源种类必须先进入公开格式设计，不能直接塞进 UAEM v1 的未知字段。

官方随仓示例 `packages/extension-line-banner` 是当前基线：它包含一份原创 UAF 字体、一份语义文档模板、独立 LICENSE 和可复制模板，用于证明清单、路径、许可证和资源解析可以在不执行第三方代码的情况下完成。

## 本地侧载验证

从仓库根目录运行：

```bash
npm run extension-sdk:check
npm run extension-example:check
```

这些命令会构建 Core，检查公开 SDK 文档、官方示例包、Core 清单解析、CLI 侧载预检、复制后目录校验、Web 只读清单测试入口以及 release gate 文档。它们不会安装扩展，也不会访问网络。

手动查看官方示例：

```bash
node packages/cli/src/console.js extension validate packages/extension-line-banner/unicode-art-extension.json --lang zh-CN
node packages/cli/src/console.js extension inspect packages/extension-line-banner/unicode-art-extension.json --json
```

作者自己的包可把路径替换为本地 `unicode-art-extension.json`。如果资源包包含 UAF 或语义文档，还应继续运行：

```bash
node packages/cli/src/console.js font validate path/to/font.uafont.json --lang zh-CN
node packages/cli/src/console.js document path/to/template.uadoc.json --height 12
```

## 官方扩展试点方向

后续官方扩展会优先保持“数据包”形态，先沉淀稳定资源，再考虑更复杂宿主能力。候选方向包括：

- Unicode 线条与边框资源包：提供表格、边框、分隔符和标题装饰模板。
- ANSI / BBS 风格资源包：提供可移植的字符集、色彩元数据和展示模板。
- 艺术字字体资源包：使用 UAF v1 或后续版本交付类似 figlet 的 Unicode 字体。
- 语义文档模板包：提供海报、标题卡、信息框、画廊卡片等可组合模板。

这些试点不意味着公开扩展市场已经存在。市场、签名、远程分发、权限授权和动态代码能力会作为独立主题设计，并保持与当前 UAEM v1 清晰分离。

## 兼容承诺

UAEM v1 仍属于 experimental / beta 候选能力。当前承诺是：

- v1 清单不会获得动态执行能力。
- 宿主兼容性结果保持机器可读。
- 官方示例包会随 release gate 持续验证。
- 如需破坏性调整，会通过新版本格式、迁移说明和兼容策略处理。

更多字段细节见 [UAEM v1 清单规范](extension-manifest.md)，更完整的作者流程见 [声明式扩展作者指南](extension-authoring.md)。
