# @unicode-art/web

> UnicodeArtJs Web Application - 浏览器端的 Unicode 字符画生成工具

本 Web 应用基于 MIT 许可的 `unicode-art-js/browser` 独立实现构建，用于在浏览器中完成图片和文字到 Unicode 字符画的转换。项目功能目标参考 UnicodeArt 的公开行为和使用体验，但不以复制 GPL 源码或逐行翻译为实现方式。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 功能特性

- 🖼️ **图片转字符画** - 上传图片转换为Unicode字符画
- 📝 **文字Banner** - 输入文字生成艺术字
- 📦 **裱框功能** - 为字符画添加装饰边框（圆角/双线/ASCII等）
- 🎨 **5套主题** - 支持亮色/暗黑/高对比度/Solarized/Nord
- 📤 **导出** - TXT/HTML/PNG/复制到剪贴板
- 🌐 **语言基础设施** - 会将浏览器语言映射为 Core `locale`，为后续完整 UI 多语言做准备

## 技术栈

| 项目 | 选择 |
|------|------|
| 构建工具 | Vite 5 |
| UI框架 | Vanilla JavaScript + jQuery 3 |
| 样式 | 全量自写CSS（无外部依赖） |
| Core库 | unicode-art-js (browser入口) |

## 项目结构

```
packages/web/
├── src/
│   ├── main.js              # 应用主入口
│   └── styles/
│       └── main.css          # 主样式表 (含5套主题)
├── tests/
│   ├── unit.test.js          # 单元测试
│   └── e2e-smoke.mjs         # E2E冒烟测试 (Playwright)
├── docs/
│   └── user-guide.md         # 用户指南
├── index.html                # 入口HTML
├── package.json              # 项目配置
├── vite.config.js            # Vite构建配置
└── README.md                 # 本文件
```

## 主题

| 主题 | 风格 |
|------|------|
| default | 亮色简约 |
| dark | 深色护眼 |
| high-contrast | 黑白高对比 |
| solarized-light | 温暖柔和 |
| nord | 冷色调极冰 |

## 组件架构

应用的入口类为 `AppController`，职责：

- **ThemeManager**: 主题管理（CSS变量切换）
- **ToastManager**: 通知管理
- **CoreAdapter**: Core API封装
- **ArtGenerator**: 字符画生成（配置构建→调用Core）
- **AppController**: 全局控制器（事件绑定/状态管理/导出）

### 组件化规范

所有UI组件遵循接口：

```javascript
class UIComponent {
  constructor(container, options) {}
  render() {}        // 渲染
  bindEvents() {}    // 事件绑定
  update(state) {}   // 更新状态
  destroy() {}       // 清理
}
```

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- 响应式适配: 宽屏/平板/手机

## 测试

```bash
# 单元测试
npm test

# E2E测试（需要Playwright）
npx playwright install chromium
npm run test:e2e

# 完整检查
npm run check
```

## 许可证

MIT License

## 相关链接

- [Core库](https://github.com/mandolin/UnicodeArtJs/tree/main/packages/core)
- [CLI工具](https://github.com/mandolin/UnicodeArtJs/tree/main/packages/cli)
- [主项目仓库](https://github.com/mandolin/UnicodeArtJs)
