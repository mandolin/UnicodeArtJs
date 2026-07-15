# UnicodeArtJs Roadmap

UnicodeArtJs 的目标是围绕同一套核心转换能力，提供 JavaScript/TypeScript 库、命令行工具、在线应用、编辑器扩展和桌面客户端。

本页只记录对使用者和贡献者有长期价值的公开方向，不承诺固定日期，也不展示内部开发阶段和过程记录。

## 已提供的项目

- `unicode-art-js`: 支持 Node.js 与现代浏览器的 Core 库。
- `unicode-art-cli`: 文本、图片和 Box 裱框的命令行工具。
- [在线工具](https://mandolin.github.io/UnicodeArtJs/): 可在浏览器中生成、预览和导出字符画。
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=mandolin.unicode-art-js-vscode): 支持选中文本转换、模板和 Converter 面板。

## 近期方向

### 稳定现有工具链

- 统一 Core、CLI、Web 和 VS Code Extension 的稳定配置语义。
- 完善中英文界面、错误信息和迁移兼容。
- 建立统一测试、持续集成、版本与发布后验证流程。
- 整理依赖许可、字体策略、开发者文档和公共 API 说明。
- 改善浏览器、终端和编辑器中的宽字符与字体差异说明。

### 桌面客户端

桌面客户端采用独立仓库与独立发布材料维护，不并入 Core/CLI/Web/VS Code 的默认依赖链。当前候选显示名为 `UnicodeArt App · 字素绘`，优先验证 Windows 版项目文件、导入导出、安装器、第三方通知和回退流程。

桌面项目会继续复用 `unicode-art-js` 的公开 npm 包和宿主接入契约。Tauri 与 Electron 方向都保留独立仓库，以便按各自运行时和许可证义务处理打包、更新和平台差异。

### 创作能力

- 语义化的行、单元格、标题、页脚、跨行跨列和原字输出。
- 类 FIGlet 的 Unicode 艺术字库、开放字体格式和编辑工具。
- Box、表格、艺术字与普通字符画的组合排版。
- [静态作品画廊](gallery.md)：收录许可与来源明确的原创 UAF 和语义布局示例；后续再依据实际需求评估开放投稿或动态服务。

### 开发者文档

项目将逐步为公共 API、配置、协议和核心算法补充准确的中英双语注释，并计划使用 HIA Documentation Sys 的 JSDoc 工具链生成可浏览、可版本化的开发者文档。

## 长期探索

动态画廊、用户系统、云存储、视频字符动画、移动端和在线 API 都属于候选方向。它们会在真实需求、维护成本、内容审核和许可边界得到验证后再决定是否进入开发。

## 兼容性原则

- 浏览器实现当前以 Chrome 120+ 为基线，其他现代浏览器会逐步验证。
- 项目不打包或重新分发字体文件；示例和默认字体优先使用许可清晰的开源字体。
- 不以跨操作系统、Canvas 实现和字体栅格器的像素级完全一致为硬性目标，但配置语义与输出规则应保持可解释。
- 新依赖和平台二进制需要单独审查许可证与再分发条件。

欢迎通过 [GitHub Issues](https://github.com/mandolin/UnicodeArtJs/issues) 报告问题或提出具体使用场景。
