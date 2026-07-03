# 依赖许可证审查清单

> **创建日期**: 2026-06-17
> **最后更新**: 2026-07-03
> **要求**: 所有依赖必须使用 MIT、Apache 2.0、BSD、ISC 等宽松协议
> **禁止**: GPL、AGPL、LGPL 等强传染性协议

---

## 📦 当前依赖清单

### 生产依赖 (dependencies)

| 包名 | 版本 | 许可证 | 状态 | 备注 |
|------|------|--------|------|------|
| canvas | ^2.11.2 | MIT | ✅ 通过 | Node.js Canvas实现 |
| commander | ^12.0.0 | MIT | ✅ 通过 | 命令行参数解析 |
| cosmiconfig | ^9.0.0 | MIT | ✅ 通过 | 配置文件加载 |
| fontkit | ^2.0.2 | MIT | ✅ 通过 | 字体处理 |
| jsfeat | ^0.0.8 | BSD-3 | ✅ 通过 | 图像处理算法 |
| ndarray | ^1.0.19 | MIT | ✅ 通过 | 多维数组 |
| ndarray-fill | ^1.0.2 | MIT | ✅ 通过 | 数组填充 |
| ndarray-ops | ^1.2.2 | MIT | ✅ 通过 | 数组运算 |
| sd | ^0.0.3 | MIT | ✅ 通过 | ?需确认用途 |
| sharp | ^0.33.2 | Apache-2.0 | ✅ 通过 | 高性能图像处理 |
| text-to-svg | ^3.1.5 | MIT | ✅ 通过 | 文本转SVG |

### 开发依赖（待Phase 1添加）

| 包名 | 版本 | 许可证 | 状态 | 用途 |
|------|------|--------|------|------|
| typescript | ^5.3.0 | Apache-2.0 | ⏳ 待添加 | TypeScript编译器 |
| rollup | ^4.0.0 | MIT | ⏳ 待添加 | 模块打包工具 |
| @rollup/plugin-typescript | ^11.0.0 | MIT | ⏳ 待添加 | Rollup TS插件 |
| @rollup/plugin-node-resolve | ^15.0.0 | MIT | ⏳ 待添加 | Node模块解析 |
| @rollup/plugin-commonjs | ^25.0.0 | MIT | ⏳ 待添加 | CommonJS转换 |
| jest | ^29.0.0 | MIT | ⏳ 待添加 | 单元测试框架 |
| @types/jest | ^29.0.0 | MIT | ⏳ 待添加 | Jest类型定义 |
| @types/ndarray | ^1.0.14 | MIT | ⏳ 待添加 | ndarray类型定义 |
| eslint | ^8.0.0 | MIT | ⏳ 待添加 | 代码检查 |
| @typescript-eslint/eslint-plugin | ^6.0.0 | MIT | ⏳ 待添加 | TS ESLint插件 |

---

## 🔍 审查方法

### 自动化工具

```bash
# 安装license-checker
npm install -g license-checker

# 检查所有依赖的许可证
license-checker --summary

# 生成详细报告
license-checker --json > license-report.json

# 只列出非宽松协议的包
license-checker --onlyAllow="MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC" --failOnViolation
```

### 手动验证步骤

1. **查看package.json**：
   ```bash
   npm view <package-name> license
   ```

2. **检查GitHub仓库**：
   - 访问包的GitHub页面
   - 查看LICENSE文件
   - 确认无附加条件

3. **查阅npm页面**：
   - https://www.npmjs.com/package/<package-name>
   - 查看"License"字段

---

## ⚠️ 已知问题

### 参考项目许可证边界

Python 版 UnicodeArt 当前使用 GPL-3.0-only。UnicodeArtJs 采用 MIT License，因此公开文档和源码实现必须保持清晰边界：

- 可以参考公开行为、命令体验、参数含义和输出效果。
- 可以使用 black-box / oracle 兼容性测试验证常用参数下的行为。
- 不应复制 GPL 源码、注释、私有函数拆分或逐行实现结构。
- 公开文案应使用“独立实现”“功能目标参考”“行为兼容测试”等表述。
- 公开文案应避免“GPL 源码移植”“逐行翻译”“完全复刻”等表述。

该项是项目级许可证风险控制要求，后续发布 npm、Marketplace、GitHub Pages 或商业化推广前都需要复核。

### sd 包用途不明

- **包名**: `sd`
- **版本**: ^0.0.3
- **许可证**: MIT（需确认）
- **问题**: 不清楚在项目中的具体用途
- **行动**:
  - [ ] 搜索代码库中`sd`的使用位置
  - [ ] 如无必要，考虑移除
  - [ ] 如必需，添加注释说明用途

---

## 📋 审查计划

### Phase 1前（立即执行）

- [ ] 运行`license-checker`自动生成报告
- [ ] 确认`sd`包的用途和必要性
- [ ] 记录所有依赖的许可证到本文档
- [ ] 如有不合规依赖，寻找替代方案

### 每次添加新依赖时

- [ ] 在PR/MR中注明新依赖的许可证
- [ ] 更新本文档
- [ ] 团队审核通过后方可合并

### 定期审查（每月）

- [ ] 检查依赖更新是否有许可证变更
- [ ] 移除未使用的依赖
- [ ] 评估依赖的健康度（维护活跃度、安全问题）

---

## 🚫 禁止的许可证类型

以下许可证**严禁使用**：

- ❌ GPL-2.0 / GPL-3.0（GNU通用公共许可证）
- ❌ AGPL-3.0（ Affero GPL）
- ❌ LGPL-2.1 / LGPL-3.0（GNU宽通用公共许可证）
- ❌ SSPL（Server Side Public License）
- ❌ BSL（Business Source License）
- ❌ 任何带有"Copyleft"字样的许可证

**原因**：这些许可证具有强传染性，会要求整个项目开源，与MIT协议冲突。

---

## ✅ 允许的许可证类型

以下许可证**可以安全使用**：

- ✅ MIT
- ✅ Apache-2.0
- ✅ BSD-2-Clause / BSD-3-Clause
- ✅ ISC
- ✅ Unlicense / CC0（公共领域）
- ✅ WTFPL（Do What The F*ck You Want To Public License）

**原因**：这些是宽松许可证，允许商业使用、修改、分发，无传染性。

---

## 🔗 参考资源

- [OSI批准的许可证列表](https://opensource.org/licenses/)
- [Choose a License](https://choosealicense.com/)
- [npm许可证最佳实践](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#license)
- [GitHub许可证检测](https://github.com/licensee/licensee)

---

*最后更新*: 2026-07-03
*下次审查*: 2026-07-17（或添加新依赖时）
