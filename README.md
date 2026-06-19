# UnicodeArtJs

> 将文本或图片转换为字符画（Unicode Art）的JavaScript实现

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/unicode-art-js.svg)](https://www.npmjs.com/package/unicode-art-js)

## 📖 项目简介

UnicodeArtJs 是一个功能强大的字符画生成工具，支持将**文本**或**图片**转换为精美的 **Unicode 字符艺术**。本项目是 Python 版本 [UnicodeArt](https://github.com/mandolin/UnicodeArt) 的 JavaScript 移植，采用 **TypeScript + JavaScript** 混合开发。

### ✨ 核心特性

- 🎨 **图片转字符画**：支持多种图像格式，智能匹配字符
- 📝 **文本转字符画**：自定义字体、样式、对齐方式
- 🌏 **宽字符支持**：完美处理中文、日文等双宽度字符
- ⚡ **高性能**：优化的SAD匹配算法，支持早期终止
- 🔧 **高度可配置**：丰富的参数控制输出效果
- 📦 **多平台支持**：npm库、CLI、Web、VSCode插件、Electron应用

---

## 🎯 项目目标

本项目旨在构建一个**完整的字符画生态系统**，包含以下五个子项目：

### 1️⃣ **Core Library** (`packages/core/`)
- **定位**：核心算法库，发布到 npm
- **技术栈**：TypeScript + ndarray + sharp
- **功能**：提供纯函数式API，无副作用
- **状态**：✅ 代码完成 / npm alpha 已发布，一致性补丁待发布

### 2️⃣ **CLI Tool** (`packages/cli/`)
- **定位**：命令行工具，对标Python版本
- **技术栈**：Node.js + commander + cosmiconfig
- **功能**：终端交互、配置文件、国际化
- **状态**：✅ 代码完成 / npm alpha 待发布

### 3️⃣ **Web Application** (`packages/web/`)
- **定位**：浏览器端网页应用
- **技术栈**：Vanilla JS + Canvas API
- **功能**：可视化界面、实时预览、导出功能
- **兼容性**：前期现代浏览器，后期兼容IE11+
- **部署**：GitHub Pages
- **状态**：⏳ 待开发

### 4️⃣ **VSCode Extension** (`packages/vscode-extension/`)
- **定位**：Visual Studio Code 插件
- **技术栈**：VSCode Extension API
- **功能**：编辑器内实时生成、配置面板
- **发布**：VSCode Marketplace
- **状态**：⏳ 待开发

### 5️⃣ **Electron App** (`packages/electron-app/`)
- **定位**：跨平台桌面应用
- **技术栈**：Electron + React/Vue
- **功能**：完整GUI、系统托盘、自动更新
- **发布**：Microsoft Store、GitHub Releases
- **状态**：⏳ 待开发

---

## 📂 项目结构

```
UnicodeArtJs/
├── packages/                    # Monorepo 多包结构
│   ├── core/                    # 核心算法库（npm包）
│   │   ├── src/                 # TypeScript源码
│   │   ├── tests/               # 单元测试
│   │   ├── dist/                # 编译输出
│   │   └── package.json
│   ├── cli/                     # CLI命令行工具
│   │   ├── src/
│   │   └── package.json
│   ├── web/                     # Web应用
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   ├── vscode-extension/        # VSCode插件
│   │   ├── src/
│   │   └── package.json
│   └── electron-app/            # Electron桌面应用
│       ├── src/
│       └── package.json
├── ai/                          # AI协作文档
│   ├── share/                   # 共享文档（所有AI可见）
│   └── qoder/                   # Qoder工作区
├── docs/                        # 项目文档
│   ├── algorithms/              # 算法说明
│   ├── api/                     # API文档
│   └── guides/                  # 使用指南
├── tests/                       # 集成测试
├── tools/                       # 工具脚本
├── src/                         # 遗留代码（待迁移）
├── package.json                 # 根配置
└── README.md
```

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 运行CLI（当前版本）

```bash
npm start
# 等价于: node src/console.js -t 白 -e 5 -p spec
```

### 使用示例

```javascript
const { textToArt, imageToArt } = require('unicode-art-js');

// 文本转字符画
const art = textToArt('Hello', {
  font: 'Arial',
  height: 10,
  charset: 'ASCII'
});
console.log(art);

// 图片转字符画
const artFromImage = await imageToArt('photo.jpg', {
  width: 80,
  matrixSize: 6
});
console.log(artFromImage);
```

---

## 📋 开发路线图

详见 [docs/roadmap.md](docs/roadmap.md)

### 阶段概览

| 阶段 | 目标 | 预计时间 | 状态 |
|------|------|---------|------|
| Phase 0 | 项目初始化与架构设计 | 1天 | ✅ 完成 |
| Phase 1 | Core库核心算法实现 | 5天 | ✅ 代码完成 / 补丁待发布 |
| Phase 2 | CLI程序开发 | 3天 | ✅ 代码完成 / 待发布 |
| Phase 3 | Web应用开发 | 7天 | ⏳ 待开始 |
| Phase 4 | VSCode插件开发 | 5天 | ⏳ 待开始 |
| Phase 5 | Electron应用开发 | 10天 | ⏳ 待开始 |

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### AI协作说明

本项目采用**多AI协作开发模式**：
- **Qoder**：主力AI，负责核心算法和架构
- **Codex**：辅助AI，负责代码审查和优化
- **Comate**：辅助AI，负责UI和交互

详细协作规范见 [ai/share/README.md](ai/share/README.md)

---

## 📄 许可证

本项目采用 **MIT License** - 详见 [LICENSE](LICENSE) 文件

**重要**：所有第三方依赖必须使用 MIT、Apache、BSD 等宽松协议。

---

## 🔗 相关链接

- **参考项目（Python）**: [UnicodeArt](https://github.com/mandolin/UnicodeArt)
- **移植指南**: [doc/porting/](../UnicodeArt/doc/porting/)
- **Issue追踪**: [GitHub Issues](https://github.com/mandolin/UnicodeArtJs/issues)

---

*最后更新：2026-06-18*
