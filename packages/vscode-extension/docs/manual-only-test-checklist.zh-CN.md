# UnicodeArtJs VSCode 插件仅手动验证清单

本清单只保留目前不适合或无法稳定自动化的人工验证项。  
可自动验证的内容，例如 `npm run check`、manifest / protocol / preset 单测、VSIX 打包、基础安装命令、README 文件包含情况等，不放在这里。

## VSCode 真实 UI 入口

- [ ] 重新安装 VSIX 后执行 `Developer: Reload Window`，确认命令面板中能搜索到 UnicodeArtJs 相关命令。
- [ ] 在普通文本编辑器中选中文本，右键确认 UnicodeArtJs 菜单组在视觉上是独立区域。
- [ ] 右键菜单中确认以下入口可见:
  - `UnicodeArtJs: Generate Unicode Art: Default Template`
  - `UnicodeArtJs: Generate Unicode Art: Custom Template`
  - `UnicodeArtJs: Open Converter`
- [ ] 鼠标悬停 `Custom Template`，确认二级菜单能展开且 Template 1 / 2 / 3 可见。
- [ ] 运行未配置的 Template 1 / 2 / 3，确认弹出的提示符合预期，并能引导打开 Converter。

## Converter 交互体验

- [ ] 打开 Converter，确认布局、滚动、按钮启用/禁用状态没有明显错位。
- [ ] 文本模式下转换一段中文文本，肉眼确认预览区字符画可读。
- [ ] 图片模式下选择一张本地图片，确认文件名、mime type、文件大小显示合理。
- [ ] 点击“清除图片”，确认图片状态、文件名和元信息都被清空。
- [ ] 转换进行时尝试修改左侧表单，确认禁用状态符合预期；点击取消后确认状态恢复。
- [ ] 保存默认模板、保存 Template 1 后关闭并重新打开 Converter，确认模板状态显示符合预期。

## 插入、复制与保存

- [ ] 点击 Copy，粘贴到编辑器或其它文本工具中确认剪贴板内容正确。
- [ ] 点击 Insert，确认结果按当前插入方式写入活动编辑器。
- [ ] 保存 TXT，打开文件确认内容正确。
- [ ] 保存 HTML，使用浏览器打开确认字符画显示正常，字素字体样式可读。
- [ ] 在保存对话框中取消，确认 Converter 状态提示为“已取消保存”或对应英文提示。

## 字体与视觉效果

- [ ] 手动输入本机已安装的旧系统 CJK 字体，启用 `round` 裱框，确认触发条件下轻提示出现。
- [ ] 手动输入本机已安装的非推荐系统 Mono 字体，确认触发条件下 VSCode 字体度量相关轻提示出现。
- [ ] 使用 `等距更纱黑体 SC` 或 `霞鹜文楷等宽` 观察字符画，确认相较非严格混合等宽字体显示更稳定。
- [ ] 目测 Box 样式 `round`、`single`、`double` 至少各转换一次，确认边框没有明显断裂或异常缩进。

## 多语言界面

- [ ] 在中文 VSCode UI 下确认命令、右键菜单、设置项、Converter 标签、状态与错误提示主要显示中文。
- [ ] 在英文 VSCode UI 下确认同一批入口和 Converter 文案主要显示英文。
- [ ] 如果切换 VSCode 显示语言后，执行 `Developer: Reload Window`，确认语言变化生效。

## 诊断与 Output Channel

- [ ] 打开 `UnicodeArtJs` Output Channel。
- [ ] 打开和关闭 Converter，确认日志记录出现。
- [ ] 进行文本转换、图片转换、模板保存、复制、插入、保存，确认日志能帮助定位操作流程。
- [ ] 触发一次错误场景，例如未选择图片直接转换，确认 Converter 状态栏显示错误 code，Output Channel 也有对应线索。
