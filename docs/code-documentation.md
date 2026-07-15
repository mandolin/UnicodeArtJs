# 代码注释与 API 文档约定

本约定面向 UnicodeArtJs 的贡献者和二次开发者。它用于保持 Core、CLI、Web 和 VS Code Extension 的公共契约可读、可追溯，并避免把内部计划、AI 会话记录或实现细枝末节误写成对外承诺。

## 适用范围

以下改动必须同步补充或复核注释：

- 公开导出的函数、类型、枚举、配置字段、错误码和协议字段。
- 影响跨端行为的配置归一化、默认值、兼容别名和稳定性状态。
- 采样、匹配、字体度量、宽字素计算、语义布局、安全校验等非显然逻辑。
- Node、浏览器、VS Code 或独立应用之间存在行为差异的 adapter 和宿主边界。

显而易见的局部赋值、单行判断和私有实现细节不应为了增加注释数量而重复解释。

## 术语表

| 中文术语 | 英文术语 | 约定含义 |
| --- | --- | --- |
| 字符画 | Unicode art / character art | 由文本字符构成的最终输出，不等同于位图像素画。 |
| 字素 | glyph cell | 字符画中的一个输出字符单元，用于区分输入图像的像素和普通输入文本字符。 |
| 字素字体 | glyph font | 字符画输出在终端、网页、编辑器等环境中实际使用的显示字体；会影响字素模板、宽度计算、预览与导出。 |
| 视觉字体 | visual font | 仅在文字 Banner 等文字转图像路径中，将输入文字栅格化为中间图像时使用的字体。 |
| 宽字素 | wide glyph | 在目标显示环境中按两个普通字素列宽计算的字素；其判定由 width profile 或完整自定义正则控制。 |
| 字素宽度规则 | glyph width profile | 针对目标字素字体的宽度判定配置；会影响裱框、语义布局和输出列数。 |
| 裱框 | box frame | 围绕输出、行、单元格或网格施加的文字框体与间距布局。 |
| 语义文档 | semantic document | `semantic-document@1` 的版本化 JSON/DSL 内容模型，不是任意 HTML 或脚本执行载体。 |
| Unicode 艺术字字体 | Unicode Art Font (UAF) | `unicode-art-font@1` 的版本化字形数据格式，不等同于操作系统字体文件。 |
| adapter | adapter | 为 Node、浏览器或宿主环境提供输入、画布、解码、输出等平台能力的边界层。 |

配置、README、CLI 帮助、Web UI 和 VS Code 文案出现这些概念时，应优先采用表中的中文和英文。旧字段名如 `font` 只能在说明兼容迁移时出现，并必须指明其对应的现代字段。

## 双语 JSDoc 约定

面向公共 API 的 JSDoc 以中文为默认描述，同时提供英文版本。当前 JavaScript 文档生成使用 HIA JSDoc 的 `@lang` 与内联 `<lang>` 语法：

```js
/**
 * 将输入文本转换为字符画。
 *
 * @lang zh-CN 将输入文本转换为字符画；当配置启用裱框时，结果会包含相应的框体布局。
 * @lang en Converts input text to Unicode art; when the configuration enables a box frame, the result includes the corresponding frame layout.
 *
 * @param {string} text - <lang key="core.textToArt.param.text"><zh-CN>要转换的原始文本。</zh-CN><en>Raw text to convert.</en></lang>
 * @param {ArtConfig} config - <lang key="core.textToArt.param.config"><zh-CN>已归一化或可归一化的生成配置。</zh-CN><en>Generation configuration, normalized or ready to normalize.</en></lang>
 * @returns {Promise<ArtResult>} <lang key="core.textToArt.returns"><zh-CN>包含文本、尺寸和元数据的转换结果。</zh-CN><en>Conversion result containing text, dimensions, and metadata.</en></lang>
 * @throws {UnicodeArtError} <lang key="core.textToArt.throws"><zh-CN>当输入或配置无法通过公开校验时抛出。</zh-CN><en>Thrown when input or configuration fails public validation.</en></lang>
 * @example
 * const result = await textToArt('UnicodeArtJs', { height: 12 });
 */
```

- `@lang zh-CN` 与 `@lang en` 必须成对出现，且描述同一行为，不得一边承诺功能而另一边遗漏限制。
- 参数、返回值和公开错误说明使用 `<lang key="..."><zh-CN>...</zh-CN><en>...</en></lang>`。key 使用小写命名空间，例如 `core.textToArt.param.text`、`cli.parseBox.returns`。
- JSDoc 类型必须是当前工具可解析的写法。对象返回值使用 `{{height: number, width: number}}`，不要写成 `{ height: number, width: number }`。
- JavaScript 以 HIA JSDoc 为当前生成入口。Core 的 TypeScript 使用 `@hia-doc/tsdoc-runner@0.1.2` 生成可校验的中间文档数据；它尚不是对外部署的 API 文档站，最终站点聚合由后续文档阶段负责。

## Core TSDoc 中间文档

Core 的 TypeScript 文档配置位于仓库根目录 `tsdoc.core.json`，当前覆盖 40 个输入文件，包括 Node、纯数据、浏览器三个入口，以及图像数据转换、配置、输出与错误、能力查询、字素宽度、裱框、语义文档、艺术字字体、扩展清单和平台 adapter 等主要公开导出图。

```bash
npm run docs:tsdoc:core
npm run docs:tsdoc:core:check
```

生成文件位于被 Git 忽略的 `.generated-docs/tsdoc/core/`。`docs:tsdoc:core:check` 会检查：

1. 固定的 40 个输入均生成六类 HIA 中间 artifact。
2. TSDoc 提取结果没有 warning 或 error，且已识别的导出符号都有说明。
3. 关键公开符号没有因工具链回归而从提取结果中消失。
4. 普通和文档 source map 不嵌入 TypeScript 源文本。

纯再导出入口、常量-only 文件和导出常量对象 adapter 在当前提取器中可能不会产生独立符号；这些例外在校验脚本中被逐项显式声明，不能无意扩展到其他模块。

## VS Code Extension TSDoc 中间文档

VS Code Extension 的 TypeScript 文档配置位于仓库根目录 `tsdoc.vscode-extension.json`，当前覆盖 16 个输入文件，包括 Extension 生命周期、命令注册、选区/图片转换、配置解析、模板存储、Core adapter、输出写入、WebView 协议、WebView 消息处理、HTML/CSP、i18n、状态栏和日志器。

```bash
npm run docs:tsdoc:vscode
npm run docs:tsdoc:vscode:check
```

生成文件位于被 Git 忽略的 `.generated-docs/tsdoc/vscode-extension/`。`docs:tsdoc:vscode:check` 会检查：

1. 固定的 16 个输入均生成六类 HIA 中间 artifact。
2. TSDoc 提取结果没有 warning 或 error，且已识别的导出符号都有说明。
3. 关键命令、协议、配置和宿主边界符号没有因工具链回归而消失。
4. 普通和文档 source map 不嵌入 TypeScript 源文本。

修改 VS Code 命令、WebView 协议、配置解析或安全边界时，应同步更新对应注释和 [VS Code Extension 集成与数据边界](vscode-extension-integration.md)。

## 稳定性、兼容性与可见性

公共说明必须如实表达稳定性，不得因示例存在就暗示长期稳定。

- **stable**：已纳入当前公开契约；修改需要考虑跨端兼容、迁移说明和回归测试。
- **experimental**：可以试用，但字段语义、默认值或边界可能变化；说明中必须点出已知限制。
- **reserved**：配置入口已经保留，但当前可能不改变生成结果；必须明确“当前不生效”的范围。
- **legacy**：仅为兼容旧调用保留；说明必须给出迁移到的新字段或入口。
- **deprecated**：使用标准 `@deprecated`，写明替代方案和计划移除前提；不要只写“已废弃”。

Core 的能力状态以 `getCoreCapabilities()` 返回的事实为准。README、CLI 帮助和宿主 UI 不应各自创造不同的稳定性结论。

## 示例与源码追溯

- 每个稳定公共入口至少应有一个最小、可独立理解的示例；涉及安全、格式或平台差异时，示例应同时展示限制或错误处理路径。
- 示例不得依赖本机私有路径、未公开字体文件、密钥、网络下载或未提交 fixture。
- 公共文档站发布时，源码链接必须固定到发布 tag 或确定 commit；本地开发试点可以链接 `main`，但不能把它当成版本化文档证据。
- 文档只描述公开 API、配置、格式、兼容性与安全边界。不得扫描或链接 WorkZone、AI 日志、内部审计或本地生成目录。

## 复核清单

提交前至少检查：

1. 术语是否符合本页，尤其区分视觉字体、字素字体、字素与像素。
2. 中英文描述是否表达相同的输入、输出、默认值、限制和错误边界。
3. 配置是否标明 stable、experimental、reserved、legacy 或 deprecated 中的实际状态。
4. 示例是否能在当前公开依赖和已提交 fixture 下运行或被测试覆盖。
5. 变更是否同步更新了对应的 README、CLI 帮助、Web/VS Code 文案或能力查询结果。
6. 运行 `npm run docs:contract:check`；修改 Core 公开 TypeScript 契约时，再运行 `npm run docs:tsdoc:core:check`；修改 VS Code Extension 宿主边界时，再运行 `npm run docs:tsdoc:vscode:check`；涉及 CLI 文档试点时，再运行 `npm run docs:cli:check`。

该检查只覆盖当前冻结的最低契约，不能替代对算法、翻译和跨平台表现的人工审查。
