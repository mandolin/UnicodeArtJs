# UnicodeArtJs 分阶段开发规划

> **文档版本**: v1.1
> **创建日期**: 2026-06-17
> **最后更新**: 2026-07-03
> **负责人**: Qoder / Codex / Comate 协作

---

## 📊 总体规划概览

本项目原始规划分为 **6个主要阶段**。截至 2026-07-03，Core / CLI / Web / VSCode 已形成第一轮可用闭环，Electron 暂缓启动。当前优先执行 `T-apple-P*` 临时规划，用于在 Electron 前补齐 roadmap、许可证边界、i18n、统一配置模型和 VSCode 插件体验。

| 阶段 | 名称 | 目标 | 预计工期 | 关键交付物 |
|------|------|------|---------|-----------|
| Phase 0 | 项目初始化 | 架构设计、文件夹结构 | 1天 | ✅ 已完成 |
| Phase 1 | Core库开发 | TypeScript核心算法 | 5天 | ✅ `unicode-art-js@1.1.0` 已发布 |
| Phase 2 | CLI程序 | 命令行工具 | 3天 | ✅ `unicode-art-cli@1.0.0` 已具备发布基础 |
| Phase 3 | Web应用 | 浏览器端应用 | 7天 | ✅ 当前阶段功能闭环完成 |
| Phase 4 | VSCode插件 | 编辑器扩展 | 5天 | ✅ Marketplace pre-release 已发布 |
| Phase 5 | Electron应用 | 桌面客户端 | 10天 | ⏸️ 暂缓 |

---

## 🧭 当前实际状态与临时规划

### 当前状态

- Core: `unicode-art-js@1.1.0` 已发布到 npm，包含 Node 入口、Browser 入口、Box 能力和核心回归测试。
- CLI: `unicode-art-cli@1.0.0` 已完成主要功能，支持图片/文本转换、配置文件、i18n 基础和 Box 参数。
- Web: 当前阶段功能闭环已完成，支持图片转字符画、文字 Banner、Box、主题、导出和浏览器 Core 入口。
- VSCode 插件: `mandolin.unicode-art-js-vscode@0.1.0` 已发布 Marketplace pre-release。
- Electron: 暂缓，待 i18n、统一配置模型、Web/VSCode 复用层稳定后再启动。

### T-apple 临时规划

Electron 之前先执行 `T-apple-P*`：

1. `T-apple-P1`: 重梳 roadmap，清理许可证边界与公开文案。（已完成）
2. `T-apple-P2`: 制定项目级 i18n / core foundation。（已完成）
3. `T-apple-P3`: 统一配置模型，包括视觉字体、字素字体、宽字符 profile、语言、输出环境。（已完成）
4. `T-apple-P4`: 修复 VSCode Converter 缺少字素字体选项的问题。（已完成）
5. `T-apple-P5`: 继续完善 VSCode 插件，细节进入阶段前再细化。

内部临时规划记录已迁移到本地私有 `work-zone/ai/share/`，公开路线图只保留稳定后的里程碑口径。

### 许可证与公开表述原则

UnicodeArtJs 是 MIT 许可的 TypeScript / JavaScript 独立实现。项目功能目标参考 UnicodeArt 的公开行为和使用体验，并通过兼容性回归测试尽量对齐常用参数下的输出效果。公开文档应避免使用“GPL 源码移植、逐行翻译、复制、完全复刻”等表述。

---

## 🎯 Phase 0: 项目初始化与架构设计

**状态**: ✅ **已完成**
**工期**: 1天（2026-06-17）

### 已完成任务

- ✅ 建立Monorepo文件夹结构
- ✅ 创建 AI 协作文档体系；内部材料现已迁移到本地私有 `work-zone/ai/`
- ✅ 编写项目主README
- ✅ 制定分阶段开发规划
- ✅ 确认MIT协议要求

### 技术决策记录

#### ADR-001: Monorepo结构选择
- **决策**: 采用多包Monorepo结构（`packages/`目录）
- **原因**:
  - 便于代码复用（core库被其他包依赖）
  - 独立版本管理
  - 简化CI/CD流程
- **工具**: 暂不使用Lerna/Nx，手动管理依赖

#### ADR-002: TypeScript与JavaScript比例
- **决策**: Core库使用TypeScript，其他包以JavaScript为主
- **原因**:
  - Core需要严格的类型定义（npm包质量）
  - 其他包快速迭代，减少编译开销
- **比例**: Core (80% TS), 其他 (20% TS, 80% JS)

#### ADR-003: 图像处理库选型
- **决策**: Node端使用sharp，浏览器端使用Canvas API
- **原因**:
  - sharp性能优异，但不支持浏览器
  - Canvas API跨平台兼容性好
- **抽象层**: Core库提供统一接口，内部适配不同实现

---

## 🚀 Phase 1: Core库核心算法实现

**状态**: ✅ **已完成，`unicode-art-js@1.1.0` 已发布**
**工期**: 5天
**目标**: 发布 npm Core 包，并为 CLI / Web / VSCode / 后续 Electron 提供统一核心能力。

### Day 1-2: 基础架构与类型定义

#### 任务清单

- [x] **1.1** 创建TypeScript项目配置
  - [x] 初始化 `packages/core/package.json`
  - [x] 配置 `tsconfig.json`
  - [x] 配置构建工具（Rollup）
  - [x] 设置lint规则（ESLint + Prettier）

- [x] **1.2** 定义核心类型系统
  - [x] `types/image.ts` - 图像数据结构
  - [x] `types/charset.ts` - 字符集定义
  - [x] `types/config.ts` - 配置选项
  - [x] `types/output.ts` - 输出格式

**关键类型示例**：
```typescript
interface ImageData {
  width: number;
  height: number;
  data: Uint8Array; // 灰度值 [0, 255]
}

interface CharMatrix {
  char: string;
  matrix: Float32Array; // 归一化到 [0, 1]
  isWideChar: boolean;
}

interface ArtConfig {
  height?: number;
  width?: number;
  matrixSize: number; // 默认6
  ratio: number; // 垂直水平比例，默认2.0
  charset: 'ASCII' | 'EXTENDED' | 'CUSTOM';
  customChars?: string;
  invert: boolean;
  interpolation: 'nearest' | 'bilinear' | 'bicubic';
}
```

#### 验收标准
- TypeScript编译无错误
- 类型定义覆盖所有公共API
- 导出完整的 `.d.ts` 文件

---

### Day 3-4: 核心算法实现

#### 任务清单

- [x] **1.3** 图像预处理模块 (`src/preprocessor.ts`)
  - [x] `loadImage(path: string): Promise<ImageData>` - 加载图像
  - [x] `rgbToGrayscale()` / `rgbaToGrayscale()` - 灰度化
  - [x] `resizeImage(image, width, height)` - 缩放

- [x] **1.4** 采样数组生成 (`src/sampler.ts`)
  - [x] `calculateBlockSize(image, outputHeight, outputWidth, ratio)`
  - [x] `generateSamplingArray(image: ImageData, config: ArtConfig): SamplingBlock[][]`
  - [x] 实现边界填充逻辑
  - [x] 归一化到 [0, 1]

- [x] **1.5** 字符矩阵渲染 (`src/charRenderer.ts`)
  - [x] `renderCharToMatrix(char, matrixSize, font, fontSize)`
  - [x] 支持宽字符（宽度×2）
  - [x] 字体加载
  - [x] 使用canvas渲染

- [x] **1.6** SAD匹配算法 (`src/matcher.ts`)
  - [x] `calculateSAD(block: Float32Array, charMatrix: Float32Array): number`
  - [x] **早期终止优化**（Early Termination）
  - [x] 普通字符/宽字符分组匹配
  - [ ] 并行计算支持（已预留 `batchMatchParallel`，实现延后）

**SAD算法伪代码**：
```typescript
function calculateSAD(block, charMatrix):
  let sum = 0
  for i in 0..block.length:
    diff = abs(block[i] - charMatrix[i])
    sum += diff
    if sum > currentBestScore:  // 早期终止
      return Infinity
  return sum
```

- [x] **1.7** 输出组装 (`src/assembler.ts`)
  - [x] `assembleOutput(charMatrix, config, format, metadata)`
  - [x] 处理宽字符对齐
  - [x] 去除行尾空格（可选）
  - [x] 支持多种输出格式（纯文本、HTML、ANSI颜色）

#### 验收标准
- 每个函数都有单元测试
- 关键参数组合下通过行为兼容回归测试
- 性能基准测试通过（见Phase 1-Day 5）

---

### Day 5: 测试、优化与打包

#### 任务清单

- [x] **1.8** 单元测试编写 (`tests/`)
  - [x] 图像加载/预处理测试
  - [x] 采样数组生成测试
  - [x] 字符匹配测试（含Python参考行为用例）
  - [x] 宽字符处理测试
  - [x] 边界情况测试（空输入、无字符集、无效配置等）

- [x] **1.9** 性能优化
  - [x] 添加核心匹配性能基准脚本
  - [x] 应用早期终止优化
  - [x] TypedArray替代普通数组
  - [x] 字符矩阵预计算缓存

- [x] **1.10** 打包与发布准备
  - [x] 配置Rollup打包（UMD + ESM + CommonJS）
  - [x] 生成类型声明文件
  - [x] 编写npm README
  - [x] 配置`.npmignore`
  - [x] `npm publish --dry-run` 通过
  - [x] 发布历史 alpha 版本到 npm
  - [x] 发布正式版本到 npm（当前 `1.1.0`）

#### 性能目标

| 指标 | 目标值 | Python参考 |
|------|--------|-----------|
| 100×50图像转换时间 | < 500ms | 公开行为参考 |
| 内存占用 | < 50MB | 公开行为参考 |
| SAD匹配速度 | 满足当前端到端体验 | 兼容性基准 |

#### 验收标准
- ✅ 所有单元测试通过
- ✅ 性能达到目标值的80%以上
- ✅ npm包可正常安装和使用
- ✅ 文档完整（API参考、示例代码）

---

## 🔧 Phase 2: CLI程序开发

**状态**: ✅ **已完成，`unicode-art-cli@1.0.0` 已具备发布基础**
**工期**: 3天
**目标**: 功能完整的命令行工具，复用 Core 能力，并提供稳定的命令行参数、配置文件和输出能力。

### Day 6: CLI框架与参数解析

#### 任务清单

- [x] **2.1** 初始化CLI项目
  - [x] `packages/cli/package.json`
  - [x] 依赖core库（发布态：`"unicode-art-js": "1.0.0"`；开发态：`"unicode-art-js": "file:../core"`）
  - [x] 安装commander、cosmiconfig

- [x] **2.2** 命令行参数定义
  - [x] 输入模式：`-i/--image`, `-t/--text`
  - [x] 输出控制：`-o/--output`, `-p/--print`
  - [x] 尺寸参数：`-e/--height`, `-w/--width`
  - [x] 字符集：`-a/--chars`
  - [x] 字体配置：`-f/--font`, `--font-style`, `--font-reduce`
  - [x] 高级选项：`-m/--matrix`, `-r/--ratio`, `-v/--invert`
  - [x] 多行文本：`--text-align`, `--line-spacing`, `--height-mode`
  - [x] 国际化：`--lang zh-CN|en-US`
  - [x] 调试参数：`-d/--debug`

- [x] **2.3** 配置文件支持
  - [x] 默认配置：`config.yml`
  - [x] 自定义路径：`-c/--config`
  - [x] 配置合并逻辑（命令行 > 配置文件 > 默认值）

#### 验收标准
- 帮助信息完整（`--help`）
- 参数验证与错误提示友好
- 配置文件正确加载

---

### Day 7: 核心功能集成

#### 任务清单

- [x] **2.4** 集成core库
  - [x] 图片转字符画流程
  - [x] 文本转字符画流程
  - [x] 错误处理与日志

- [x] **2.5** 国际化（i18n）
  - [x] 多语言消息文件（`locales/zh-CN.json`, `locales/en-US.json`）
  - [x] 语言切换逻辑
  - [x] 翻译主要用户可见文本

- [x] **2.6** 输出格式化
  - [x] 控制台彩色输出（可选）
  - [x] 文件写入（UTF-8编码）
  - [x] 支持管道输出（`|`）

#### 验收标准
- 覆盖主要转换能力与常用参数组合
- 通过兼容性回归测试和端到端测试
- 参数设计兼顾现有用户习惯与 JS 生态扩展性

---

### Day 8: 测试与文档

#### 任务清单

- [x] **2.7** 端到端测试
  - [x] 图片转换测试
  - [x] 文本转换测试
  - [x] 边界情况测试
  - [x] 性能/回归冒烟测试

- [x] **2.8** 文档编写
  - [x] CLI使用手册
  - [x] 配置文件示例
  - [x] 常见问题FAQ

- [x] **2.9** 发布准备
  - [x] 全局安装支持（`npm install -g`）
  - [x] Shebang行配置
  - [x] 二进制打包（pkg可选，本阶段不强制）

#### 验收标准
- ✅ CLI可通过npm全局安装
- ✅ 所有功能测试通过
- ✅ 文档完整易懂

---

## 🌐 Phase 3: Web应用开发

**状态**: ✅ **当前阶段功能闭环完成，后续继续体验与部署完善**
**工期**: 7天
**目标**: 交互式网页应用，部署到GitHub Pages

### Day 9-10: 前端架构与UI设计

#### 任务清单

- [ ] **3.1** 初始化Web项目
  - [ ] `packages/web/package.json`
  - [ ] 选择构建工具（Vite推荐）
  - [ ] 配置开发服务器

- [ ] **3.2** UI原型设计
  - [ ] 布局设计（输入区、预览区、控制区）
  - [ ] 响应式设计（移动端适配）
  - [ ] 暗色/亮色主题

- [ ] **3.3** 核心组件开发
  - [ ] `ImageUploader` - 图片上传组件
  - [ ] `TextInput` - 文本输入框
  - [ ] `ControlPanel` - 参数控制面板
  - [ ] `ArtPreview` - 字符画预览（Canvas渲染）
  - [ ] `ExportButton` - 导出功能

#### 技术选型
- **框架**: Vanilla JS（前期），后期可选React/Vue
- **样式**: CSS Modules 或 Tailwind CSS
- **状态管理**: 原生EventEmitter或Zustand（轻量）

---

### Day 11-12: Canvas渲染引擎

#### 任务清单

- [ ] **3.4** Canvas适配器
  - [ ] 浏览器端Canvas API封装
  - [ ] 与core库接口对接
  - [ ] 离屏Canvas优化性能

- [ ] **3.5** 实时预览
  - [ ] 参数变化即时更新
  - [ ] 防抖处理（debounce 300ms）
  - [ ] 加载状态指示

- [ ] **3.6** 交互功能
  - [ ] 拖拽上传图片
  - [ ] 复制字符画到剪贴板
  - [ ] 缩放和平移预览

#### 验收标准
- 预览流畅（60fps）
- 参数调整响应时间 < 500ms

---

### Day 13-14: 高级功能与优化

#### 任务清单

- [ ] **3.7** 导出功能
  - [ ] 导出为TXT
  - [ ] 导出为PNG（Canvas截图）
  - [ ] 导出为HTML（保留样式）

- [ ] **3.8** 预设模板
  - [ ] ASCII艺术预设
  - [ ] 中文书法预设
  - [ ] 自定义预设保存/加载

- [ ] **3.9** 性能优化
  - [ ] Web Worker后台计算
  - [ ] 虚拟滚动（大尺寸字符画）
  - [ ] 懒加载字体

- [ ] **3.10** 浏览器兼容性
  - [ ] 现代浏览器测试（Chrome、Firefox、Safari、Edge）
  - [ ] IE11 polyfill配置（后期）
  - [ ] 渐进增强策略

---

### Day 15: 部署与文档

#### 任务清单

- [ ] **3.11** GitHub Pages部署
  - [ ] 配置GitHub Actions自动部署
  - [ ] 自定义域名（可选）
  - [ ] SEO优化（meta标签）

- [ ] **3.12** 用户文档
  - [ ] 在线使用教程
  - [ ] 视频教程（可选）
  - [ ] 常见问题FAQ

#### 验收标准
- ✅ 网站可公开访问
- ✅ 所有功能正常工作
- ✅ 移动端体验良好

---

## 💻 Phase 4: VSCode插件开发

**状态**: ✅ **Marketplace pre-release 已发布，后续继续完善**
**工期**: 5天
**目标**: 发布到VSCode Marketplace

### Day 16-17: 插件架构

#### 任务清单

- [ ] **4.1** 初始化插件项目
  - [ ] `yo code` 生成脚手架
  - [ ] `packages/vscode-extension/package.json`
  - [ ] 配置TypeScript编译

- [ ] **4.2** 核心命令实现
  - [ ] `unicodeart.convertSelection` - 转换选中文本
  - [ ] `unicodeart.convertFile` - 转换图片文件
  - [ ] `unicodeart.showPreview` - 显示预览面板

- [ ] **4.3** 配置系统
  - [ ] `package.json` contributes.configuration
  - [ ] 用户设置与工作区设置
  - [ ] 配置项：字体、字符集、尺寸等

---

### Day 18-19: UI集成

#### 任务清单

- [ ] **4.4** WebView预览面板
  - [ ] 嵌入Web应用的预览组件
  - [ ] 实时同步参数
  - [ ] 一键插入到编辑器

- [ ] **4.5** 快捷操作
  - [ ] 右键菜单集成
  - [ ] 快捷键绑定
  - [ ] 状态栏按钮

- [ ] **4.6** 智能提示
  - [ ] 字符集自动补全
  - [ ] 参数说明悬停提示

---

### Day 20: 测试与发布

#### 任务清单

- [ ] **4.7** 插件测试
  - [ ] 单元测试
  - [ ] 集成测试（VSCode Test API）
  - [ ] 手动测试 checklist

- [ ] **4.8** 打包与发布
  - [ ] `vsce package` 打包
  - [ ] 发布到Marketplace
  - [ ] 编写插件说明文档

#### 验收标准
- ✅ 插件可通过Marketplace安装
- ✅ 所有功能正常工作
- ✅ 评分4.5+（目标）

---

## 🖥️ Phase 5: Electron桌面应用

**状态**: ⏸️ **暂缓，待 T-apple 基础设施阶段完成后再评估**
**工期**: 10天
**目标**: 跨平台桌面应用，发布到Microsoft Store

### Day 21-23: Electron框架搭建

#### 任务清单

- [ ] **5.1** 初始化Electron项目
  - [ ] `packages/electron-app/package.json`
  - [ ] 主进程（main.js）
  - [ ] 预加载脚本（preload.js）

- [ ] **5.2** 集成Web应用
  - [ ] 复用Web项目的UI代码
  - [ ] IPC通信（主进程↔渲染进程）
  - [ ] 文件系统访问（Node API）

- [ ] **5.3** 窗口管理
  - [ ] 主窗口（多标签支持）
  - [ ] 最小化到系统托盘
  - [ ] 窗口状态持久化

---

### Day 24-26: 高级功能

#### 任务清单

- [ ] **5.4** 文件管理
  - [ ] 打开/保存图片
  - [ ] 最近文件列表
  - [ ] 拖拽支持

- [ ] **5.5** 自动更新
  - [ ] electron-updater集成
  - [ ] GitHub Releases检查
  - [ ] 静默更新/提示更新

- [ ] **5.6** 系统集成
  - [ ] 系统托盘图标
  - [ ] 通知API
  - [ ] 全局快捷键（可选）

---

### Day 27-28: 打包与分发

#### 任务清单

- [ ] **5.7** 多平台打包
  - [ ] electron-builder配置
  - [ ] Windows: NSIS installer + portable
  - [ ] macOS: DMG + MAS（可选）
  - [ ] Linux: AppImage + deb

- [ ] **5.8** Microsoft Store准备
  - [ ] 应用清单（appxmanifest）
  - [ ] 截图与应用描述
  - [ ] 提交审核

- [ ] **5.9** 代码签名
  - [ ] Windows Authenticode
  - [ ] macOS Notarization
  - [ ] 证书管理

---

### Day 29-30: 测试与优化

#### 任务清单

- [ ] **5.10** 全面测试
  - [ ] 功能测试（所有平台）
  - [ ] 性能测试（启动时间、内存占用）
  - [ ] 兼容性测试（Win7+、macOS 10.13+）

- [ ] **5.11** 用户体验优化
  - [ ] 启动画面
  - [ ] 加载动画
  - [ ] 错误提示优化

---

### Day 31: 发布与推广

#### 任务清单

- [ ] **5.12** 正式发布
  - [ ] GitHub Releases发布
  - [ ] Microsoft Store提交
  - [ ] 产品官网更新

- [ ] **5.13** 文档与营销
  - [ ] 用户手册
  - [ ] 演示视频
  - [ ] 社交媒体宣传

#### 验收标准
- ✅ 所有平台安装包可用
- ✅ Microsoft Store审核通过
- ✅ 用户反馈积极

---

## 📈 关键里程碑

| 里程碑 | 预计日期 | 交付物 |
|--------|---------|--------|
| M1: Core Release | 已完成 | `unicode-art-js@1.1.0` |
| M2: CLI Ready | 已完成 | `unicode-art-cli@1.0.0` 发布基础 |
| M3: Web Alpha | 已完成 | Web 当前阶段功能闭环 |
| M4: VSCode Pre-release | 已完成 | Marketplace pre-release |
| M5: Foundation Cleanup | 进行中 | `T-apple-P*` |
| M6: Desktop GA | 待评估 | Electron / Microsoft Store |

---

## ⚠️ 风险与应对

### 技术风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| sharp浏览器不兼容 | 高 | 中 | 已规划Canvas API备选方案 |
| 性能达不到目标 | 中 | 高 | WebAssembly优化、早期终止 |
| IE11兼容困难 | 高 | 低 | 降级策略、polyfill |
| VSCode API变更 | 低 | 中 | 关注更新日志、快速适配 |

### 进度风险

| 风险 | 应对措施 |
|------|---------|
| 某个阶段延期 | 调整后续阶段优先级，核心功能优先 |
| AI协作冲突 | 明确分工边界，定期同步 |
| 依赖库许可证问题 | 提前审查所有依赖，备选方案准备 |

---

## 📊 成功指标

### 技术指标
- ✅ Core库单元测试覆盖率 > 90%
- ✅ 关键路径行为兼容回归测试稳定
- ✅ 性能满足当前 Core / CLI / Web / VSCode 体验要求
- ✅ 所有平台自动化测试通过

### 产品指标
- ✅ npm周下载量 > 1000（3个月后）
- ✅ VSCode插件评分 > 4.5
- ✅ GitHub Stars > 500（6个月后）
- ✅ Microsoft Store下载量 > 10000（1年后）

---

## 🔄 持续改进

### 未来方向（Phase 6+）
- [ ] AI辅助字符匹配（机器学习优化）
- [ ] 视频转字符动画
- [ ] 3D字符艺术
- [ ] 移动端App（React Native/Flutter）
- [ ] SaaS服务（云端API）

---

*文档维护*: 每完成一个阶段，更新此文档。内部 AI 协作记录归档到本地私有 `work-zone/ai/share/`，公开文档按发布需要单独整理。

*最后更新*: 2026-07-08 by Codex
