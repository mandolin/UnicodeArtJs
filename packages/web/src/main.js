/**
 * ============================================================================
 * 🟦 UnicodeArtJs Web 主入口
 * ============================================================================
 *
 * @module main.js
 * @since 0.1.0-alpha
 * @license MIT
 * ============================================================================
 */

import {
  getGalleryLocalizedText,
  parseUnicodeArtGalleryIndex,
  resolveUnicodeArtGalleryArtworkUrl,
} from './gallery-index.js';
import {
  matchResourceManifestWithGallery,
  parseUnicodeArtResourceManifest,
  resolveUnicodeArtResourceDiscoveryUrl,
  verifyUnicodeArtResourceBytes,
} from './resource-discovery.js';
import {
  getUnicodeArtResourceRevocationStatus,
  parseUnicodeArtResourceLock,
  parseUnicodeArtResourceRevocations,
  parseUnicodeArtResourceSignature,
  verifyUnicodeArtResourceTrust,
} from './resource-trust.js';
import {
  createCanvasFontAvailabilityChecker,
  getFontAvailabilitySummary,
} from './font-availability.js';
import {
  CELL_CANVAS_DRAFT_SCHEMA,
  CELL_CANVAS_PROJECT_SCHEMA,
  CELL_CANVAS_PRESETS,
  cellCanvasDraftToHtmlProjection,
  cellCanvasDraftToPlainText,
  cellCanvasDraftToPlainTextProjection,
  copyCellCanvasSelection as copyCellCanvasSelectionDraft,
  createDefaultCellCanvasDraft,
  createCellCanvasDraftFromPreset,
  createCellCanvasDraftFromSpecialArtResult,
  drawCellCanvasConnector,
  getActiveCellMap,
  getCellCanvasHistoryState,
  pasteCellCanvasClipboard as pasteCellCanvasClipboardDraft,
  redoCellCanvasHistory as redoCellCanvasHistoryDraft,
  setCellCanvasSelection as setCellCanvasSelectionDraft,
  undoCellCanvasHistory as undoCellCanvasHistoryDraft,
  updateCellCanvasCell,
  validateCellCanvasDocumentDraft,
} from './cellcanvas.js';
import { renderCellMapToCanvas2D } from './studio/canvas-renderer.js';
import {
  STUDIO_PROJECT_SCHEMA,
  createStudioProjectCapsuleFromCellCanvasDraft,
  readCellCanvasDraftFromStudioSource,
} from './studio/project-capsule.js';
import {
  createStudioImportProposalFromResourceEntry,
  createStudioResourceEntryFromDiscoveryState,
  formatStudioImportProposalSummary,
} from './studio/resource-entry.js';

//#region 🟩 应用状态

let $ = window.jQuery || window.$;

const SUPPORTED_UI_LOCALES = ['zh-CN', 'en-US'];
const WEB_CONFIG_STORAGE_KEY = 'unicode-art-config';
const EDITOR_WORKSPACE_STORAGE_KEY = 'unicode-art-editor-workspace-v1';
const EDITOR_TEMPLATE_STORAGE_KEY = 'unicode-art-editor-templates-v1';

/**
 * Web 表单与 Core 配置共用的默认值。
 *
 * 字素字体默认值必须与下拉选项的 value 完全一致，避免首次进入页面时
 * 出现“下拉框显示一种字体、实际生成使用另一种字体”的状态分叉。
 */
const DEFAULT_WEB_CONFIG = Object.freeze({
  height: 20,
  width: '',
  charset: 'ASCII',
  customChars: '',
  font: "'Noto Sans SC', '思源黑体', sans-serif",
  glyphFont: "'Sarasa Mono SC', 'Sarasa Term SC', '等距更纱黑体 SC Nerd Font', '等距更纱黑体 SC', '等距更纱黑体', '等距更紗黑體 SC', monospace",
  glyphWidthProfile: 'default',
  wideCharRegex: '',
  matrixSize: 6,
  ratio: 2.0,
  interpolation: 'bicubic',
  wideCharRatio: 2.0,
  invert: false,
  trimTrailing: false,
  earlyTermination: true,
  fontReduce: 0,
  charSpace: 1,
  locale: detectCoreLocale(),
  outputFormat: 'plain',
  boxEnabled: false,
  boxStyle: 'round',
  boxPadding: 1,
  boxMargin: 0,
  boxTitle: '',
  boxShadow: false,
  themeName: 'default',
});

/** 保留合法的 0，仅在输入无法解析时使用默认值。 */
function parseIntegerOr(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const UI_MESSAGES = {
  'zh-CN': {
    'meta.title': 'UnicodeArtJs - 免费在线Unicode字符画生成器',
    'meta.description': 'UnicodeArtJs - 免费在线Unicode字符画生成器，将图片和文本转换为精美的Unicode字符画。支持多种字符集、字体、裱框样式和主题。',
    'language.label': '语言',
    'theme.label': '主题',
    'theme.default': '🌙 默认（现代简约）',
    'theme.dark': '☀️ 暗黑',
    'theme.highContrast': '🎨 高对比度',
    'theme.solarizedLight': '🌅 Solarized 浅色',
    'theme.nord': '❄️ Nord 极冰',
    'mode.image': '图片转字符画',
    'mode.text': '文字Banner',
    'mode.editor': '编辑器',
    'mode.gallery': '作品画廊',
    'mode.resources': '资源发现',
    'mode.docs': '开发文档',
    'editor.sourceRegion': '编辑器源文件与模板',
    'editor.previewRegion': '编辑器预览',
    'editor.title': '艺术字与布局编辑器',
    'editor.experimental': '实验性',
    'editor.kind': '编辑内容',
    'editor.kind.document': '布局文档',
    'editor.kind.font': 'UAF 艺术字字体',
    'editor.kind.cellcanvas': 'CellCanvas 字素画',
    'editor.preset': '内置示例',
    'editor.preset.documentTable': '标题表格',
    'editor.preset.documentArtFont': '嵌入艺术字 Banner',
    'editor.preset.fontLine': '线条艺术字',
    'editor.preset.cellcanvasLineBanner': '线条 Banner 网格',
    'editor.preset.cellcanvasShadow': '阴影 TextFx 网格',
    'editor.loadPreset': '载入',
    'editor.templateName': '模板名称',
    'editor.templateNamePlaceholder': '例如：我的标题表格',
    'editor.saveTemplate': '保存模板',
    'editor.savedTemplates': '本地模板',
    'editor.loadTemplate': '载入',
    'editor.deleteTemplate': '删除',
    'editor.fileActions': '导入导出',
    'editor.import': '导入 JSON',
    'editor.export': '导出 JSON',
    'editor.extension': '扩展清单（开发者）',
    'editor.extensionInspect': '检查 UAEM JSON',
    'editor.extensionHelp': '只解析所选清单并评估 Web 兼容性；不会读取同目录资源、安装或执行扩展代码。',
    'editor.extensionReady': '尚未选择扩展清单',
    'editor.extensionSummary': '{name} · {resources} 个资源声明 · {compatible}',
    'editor.extensionCompatible': 'Web 兼容',
    'editor.extensionIncompatible': 'Web 不兼容：{reasons}',
    'editor.extensionError': '清单无效：{message}',
    'editor.resourceEntry': 'Studio 资源入口',
    'editor.resourceEntryHelp': '复用本站已审核资源清单，只生成导入提案；不自动安装、不执行资源，确认后才写入当前编辑器。',
    'editor.resourceEntrySelect': '资源',
    'editor.resourceEntryLoad': '载入资源',
    'editor.resourceEntryInspect': '检查提案',
    'editor.resourceEntryImport': '确认导入',
    'editor.resourceEntryReady': '尚未载入 Studio 资源入口',
    'editor.resourceEntryLoading': '正在载入并校验资源',
    'editor.resourceEntryLoaded': '已载入 {count} 个资源；请选择并检查导入提案',
    'editor.resourceEntryEmpty': '没有可用于 Studio 的资源',
    'editor.resourceEntryProposalReady': '导入提案已生成：{status}',
    'editor.resourceEntryProposalBlocked': '导入提案被阻断：{reason}',
    'editor.resourceEntryImported': '资源已通过确认流程导入编辑器',
    'editor.resourceEntryFailed': '资源入口失败：{message}',
    'editor.source': 'Canonical JSON',
    'editor.sourceHelp': '保存和导入使用 Core 校验的 canonical JSON；浏览器不会上传内容。',
    'editor.fontSample': '预览文字',
    'editor.embedFont': '嵌入文档',
    'editor.ready': '就绪',
    'editor.previewPlaceholder': '选择一个示例或输入 JSON 后渲染预览',
    'editor.validate': '校验',
    'editor.render': '渲染预览',
    'editor.copy': '复制预览',
    'editor.metaEmpty': '宽度: -- 高度: --',
    'editor.metaReady': '宽度: {cols} 高度: {rows}',
    'editor.status.valid': '校验通过 · {summary}',
    'editor.status.rendered': '渲染完成',
    'editor.status.error': '无效：{message}',
    'editor.status.imported': '已导入并校验',
    'editor.status.templateSaved': '本地模板已保存',
    'editor.status.templateDeleted': '本地模板已删除',
    'editor.status.templateNameRequired': '请先填写模板名称',
    'editor.status.templateSelectionRequired': '请选择一个本地模板',
    'editor.status.copyDone': '预览已复制',
    'editor.status.copyFailed': '复制失败，请手动选择预览内容',
    'editor.status.cellSelected': '已选中字素格 ({x}, {y})',
    'editor.status.cellUpdated': '字素格已更新',
    'editor.status.selectionApplied': '选区已更新 · {width}x{height}',
    'editor.status.selectionCopied': '选区已复制 · {width}x{height}',
    'editor.status.selectionPasted': '选区已粘贴',
    'editor.status.undoDone': '已撤销',
    'editor.status.redoDone': '已重做',
    'editor.status.clipboardEmpty': '剪贴板没有可粘贴的字素选区',
    'editor.status.historyEmpty': '没有可执行的历史操作',
    'editor.status.specialArtImported': 'SpecialArt 结果已作为 CellCanvas 导入',
    'editor.status.projectionExported': 'CellCanvas 投影已导出：{kind}',
    'editor.status.projectSaved': 'CellCanvas 内部项目已保存',
    'editor.status.projectLoaded': 'CellCanvas 内部项目已加载',
    'editor.status.pngExported': 'CellCanvas PNG 投影已导出',
    'editor.status.pngExportFailed': 'CellCanvas PNG 导出失败',
    'editor.status.connectorDrawn': '连线已绘制 · {cells} 格',
    'cellcanvas.section': 'CellCanvas 单格编辑',
    'cellcanvas.selection': '选区',
    'cellcanvas.connector': '连线',
    'cellcanvas.x': 'X',
    'cellcanvas.y': 'Y',
    'cellcanvas.fromX': '起点 X',
    'cellcanvas.fromY': '起点 Y',
    'cellcanvas.toX': '终点 X',
    'cellcanvas.toY': '终点 Y',
    'cellcanvas.route': '路由',
    'cellcanvas.routeAuto': '自动',
    'cellcanvas.routeHorizontalFirst': '横后竖',
    'cellcanvas.routeVerticalFirst': '竖后横',
    'cellcanvas.width': '宽',
    'cellcanvas.height': '高',
    'cellcanvas.char': '字素',
    'cellcanvas.fg': '前景色',
    'cellcanvas.bg': '背景色',
    'cellcanvas.apply': '应用',
    'cellcanvas.select': '选择',
    'cellcanvas.copy': '复制',
    'cellcanvas.paste': '粘贴',
    'cellcanvas.undo': '撤销',
    'cellcanvas.redo': '重做',
    'cellcanvas.drawConnector': '绘制连线',
    'cellcanvas.exportTxt': '导出 TXT 投影',
    'cellcanvas.exportHtml': '导出 HTML 投影',
    'cellcanvas.exportPng': '导出 PNG 投影',
    'cellcanvas.saveProject': '保存内部项目',
    'cellcanvas.openProject': '加载内部项目',
    'cellcanvas.help': '点击预览网格中的字素格后，可在这里修改单格内容和颜色。',
    'gallery.region': 'UnicodeArtJs 作品画廊',
    'gallery.previewRegion': '作品字符画预览',
    'gallery.title': 'UnicodeArtJs 作品画廊',
    'gallery.intro': '展示项目审核通过的原创静态示例；不会上传、下载或执行第三方内容。',
    'gallery.filters': '画廊筛选',
    'gallery.search': '搜索',
    'gallery.searchPlaceholder': '按标题、说明或标签筛选',
    'gallery.tag': '标签',
    'gallery.tag.all': '全部标签',
    'gallery.clearFilters': '清除筛选',
    'gallery.status.ready': '正在准备作品索引',
    'gallery.status.loading': '正在载入审核作品',
    'gallery.status.loaded': '已载入 {count} 件审核作品',
    'gallery.status.empty': '没有匹配的作品',
    'gallery.status.error': '画廊载入失败：{message}',
    'gallery.count': '显示 {visible} / {total} 件作品',
    'gallery.noSelection': '选择一件作品以查看详情',
    'gallery.previewPlaceholder': '从左侧选择一件作品',
    'gallery.loadingPreview': '正在生成作品预览',
    'gallery.previewFailed': '作品预览失败：{message}',
    'gallery.reviewed': '已审核',
    'gallery.author': '作者',
    'gallery.license': '许可证',
    'gallery.reviewedAt': '审核日期',
    'gallery.kind.semantic-document': '语义布局文档',
    'gallery.kind.unicode-art-font': 'Unicode 艺术字字体',
    'gallery.copy': '复制字符画',
    'gallery.download': '下载源文件',
    'gallery.openEditor': '在编辑器中打开',
    'gallery.copyDone': '画廊作品已复制到剪贴板',
    'gallery.copyFailed': '复制失败，请手动选择预览内容',
    'gallery.tag.banner': 'Banner',
    'gallery.tag.font': '艺术字',
    'gallery.tag.original': '原创',
    'gallery.tag.layout': '布局',
    'gallery.tag.table': '表格',
    'gallery.tag.document': '文档',
    'gallery.tag.box': '裱框',
    'gallery.tag.text': '文本',
    'gallery.tag.bilingual': '双语',
    'gallery.tag.width': '宽度',
    'gallery.tag.review': '审核',
    'resource.region': 'UnicodeArtJs 资源发现',
    'resource.detailRegion': '资源校验详情',
    'resource.title': '实验性资源发现',
    'resource.intro': '读取本站随同发布的静态资源清单，展示 hash、签名与撤回状态；不会自动安装、启用或执行资源，导入需手动确认。',
    'resource.status.ready': '正在准备资源清单',
    'resource.status.loading': '正在载入并校验同源资源',
    'resource.status.loaded': '已校验 {verified} / {total} 个资源',
    'resource.status.importing': '正在复核并导入资源',
    'resource.status.error': '资源发现载入失败：{message}',
    'resource.resourceCount': '资源',
    'resource.verifiedCount': '已校验',
    'resource.network': '联网',
    'resource.automaticInstall': '自动安装',
    'resource.reviewedAt': '清单审核',
    'resource.network.none': '无',
    'resource.automaticInstall.false': '关闭',
    'resource.refresh': '重新校验',
    'resource.openDocs': '说明文档',
    'resource.noSelection': '选择一个资源查看详情',
    'resource.detailPlaceholder': '从左侧选择一个资源。页面默认只展示校验信息；导入编辑器需要再次确认。',
    'resource.kind.semantic-document': '语义布局文档',
    'resource.kind.unicode-art-font': 'Unicode 艺术字字体',
    'resource.status.verified': '已验证',
    'resource.status.failed': '校验失败',
    'resource.status.pending': '待校验',
    'resource.id': '资源 ID',
    'resource.kind': '类型',
    'resource.source': '路径',
    'resource.license': '许可证',
    'resource.size': '大小',
    'resource.sha256': 'sha256',
    'resource.actualSha256': '实际 sha256',
    'resource.trustStatus': '信任状态',
    'resource.revocationStatus': '撤回状态',
    'resource.cacheTarget': '缓存目标',
    'resource.boundary': '边界',
    'resource.boundaryText': '同源读取；不自动安装；不执行；导入前复核 hash、撤回与维护者签名。',
    'resource.openGallery': '在画廊中查看',
    'resource.importEditor': '确认后导入编辑器',
    'resource.importDialogTitle': '导入已验证资源',
    'resource.importDialogBody': '该资源将写入当前浏览器的 source-first 编辑器工作区，并替换当前编辑器内容。',
    'resource.importConfirm': '确认导入',
    'resource.importCancel': '取消',
    'resource.importAllowed': '可导入',
    'resource.importBlocked': '不可导入',
    'resource.importBlockedReason': '阻止原因',
    'resource.cacheTarget.editorWorkspace': '当前浏览器编辑器工作区',
    'resource.trust.maintainer-signed': '维护者签名已验证',
    'resource.trust.unsigned-draft': '未签名草稿',
    'resource.trust.invalid-signature': '签名无效或浏览器不支持验证',
    'resource.trust.expired': '签名或密钥已过期',
    'resource.trust.revoked-key': '签名密钥已撤回',
    'resource.revocation.not-revoked': '未撤回',
    'resource.revocation.revoked-resource': '已撤回',
    'resource.import.block.hash': '资源字节未通过 size/sha256 校验',
    'resource.import.block.signature': '资源签名链未通过或当前浏览器不支持验证',
    'resource.import.block.revoked': '资源已撤回',
    'resource.import.block.artwork': '画廊索引缺少对应条目',
    'resource.import.block.unknown': '资源当前不可导入',
    'resource.hashPrefix': 'sha256: {hash}',
    'resource.sizeBytes': '{size} 字节',
    'resource.checkOk': 'size 与 sha256 匹配',
    'resource.checkFail': '{reason}',
    'docs.region': 'UnicodeArtJs 开发文档',
    'docs.previewRegion': '文档详情',
    'docs.title': 'UnicodeArtJs 开发文档',
    'docs.intro': '查看 Core、CLI、Web 与 VS Code 插件的公开 API 文档入口和生成状态。',
    'docs.status.ready': '正在准备文档索引',
    'docs.status.loading': '正在载入文档索引',
    'docs.status.loaded': '已载入 {count} 个文档入口',
    'docs.status.error': '文档索引载入失败：{message}',
    'docs.entryCount': '文档入口',
    'docs.sectionCount': '文档路径',
    'docs.generatedAt': '生成时间',
    'docs.contract': '清单契约',
    'docs.noSelection': '选择一个文档入口',
    'docs.previewPlaceholder': '从左侧选择一个文档入口以查看详情。',
    'docs.package': '包',
    'docs.surface': '接口面',
    'docs.kind': '文档类型',
    'docs.check': '检查命令',
    'docs.metrics': '指标',
    'docs.openGuide': '打开文档',
    'docs.openRepo': '打开仓库',
    'docs.sections.aria': '开发者文档路径',
    'docs.sections.title': '文档路径',
    'docs.section.docCount': '{count} 个页面',
    'docs.section.docs': '包含页面',
    'docs.symbolCount': '{count} 个 API 符号',
    'docs.sourceFileCount': '源码文件',
    'docs.symbols.title': 'API 符号索引',
    'docs.symbols.empty': '暂无公开符号索引。',
    'docs.symbols.source': '源码',
    'docs.kind.hia-tsdoc': 'TSDoc 中间文档',
    'docs.kind.hia-jsdoc': 'JSDoc API 文档',
    'docs.kind.section': '文档路径',
    'docs.stability.intermediate': '中间文档',
    'docs.stability.pilot': '试点',
    'docs.stability.public': '公开',
    'docs.surface.core': 'Core 核心库',
    'docs.surface.cli': 'CLI 命令行',
    'docs.surface.web': 'Web 应用',
    'docs.surface.vscode-extension': 'VS Code 插件',
    'docs.surface.docs': '公开文档',
    'docs.metric.artifactCount': '产物',
    'docs.metric.inputCount': '输入',
    'docs.metric.nodeCount': '节点',
    'docs.metric.symbolCount': 'API 符号',
    'docs.metric.sourceFileCount': '源码文件',
    'docs.metric.requiredFiles': '文件',
    'docs.section.quickstart': 'Quickstart',
    'docs.section.quickstart.description': '安装、运行和预览的最短路径。',
    'docs.section.api-reference': 'API Reference',
    'docs.section.api-reference.description': 'Core、CLI、Web 与 VS Code 的 API 文档入口。',
    'docs.section.integration': 'Integration',
    'docs.section.integration.description': '宿主、浏览器、Web 和编辑器集成边界。',
    'docs.section.configuration': 'Configuration',
    'docs.section.configuration.description': '字体、宽字素、语言和输出环境配置。',
    'docs.section.extension': 'Extension',
    'docs.section.extension.description': 'UAEM、语义布局、UAF 和扩展作者入口。',
    'docs.section.compatibility': 'Compatibility',
    'docs.section.compatibility.description': '运行时、字体、adapter 和已知限制。',
    'docs.section.release': 'Release',
    'docs.section.release.description': '发布门禁、性能基线和运行时依赖。',
    'docs.section.contribute': 'Contribute',
    'docs.section.contribute.description': '反馈、画廊投稿和公开路线。',
    'input.imageTitle': '上传图片',
    'input.uploadText': '拖拽图片到此处',
    'input.uploadHint': '或点击选择文件',
    'input.uploadHintTouch': '移动端暂不支持拖拽',
    'input.uploadAria': '选择或拖拽图片文件',
    'input.previewAlt': '预览',
    'input.clearImage': '清除图片',
    'input.textTitle': '输入文字',
    'input.textPlaceholder': '输入要转换的文字...',
    'config.title': '参数设置',
    'config.height': '高度（行数）',
    'config.width': '宽度（列数）',
    'config.auto': '自动',
    'config.charset': '字符集',
    'charset.ascii': 'ASCII（英文 + 符号）',
    'charset.extended': '扩展字符',
    'charset.chineseSimple': '简体中文常用',
    'charset.custom': '自定义 →',
    'config.customChars': '自定义字符（从暗到亮排列）',
    'config.customCharsPlaceholder': '例如: .:-=+*#%@',
    'config.visualFont': '视觉字体（渲染用）',
    'config.visualFontHelp': '仅在文字 Banner 模式影响输入文字的采样图像，不改变预览区的字素显示。',
    'config.glyphFont': '字素字体（显示用）',
    'config.glyphFontHelp': '影响字符画预览、导出，以及字符模板的匹配形状。字体由浏览器使用本机已安装版本，缺失时会回退。',
    'config.fontStatus.available': '已检测到字体：{font}',
    'config.fontStatus.unavailable': '浏览器未确认字体“{font}”可用，结果可能已回退。',
    'config.fontStatus.generic': '当前使用通用 fallback，由浏览器决定实际字体。',
    'config.fontStatus.empty': '尚未选择字体。',
    'config.fontStatus.brave': 'Brave 或隐私保护设置可能限制字体检测；若预览不变，请确认站点字体指纹保护。',
    'config.advanced': '高级设置',
    'config.matrixSize': '矩阵大小',
    'config.ratio': '宽高比',
    'config.interpolation': '插值算法',
    'interpolation.nearest': '最近邻 (nearest)',
    'interpolation.bilinear': '双线性 (bilinear)',
    'interpolation.bicubic': '双三次 (bicubic)',
    'config.wideCharRatio': '宽字符比例',
    'config.invert': '反转颜色',
    'config.trimTrailing': '去除行尾空格',
    'config.earlyTermination': '启用早期终止优化',
    'config.fontReduce': '视觉字体内边距/收缩',
    'config.charSpace': '字距',
    'config.charSpaceHelp': '当前为配置预留项，暂不改变转换结果。',
    'config.glyphWidthProfile': '字素宽度规则（实验）',
    'config.glyphWidthHelp': '实验性：影响裱框、语义布局和输出列数；自定义正则会覆盖预设宽度规则。',
    'config.wideCharRegex': '自定义宽字素正则',
    'config.wideCharRegexPlaceholder': '例如: [\\u4e00-\\u9fff]',
    'glyphWidth.default': 'Unicode 参考宽度',
    'glyphWidth.nsimsun': '新宋体',
    'glyphWidth.sarasaMonoSc': '等距更纱黑体 SC',
    'glyphWidth.lxgwWenkaiMono': '霞鹜文楷等宽',
    'glyphWidth.custom': '自定义正则',
    'box.title': '裱框设置',
    'box.enable': '启用裱框',
    'box.style': '裱框样式',
    'box.padding': '内边距',
    'box.margin': '外边距',
    'box.titleText': '标题（可选）',
    'box.titlePlaceholder': '标题文字',
    'box.shadow': '启用阴影',
    'box.style.single': '单线 (single)',
    'box.style.double': '双线 (double)',
    'box.style.round': '圆角 (round)',
    'box.style.bold': '粗线 (bold)',
    'box.style.classic': '经典 (classic)',
    'box.style.ascii': 'ASCII (ascii)',
    'box.style.singleDouble': '外粗内细 (singleDouble)',
    'box.style.doubleSingle': '外细内粗 (doubleSingle)',
    'box.style.thick': '厚框 (thick)',
    'preview.ready': '就绪',
    'preview.waiting': '等待输入',
    'preview.generating': '正在生成...',
    'preview.placeholder': '字符画预览区域',
    'preview.uploadImage': '请上传图片',
    'preview.enterText': '请输入文字',
    'preview.failed': '生成失败',
    'preview.refresh': '刷新',
    'preview.region': '字符画预览',
    'preview.meta.empty': '宽度: -- 高度: -- 耗时: --ms',
    'preview.meta.ready': '宽度: {cols} 高度: {rows} 耗时: {duration}ms',
    'status.generating': '正在生成字符画...',
    'toast.imageLoaded': '图片已加载',
    'toast.imageOnly': '请上传图片文件',
    'toast.imageTooLarge': '图片文件过大，请选择小于10MB的图片',
    'toast.generateDone': '字符画生成完成',
    'toast.generateFailed': '生成失败: {message}',
    'toast.exportFirst': '请先生成字符画',
    'toast.exportTxt': '已导出为TXT',
    'toast.exportHtml': '已导出为HTML',
    'toast.exportPng': '已导出为PNG',
    'toast.exportPngFailed': 'PNG导出失败',
    'toast.copyDone': '已复制到剪贴板',
    'toast.copyFailed': '复制失败，请手动选择文本复制',
    'toast.resourceImported': '资源已导入编辑器',
    'toast.resourceImportBlocked': '该资源当前不可导入：{reason}',
    'toast.resourceImportFailed': '资源导入失败: {message}',
    'export.copy': '📋 复制',
    'validate.height': '高度必须大于0',
    'validate.width': '宽度必须大于0',
    'validate.matrixSize': '矩阵大小必须在2-20之间',
    'validate.ratio': '宽高比必须在1.0-3.0之间',
    'validate.wideCharRatio': '宽字符比例必须在0-10之间',
  },
  'en-US': {
    'meta.title': 'UnicodeArtJs - Free Online Unicode Art Generator',
    'meta.description': 'UnicodeArtJs is a free online Unicode art generator for converting images and text into Unicode art with charsets, fonts, boxes, and themes.',
    'language.label': 'Language',
    'theme.label': 'Theme',
    'theme.default': '🌙 Default',
    'theme.dark': '☀️ Dark',
    'theme.highContrast': '🎨 High Contrast',
    'theme.solarizedLight': '🌅 Solarized Light',
    'theme.nord': '❄️ Nord',
    'mode.image': 'Image to Art',
    'mode.text': 'Text Banner',
    'mode.editor': 'Editor',
    'mode.gallery': 'Gallery',
    'mode.resources': 'Resource Discovery',
    'mode.docs': 'Developer Docs',
    'editor.sourceRegion': 'Editor source and templates',
    'editor.previewRegion': 'Editor preview',
    'editor.title': 'Art Font and Layout Editor',
    'editor.experimental': 'Experimental',
    'editor.kind': 'Content type',
    'editor.kind.document': 'Layout document',
    'editor.kind.font': 'UAF art font',
    'editor.kind.cellcanvas': 'CellCanvas glyph art',
    'editor.preset': 'Built-in example',
    'editor.preset.documentTable': 'Header table',
    'editor.preset.documentArtFont': 'Embedded art-font banner',
    'editor.preset.fontLine': 'Line art font',
    'editor.preset.cellcanvasLineBanner': 'Line banner grid',
    'editor.preset.cellcanvasShadow': 'Shadow TextFx grid',
    'editor.loadPreset': 'Load',
    'editor.templateName': 'Template name',
    'editor.templateNamePlaceholder': 'Example: My header table',
    'editor.saveTemplate': 'Save template',
    'editor.savedTemplates': 'Local templates',
    'editor.loadTemplate': 'Load',
    'editor.deleteTemplate': 'Delete',
    'editor.fileActions': 'Import and export',
    'editor.import': 'Import JSON',
    'editor.export': 'Export JSON',
    'editor.extension': 'Extension manifest (developer)',
    'editor.extensionInspect': 'Inspect UAEM JSON',
    'editor.extensionHelp': 'Only parses the chosen manifest and evaluates Web compatibility. It does not read sibling resources, install, or execute extension code.',
    'editor.extensionReady': 'No extension manifest selected',
    'editor.extensionSummary': '{name} · {resources} declared resources · {compatible}',
    'editor.extensionCompatible': 'Web compatible',
    'editor.extensionIncompatible': 'Web incompatible: {reasons}',
    'editor.extensionError': 'Invalid manifest: {message}',
    'editor.resourceEntry': 'Studio resource entry',
    'editor.resourceEntryHelp': 'Reuses the reviewed same-origin resource manifest and only creates import proposals. It never auto-installs or executes resources; confirmed imports write to the current editor only.',
    'editor.resourceEntrySelect': 'Resource',
    'editor.resourceEntryLoad': 'Load resources',
    'editor.resourceEntryInspect': 'Inspect proposal',
    'editor.resourceEntryImport': 'Confirm import',
    'editor.resourceEntryReady': 'No Studio resource entry loaded',
    'editor.resourceEntryLoading': 'Loading and verifying resources',
    'editor.resourceEntryLoaded': '{count} resources loaded; choose one and inspect its import proposal',
    'editor.resourceEntryEmpty': 'No Studio resource is available',
    'editor.resourceEntryProposalReady': 'Import proposal ready: {status}',
    'editor.resourceEntryProposalBlocked': 'Import proposal blocked: {reason}',
    'editor.resourceEntryImported': 'Resource imported into the editor through the confirmation flow',
    'editor.resourceEntryFailed': 'Resource entry failed: {message}',
    'editor.source': 'Canonical JSON',
    'editor.sourceHelp': 'Saving and importing use Core-validated canonical JSON. The browser does not upload your content.',
    'editor.fontSample': 'Sample text',
    'editor.embedFont': 'Embed in document',
    'editor.ready': 'Ready',
    'editor.previewPlaceholder': 'Load an example or enter JSON to render a preview',
    'editor.validate': 'Validate',
    'editor.render': 'Render preview',
    'editor.copy': 'Copy preview',
    'editor.metaEmpty': 'Width: -- Height: --',
    'editor.metaReady': 'Width: {cols} Height: {rows}',
    'editor.status.valid': 'Valid · {summary}',
    'editor.status.rendered': 'Rendered',
    'editor.status.error': 'Invalid: {message}',
    'editor.status.imported': 'Imported and validated',
    'editor.status.templateSaved': 'Local template saved',
    'editor.status.templateDeleted': 'Local template deleted',
    'editor.status.templateNameRequired': 'Enter a template name first',
    'editor.status.templateSelectionRequired': 'Choose a local template',
    'editor.status.copyDone': 'Preview copied',
    'editor.status.copyFailed': 'Copy failed. Select the preview content manually.',
    'editor.status.cellSelected': 'Glyph cell selected ({x}, {y})',
    'editor.status.cellUpdated': 'Glyph cell updated',
    'editor.status.selectionApplied': 'Selection updated · {width}x{height}',
    'editor.status.selectionCopied': 'Selection copied · {width}x{height}',
    'editor.status.selectionPasted': 'Selection pasted',
    'editor.status.undoDone': 'Undone',
    'editor.status.redoDone': 'Redone',
    'editor.status.clipboardEmpty': 'No glyph-cell selection to paste',
    'editor.status.historyEmpty': 'No history operation available',
    'editor.status.specialArtImported': 'SpecialArt result imported as CellCanvas',
    'editor.status.projectionExported': 'CellCanvas projection exported: {kind}',
    'editor.status.projectSaved': 'CellCanvas internal project saved',
    'editor.status.projectLoaded': 'CellCanvas internal project loaded',
    'editor.status.pngExported': 'CellCanvas PNG projection exported',
    'editor.status.pngExportFailed': 'CellCanvas PNG export failed',
    'editor.status.connectorDrawn': 'Connector drawn · {cells} cells',
    'cellcanvas.section': 'CellCanvas single-cell editing',
    'cellcanvas.selection': 'Selection',
    'cellcanvas.connector': 'Connector',
    'cellcanvas.x': 'X',
    'cellcanvas.y': 'Y',
    'cellcanvas.fromX': 'From X',
    'cellcanvas.fromY': 'From Y',
    'cellcanvas.toX': 'To X',
    'cellcanvas.toY': 'To Y',
    'cellcanvas.route': 'Route',
    'cellcanvas.routeAuto': 'Auto',
    'cellcanvas.routeHorizontalFirst': 'Horizontal first',
    'cellcanvas.routeVerticalFirst': 'Vertical first',
    'cellcanvas.width': 'W',
    'cellcanvas.height': 'H',
    'cellcanvas.char': 'Glyph',
    'cellcanvas.fg': 'Foreground',
    'cellcanvas.bg': 'Background',
    'cellcanvas.apply': 'Apply',
    'cellcanvas.select': 'Select',
    'cellcanvas.copy': 'Copy',
    'cellcanvas.paste': 'Paste',
    'cellcanvas.undo': 'Undo',
    'cellcanvas.redo': 'Redo',
    'cellcanvas.drawConnector': 'Draw connector',
    'cellcanvas.exportTxt': 'Export TXT projection',
    'cellcanvas.exportHtml': 'Export HTML projection',
    'cellcanvas.exportPng': 'Export PNG projection',
    'cellcanvas.saveProject': 'Save internal project',
    'cellcanvas.openProject': 'Open internal project',
    'cellcanvas.help': 'Click a glyph cell in the preview grid, then adjust its content and colors here.',
    'gallery.region': 'UnicodeArtJs art gallery',
    'gallery.previewRegion': 'Artwork preview',
    'gallery.title': 'UnicodeArtJs Art Gallery',
    'gallery.intro': 'Reviewed, original static examples. The gallery does not upload, download, or execute third-party content.',
    'gallery.filters': 'Gallery filters',
    'gallery.search': 'Search',
    'gallery.searchPlaceholder': 'Filter by title, description, or tag',
    'gallery.tag': 'Tag',
    'gallery.tag.all': 'All tags',
    'gallery.clearFilters': 'Clear filters',
    'gallery.status.ready': 'Preparing the artwork index',
    'gallery.status.loading': 'Loading reviewed artworks',
    'gallery.status.loaded': '{count} reviewed artworks loaded',
    'gallery.status.empty': 'No artworks match the current filters',
    'gallery.status.error': 'Gallery load failed: {message}',
    'gallery.count': 'Showing {visible} / {total} artworks',
    'gallery.noSelection': 'Select an artwork to view details',
    'gallery.previewPlaceholder': 'Choose an artwork from the left',
    'gallery.loadingPreview': 'Rendering artwork preview',
    'gallery.previewFailed': 'Artwork preview failed: {message}',
    'gallery.reviewed': 'Reviewed',
    'gallery.author': 'Author',
    'gallery.license': 'License',
    'gallery.reviewedAt': 'Reviewed',
    'gallery.kind.semantic-document': 'Semantic layout document',
    'gallery.kind.unicode-art-font': 'Unicode art font',
    'gallery.copy': 'Copy art',
    'gallery.download': 'Download source',
    'gallery.openEditor': 'Open in editor',
    'gallery.copyDone': 'Gallery artwork copied to clipboard',
    'gallery.copyFailed': 'Copy failed. Select the preview content manually.',
    'gallery.tag.banner': 'Banner',
    'gallery.tag.font': 'Art font',
    'gallery.tag.original': 'Original',
    'gallery.tag.layout': 'Layout',
    'gallery.tag.table': 'Table',
    'gallery.tag.document': 'Document',
    'gallery.tag.box': 'Box',
    'gallery.tag.text': 'Text',
    'gallery.tag.bilingual': 'Bilingual',
    'gallery.tag.width': 'Width',
    'gallery.tag.review': 'Review',
    'resource.region': 'UnicodeArtJs resource discovery',
    'resource.detailRegion': 'Resource verification detail',
    'resource.title': 'Experimental Resource Discovery',
    'resource.intro': 'Reads the static resource manifest shipped with this site, showing hashes, signatures, and revocations. It never auto-installs, enables, or executes resources; imports require confirmation.',
    'resource.status.ready': 'Preparing the resource manifest',
    'resource.status.loading': 'Loading and verifying same-origin resources',
    'resource.status.loaded': '{verified} / {total} resources verified',
    'resource.status.importing': 'Re-verifying and importing resource',
    'resource.status.error': 'Resource discovery failed: {message}',
    'resource.resourceCount': 'Resources',
    'resource.verifiedCount': 'Verified',
    'resource.network': 'Network',
    'resource.automaticInstall': 'Automatic install',
    'resource.reviewedAt': 'Manifest reviewed',
    'resource.network.none': 'None',
    'resource.automaticInstall.false': 'Off',
    'resource.refresh': 'Re-verify',
    'resource.openDocs': 'Docs',
    'resource.noSelection': 'Select a resource for details',
    'resource.detailPlaceholder': 'Choose a resource from the left. This page displays verification data by default; editor import requires another confirmation.',
    'resource.kind.semantic-document': 'Semantic layout document',
    'resource.kind.unicode-art-font': 'Unicode art font',
    'resource.status.verified': 'Verified',
    'resource.status.failed': 'Failed',
    'resource.status.pending': 'Pending',
    'resource.id': 'Resource ID',
    'resource.kind': 'Kind',
    'resource.source': 'Path',
    'resource.license': 'License',
    'resource.size': 'Size',
    'resource.sha256': 'sha256',
    'resource.actualSha256': 'Actual sha256',
    'resource.trustStatus': 'Trust status',
    'resource.revocationStatus': 'Revocation status',
    'resource.cacheTarget': 'Cache target',
    'resource.boundary': 'Boundary',
    'resource.boundaryText': 'Same-origin read; no automatic install; no execution; hash, revocation, and maintainer signature are rechecked before import.',
    'resource.openGallery': 'View in gallery',
    'resource.importEditor': 'Import to editor after confirmation',
    'resource.importDialogTitle': 'Import verified resource',
    'resource.importDialogBody': 'This resource will be written to the current browser source-first editor workspace and replace the current editor content.',
    'resource.importConfirm': 'Import',
    'resource.importCancel': 'Cancel',
    'resource.importAllowed': 'Import allowed',
    'resource.importBlocked': 'Import blocked',
    'resource.importBlockedReason': 'Block reason',
    'resource.cacheTarget.editorWorkspace': 'Current browser editor workspace',
    'resource.trust.maintainer-signed': 'Maintainer signature verified',
    'resource.trust.unsigned-draft': 'Unsigned draft',
    'resource.trust.invalid-signature': 'Invalid signature or unsupported browser verification',
    'resource.trust.expired': 'Signature or key expired',
    'resource.trust.revoked-key': 'Signing key revoked',
    'resource.revocation.not-revoked': 'Not revoked',
    'resource.revocation.revoked-resource': 'Revoked',
    'resource.import.block.hash': 'Resource bytes failed size/sha256 verification',
    'resource.import.block.signature': 'Resource trust chain failed or this browser cannot verify it',
    'resource.import.block.revoked': 'Resource was revoked',
    'resource.import.block.artwork': 'Matching gallery entry is missing',
    'resource.import.block.unknown': 'Resource is not importable right now',
    'resource.hashPrefix': 'sha256: {hash}',
    'resource.sizeBytes': '{size} bytes',
    'resource.checkOk': 'size and sha256 match',
    'resource.checkFail': '{reason}',
    'docs.region': 'UnicodeArtJs developer documentation',
    'docs.previewRegion': 'Documentation detail',
    'docs.title': 'UnicodeArtJs Developer Docs',
    'docs.intro': 'Browse public API documentation entry points and generation status for Core, CLI, Web, and the VS Code extension.',
    'docs.status.ready': 'Preparing the documentation index',
    'docs.status.loading': 'Loading the documentation index',
    'docs.status.loaded': '{count} documentation entries loaded',
    'docs.status.error': 'Documentation index failed to load: {message}',
    'docs.entryCount': 'Entries',
    'docs.sectionCount': 'Paths',
    'docs.generatedAt': 'Generated',
    'docs.contract': 'Manifest',
    'docs.noSelection': 'Select a documentation entry',
    'docs.previewPlaceholder': 'Choose a documentation entry from the left to view details.',
    'docs.package': 'Package',
    'docs.surface': 'Surface',
    'docs.kind': 'Documentation kind',
    'docs.check': 'Check command',
    'docs.metrics': 'Metrics',
    'docs.openGuide': 'Open docs',
    'docs.openRepo': 'Open repository',
    'docs.sections.aria': 'Developer documentation paths',
    'docs.sections.title': 'Documentation paths',
    'docs.section.docCount': '{count} pages',
    'docs.section.docs': 'Included pages',
    'docs.symbolCount': '{count} API symbols',
    'docs.sourceFileCount': 'Source files',
    'docs.symbols.title': 'API symbol index',
    'docs.symbols.empty': 'No public symbol index yet.',
    'docs.symbols.source': 'Source',
    'docs.kind.hia-tsdoc': 'TSDoc intermediate docs',
    'docs.kind.hia-jsdoc': 'JSDoc API docs',
    'docs.kind.section': 'Documentation path',
    'docs.stability.intermediate': 'Intermediate',
    'docs.stability.pilot': 'Pilot',
    'docs.stability.public': 'Public',
    'docs.surface.core': 'Core library',
    'docs.surface.cli': 'CLI',
    'docs.surface.web': 'Web app',
    'docs.surface.vscode-extension': 'VS Code extension',
    'docs.surface.docs': 'Public docs',
    'docs.metric.artifactCount': 'Artifacts',
    'docs.metric.inputCount': 'Inputs',
    'docs.metric.nodeCount': 'Nodes',
    'docs.metric.symbolCount': 'API symbols',
    'docs.metric.sourceFileCount': 'Source files',
    'docs.metric.requiredFiles': 'Files',
    'docs.section.quickstart': 'Quickstart',
    'docs.section.quickstart.description': 'Shortest install, run, and preview path.',
    'docs.section.api-reference': 'API Reference',
    'docs.section.api-reference.description': 'API documentation entry points for Core, CLI, Web, and VS Code.',
    'docs.section.integration': 'Integration',
    'docs.section.integration.description': 'Host, browser, Web, and editor integration boundaries.',
    'docs.section.configuration': 'Configuration',
    'docs.section.configuration.description': 'Fonts, glyph width, language, and output target settings.',
    'docs.section.extension': 'Extension',
    'docs.section.extension.description': 'UAEM, semantic layout, UAF, and extension authoring entry points.',
    'docs.section.compatibility': 'Compatibility',
    'docs.section.compatibility.description': 'Runtime, font, adapter, and known limitation boundaries.',
    'docs.section.release': 'Release',
    'docs.section.release.description': 'Release gate, performance baseline, and runtime inventory.',
    'docs.section.contribute': 'Contribute',
    'docs.section.contribute.description': 'Support, gallery submission, and public roadmap paths.',
    'input.imageTitle': 'Upload Image',
    'input.uploadText': 'Drop an image here',
    'input.uploadHint': 'or click to choose a file',
    'input.uploadHintTouch': 'Drag and drop is not available on mobile',
    'input.uploadAria': 'Choose or drop an image file',
    'input.previewAlt': 'Preview',
    'input.clearImage': 'Clear image',
    'input.textTitle': 'Input Text',
    'input.textPlaceholder': 'Enter text to convert...',
    'config.title': 'Settings',
    'config.height': 'Height (rows)',
    'config.width': 'Width (columns)',
    'config.auto': 'Auto',
    'config.charset': 'Charset',
    'charset.ascii': 'ASCII (letters + symbols)',
    'charset.extended': 'Extended characters',
    'charset.chineseSimple': 'Simplified Chinese common chars',
    'charset.custom': 'Custom →',
    'config.customChars': 'Custom chars (dark to light)',
    'config.customCharsPlaceholder': 'Example: .:-=+*#%@',
    'config.visualFont': 'Visual font (rendering)',
    'config.visualFontHelp': 'Only affects the sampled input image in Text Banner mode; it does not change the preview glyph display.',
    'config.glyphFont': 'Glyph font (display)',
    'config.glyphFontHelp': 'Affects preview/export display and character-template matching. Fonts use locally installed browser fonts and fall back when unavailable.',
    'config.fontStatus.available': 'Detected font: {font}',
    'config.fontStatus.unavailable': 'The browser could not confirm “{font}”; output may have fallen back.',
    'config.fontStatus.generic': 'This uses a generic fallback; the browser decides the actual font.',
    'config.fontStatus.empty': 'No font selected.',
    'config.fontStatus.brave': 'Brave or privacy settings may restrict font detection. If the preview does not change, check site font fingerprinting settings.',
    'config.advanced': 'Advanced',
    'config.matrixSize': 'Matrix size',
    'config.ratio': 'Aspect ratio',
    'config.interpolation': 'Interpolation',
    'interpolation.nearest': 'Nearest',
    'interpolation.bilinear': 'Bilinear',
    'interpolation.bicubic': 'Bicubic',
    'config.wideCharRatio': 'Wide char ratio',
    'config.invert': 'Invert colors',
    'config.trimTrailing': 'Trim trailing spaces',
    'config.earlyTermination': 'Enable early termination',
    'config.fontReduce': 'Visual font padding/reduce',
    'config.charSpace': 'Character spacing',
    'config.charSpaceHelp': 'Reserved configuration only; it does not change conversion output yet.',
    'config.glyphWidthProfile': 'Glyph width rule (experimental)',
    'config.glyphWidthHelp': 'Experimental: affects box frames, semantic layout, and output column counts; a custom regex overrides preset width rules.',
    'config.wideCharRegex': 'Custom wide-glyph regex',
    'config.wideCharRegexPlaceholder': 'Example: [\\u4e00-\\u9fff]',
    'glyphWidth.default': 'Unicode reference width',
    'glyphWidth.nsimsun': 'NSimSun',
    'glyphWidth.sarasaMonoSc': 'Sarasa Mono SC',
    'glyphWidth.lxgwWenkaiMono': 'LXGW WenKai Mono',
    'glyphWidth.custom': 'Custom regex',
    'box.title': 'Box',
    'box.enable': 'Enable box',
    'box.style': 'Box style',
    'box.padding': 'Padding',
    'box.margin': 'Margin',
    'box.titleText': 'Title (optional)',
    'box.titlePlaceholder': 'Title text',
    'box.shadow': 'Enable shadow',
    'box.style.single': 'Single',
    'box.style.double': 'Double',
    'box.style.round': 'Round',
    'box.style.bold': 'Bold',
    'box.style.classic': 'Classic',
    'box.style.ascii': 'ASCII',
    'box.style.singleDouble': 'Single Double',
    'box.style.doubleSingle': 'Double Single',
    'box.style.thick': 'Thick',
    'preview.ready': 'Ready',
    'preview.waiting': 'Waiting',
    'preview.generating': 'Generating...',
    'preview.placeholder': 'Unicode art preview',
    'preview.uploadImage': 'Please upload an image',
    'preview.enterText': 'Please enter text',
    'preview.failed': 'Generation failed',
    'preview.refresh': 'Refresh',
    'preview.region': 'Unicode art preview',
    'preview.meta.empty': 'Width: -- Height: -- Time: --ms',
    'preview.meta.ready': 'Width: {cols} Height: {rows} Time: {duration}ms',
    'status.generating': 'Generating Unicode art...',
    'toast.imageLoaded': 'Image loaded',
    'toast.imageOnly': 'Please upload an image file',
    'toast.imageTooLarge': 'The image is too large. Please choose a file under 10MB.',
    'toast.generateDone': 'Unicode art generated',
    'toast.generateFailed': 'Generation failed: {message}',
    'toast.exportFirst': 'Generate Unicode art first',
    'toast.exportTxt': 'Exported as TXT',
    'toast.exportHtml': 'Exported as HTML',
    'toast.exportPng': 'Exported as PNG',
    'toast.exportPngFailed': 'PNG export failed',
    'toast.copyDone': 'Copied to clipboard',
    'toast.copyFailed': 'Copy failed. Please select and copy manually.',
    'toast.resourceImported': 'Resource imported into the editor',
    'toast.resourceImportBlocked': 'This resource cannot be imported: {reason}',
    'toast.resourceImportFailed': 'Resource import failed: {message}',
    'export.copy': '📋 Copy',
    'validate.height': 'Height must be greater than 0',
    'validate.width': 'Width must be greater than 0',
    'validate.matrixSize': 'Matrix size must be between 2 and 20',
    'validate.ratio': 'Aspect ratio must be between 1.0 and 3.0',
    'validate.wideCharRatio': 'Wide char ratio must be between 0 and 10',
  },
};

function normalizeUILocale(locale) {
  if (SUPPORTED_UI_LOCALES.includes(locale)) return locale;
  const raw = (locale || '').toLowerCase();
  return raw.startsWith('en') ? 'en-US' : 'zh-CN';
}

function detectCoreLocale() {
  const language = navigator.language || navigator.userLanguage || 'zh-CN';
  return normalizeUILocale(language);
}

async function ensureJQuery() {
  if (!$) {
    const jqueryModule = await import('jquery');
    $ = jqueryModule.default;
    window.jQuery = $;
    window.$ = $;
  }
  return $;
}

function formatMessage(template, params = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : ''
  ));
}

function translate(key, params = {}, locale = AppState.config.locale) {
  const safeLocale = normalizeUILocale(locale);
  const bundle = UI_MESSAGES[safeLocale] || UI_MESSAGES['zh-CN'];
  const template = bundle[key] || UI_MESSAGES['zh-CN'][key] || key;
  return formatMessage(template, params);
}

const AppState = {
  mode: 'image',
  imageFile: null,
  textContent: '',
  config: { ...DEFAULT_WEB_CONFIG },
  result: null,
  loading: false,
};

//#endregion

//#region 🟩 DOM缓存

const DOM = {
  modeButtons: '.mode-btn',
  converterWorkbench: '#converterWorkbench',
  editorWorkbench: '#editorWorkbench',
  galleryWorkbench: '#galleryWorkbench',
  resourceWorkbench: '#resourceWorkbench',
  docsWorkbench: '#docsWorkbench',
  imageInputPanel: '#imageInputPanel',
  textInputPanel: '#textInputPanel',
  uploadZone: '#uploadZone',
  fileInput: '#fileInput',
  imagePreview: '#imagePreview',
  previewImg: '#previewImg',
  clearImage: '#clearImage',
  textInput: '#textInput',

  heightInput: '#height',
  widthInput: '#width',
  charsetSelect: '#charset',
  customCharsGroup: '#customCharsGroup',
  customChars: '#customChars',
  fontSelect: '#font',
  fontStatus: '#fontStatus',
  glyphFont: '#glyphFont',
  glyphFontStatus: '#glyphFontStatus',
  matrixSizeInput: '#matrixSize',
  ratioInput: '#ratio',
  interpolation: '#interpolation',
  wideCharRatio: '#wideCharRatio',
  invertCheckbox: '#invert',
  trimTrailing: '#trimTrailing',
  earlyTermination: '#earlyTermination',
  fontReduce: '#fontReduce',
  charSpace: '#charSpace',
  glyphWidthProfile: '#glyphWidthProfile',
  wideCharRegexGroup: '#wideCharRegexGroup',
  wideCharRegex: '#wideCharRegex',
  outputFormat: '#outputFormat',

  boxEnabled: '#boxEnabled',
  boxConfigBody: '#boxConfigBody',
  boxStyle: '#boxStyle',
  boxPadding: '#boxPadding',
  boxMargin: '#boxMargin',
  boxTitle: '#boxTitle',
  boxShadow: '#boxShadow',

  artPreview: '#artPreview',
  previewInfo: '#previewInfo',
  metaInfo: '#metaInfo',
  refreshBtn: '#refreshBtn',

  exportTxt: '#exportTxt',
  exportHtml: '#exportHtml',
  exportPng: '#exportPng',
  copyBtn: '#copyBtn',

  themeToggle: '#themeToggle',
  themeSelect: '#themeSelect',
  languageSelect: '#languageSelect',
  loadingOverlay: '#loadingOverlay',
  toastContainer: '#toastContainer',

  editorKind: '#editorKind',
  editorPreset: '#editorPreset',
  editorLoadPreset: '#editorLoadPreset',
  editorTemplateName: '#editorTemplateName',
  editorSaveTemplate: '#editorSaveTemplate',
  editorSavedTemplate: '#editorSavedTemplate',
  editorLoadTemplate: '#editorLoadTemplate',
  editorDeleteTemplate: '#editorDeleteTemplate',
  editorImport: '#editorImport',
  editorImportFile: '#editorImportFile',
  editorExport: '#editorExport',
  editorExtensionInspect: '#editorExtensionInspect',
  editorExtensionFile: '#editorExtensionFile',
  editorExtensionStatus: '#editorExtensionStatus',
  editorResourceEntrySection: '#editorResourceEntrySection',
  editorResourceEntrySelect: '#editorResourceEntrySelect',
  editorResourceEntryLoad: '#editorResourceEntryLoad',
  editorResourceEntryInspect: '#editorResourceEntryInspect',
  editorResourceEntryImport: '#editorResourceEntryImport',
  editorResourceEntryStatus: '#editorResourceEntryStatus',
  editorResourceEntryProposal: '#editorResourceEntryProposal',
  editorSource: '#editorSource',
  editorFontOptions: '#editorFontOptions',
  editorFontSample: '#editorFontSample',
  editorEmbedFont: '#editorEmbedFont',
  editorCellCanvasOptions: '#editorCellCanvasOptions',
  editorCellCanvasX: '#editorCellCanvasX',
  editorCellCanvasY: '#editorCellCanvasY',
  editorCellCanvasChar: '#editorCellCanvasChar',
  editorCellCanvasFg: '#editorCellCanvasFg',
  editorCellCanvasBg: '#editorCellCanvasBg',
  editorCellCanvasApply: '#editorCellCanvasApply',
  editorCellCanvasSelectX: '#editorCellCanvasSelectX',
  editorCellCanvasSelectY: '#editorCellCanvasSelectY',
  editorCellCanvasSelectWidth: '#editorCellCanvasSelectWidth',
  editorCellCanvasSelectHeight: '#editorCellCanvasSelectHeight',
  editorCellCanvasSelect: '#editorCellCanvasSelect',
  editorCellCanvasCopy: '#editorCellCanvasCopy',
  editorCellCanvasPaste: '#editorCellCanvasPaste',
  editorCellCanvasUndo: '#editorCellCanvasUndo',
  editorCellCanvasRedo: '#editorCellCanvasRedo',
  editorCellCanvasLineFromX: '#editorCellCanvasLineFromX',
  editorCellCanvasLineFromY: '#editorCellCanvasLineFromY',
  editorCellCanvasLineToX: '#editorCellCanvasLineToX',
  editorCellCanvasLineToY: '#editorCellCanvasLineToY',
  editorCellCanvasLineRoute: '#editorCellCanvasLineRoute',
  editorCellCanvasDrawLine: '#editorCellCanvasDrawLine',
  editorCellCanvasExportTxt: '#editorCellCanvasExportTxt',
  editorCellCanvasExportHtml: '#editorCellCanvasExportHtml',
  editorCellCanvasExportPng: '#editorCellCanvasExportPng',
  editorCellCanvasSaveProject: '#editorCellCanvasSaveProject',
  editorCellCanvasOpenProject: '#editorCellCanvasOpenProject',
  editorCellCanvasProjectFile: '#editorCellCanvasProjectFile',
  editorStatus: '#editorStatus',
  editorFormatLabel: '#editorFormatLabel',
  editorValidate: '#editorValidate',
  editorRender: '#editorRender',
  editorPreview: '#editorPreview',
  editorMeta: '#editorMeta',
  editorCopy: '#editorCopy',

  galleryStatus: '#galleryStatus',
  gallerySearch: '#gallerySearch',
  galleryTag: '#galleryTag',
  galleryClearFilters: '#galleryClearFilters',
  galleryCount: '#galleryCount',
  galleryGrid: '#galleryGrid',
  galleryKind: '#galleryKind',
  galleryTitle: '#galleryTitle',
  galleryReview: '#galleryReview',
  galleryMetadata: '#galleryMetadata',
  galleryAuthor: '#galleryAuthor',
  galleryLicense: '#galleryLicense',
  galleryReviewedAt: '#galleryReviewedAt',
  galleryDescription: '#galleryDescription',
  galleryPreview: '#galleryPreview',
  galleryPreviewMeta: '#galleryPreviewMeta',
  galleryCopy: '#galleryCopy',
  galleryDownload: '#galleryDownload',
  galleryOpenEditor: '#galleryOpenEditor',

  resourceStatus: '#resourceStatus',
  resourceCount: '#resourceCount',
  resourceVerifiedCount: '#resourceVerifiedCount',
  resourceNetwork: '#resourceNetwork',
  resourceAutomaticInstall: '#resourceAutomaticInstall',
  resourceReviewedAt: '#resourceReviewedAt',
  resourceRefresh: '#resourceRefresh',
  resourceGrid: '#resourceGrid',
  resourceKind: '#resourceKind',
  resourceTitle: '#resourceTitle',
  resourceBadge: '#resourceBadge',
  resourceMetadata: '#resourceMetadata',
  resourceId: '#resourceId',
  resourceKindValue: '#resourceKindValue',
  resourceSource: '#resourceSource',
  resourceLicense: '#resourceLicense',
  resourceSize: '#resourceSize',
  resourceSha256: '#resourceSha256',
  resourceActualSha256: '#resourceActualSha256',
  resourceTrustStatus: '#resourceTrustStatus',
  resourceRevocationStatus: '#resourceRevocationStatus',
  resourceCacheTarget: '#resourceCacheTarget',
  resourceCheckResult: '#resourceCheckResult',
  resourceBoundary: '#resourceBoundary',
  resourceOpenGallery: '#resourceOpenGallery',
  resourceImportEditor: '#resourceImportEditor',
  resourceImportDialog: '#resourceImportDialog',
  resourceImportFacts: '#resourceImportFacts',
  resourceImportBody: '#resourceImportBody',
  resourceImportConfirm: '#resourceImportConfirm',
  resourceImportCancel: '#resourceImportCancel',

  docsStatus: '#docsStatus',
  docsEntryCount: '#docsEntryCount',
  docsSectionCount: '#docsSectionCount',
  docsGeneratedAt: '#docsGeneratedAt',
  docsManifestVersion: '#docsManifestVersion',
  docsSections: '#docsSections',
  docsGrid: '#docsGrid',
  docsKind: '#docsKind',
  docsTitle: '#docsTitle',
  docsStability: '#docsStability',
  docsMetadata: '#docsMetadata',
  docsPackage: '#docsPackage',
  docsSurface: '#docsSurface',
  docsCheckCommand: '#docsCheckCommand',
  docsDescription: '#docsDescription',
  docsMetrics: '#docsMetrics',
  docsSymbols: '#docsSymbols',
  docsGuideLink: '#docsGuideLink',
  docsRepoLink: '#docsRepoLink',
};

//#endregion

//#region 🟩 主题管理

class I18nManager {
  constructor() {
    this.currentLocale = normalizeUILocale(AppState.config.locale);
  }

  t(key, params) {
    return translate(key, params, this.currentLocale);
  }

  apply(locale) {
    this.currentLocale = normalizeUILocale(locale);
    AppState.config.locale = this.currentLocale;
    document.documentElement.lang = this.currentLocale;
    document.title = this.t('meta.title');
    $('meta[name="description"]').attr('content', this.t('meta.description'));
    $(DOM.languageSelect).val(this.currentLocale);

    $('[data-i18n]').each((_, el) => {
      const key = $(el).attr('data-i18n');
      $(el).text(this.t(key));
    });
    $('[data-i18n-placeholder]').each((_, el) => {
      const key = $(el).attr('data-i18n-placeholder');
      $(el).attr('placeholder', this.t(key));
    });
    $('[data-i18n-title]').each((_, el) => {
      const key = $(el).attr('data-i18n-title');
      $(el).attr('title', this.t(key));
    });
    $('[data-i18n-aria-label]').each((_, el) => {
      const key = $(el).attr('data-i18n-aria-label');
      $(el).attr('aria-label', this.t(key));
    });
    $('[data-i18n-alt]').each((_, el) => {
      const key = $(el).attr('data-i18n-alt');
      $(el).attr('alt', this.t(key));
    });
  }
}

/**
 * 主题系统
 * 5套预设主题，通过CSS变量切换
 */
class ThemeManager {
  constructor() {
    // 主题配置
    this.themes = [
      {
        key: 'default',
        label: '默认（现代简约）',
        icon: '🌙',
        desc: '浅色亮色调，适合日间使用',
      },
      {
        key: 'dark',
        label: '暗黑',
        icon: '☀️',
        desc: '深色护眼，适合低光环境',
      },
      {
        key: 'high-contrast',
        label: '高对比度',
        icon: '🎨',
        desc: '黑白分明，对比度最高',
      },
      {
        key: 'solarized-light',
        label: 'Solarized 浅色',
        icon: '🌅',
        desc: '温暖柔和的浅色调',
      },
      {
        key: 'nord',
        label: 'Nord 极冰',
        icon: '❄️',
        desc: '冷色调，来自Nord调色板',
      },
    ];

    this.currentTheme = DEFAULT_WEB_CONFIG.themeName;
  }

  // 获取所有主题
  getThemeList() { return this.themes; }

  // 获取主题
  getTheme(key) { return this.themes.find(t => t.key === key); }

  saveTheme(t) {
    AppState.config.themeName = t;
    // 主题与其他表单设置存入同一个配置对象，避免双键状态互相覆盖。
    localStorage.setItem(WEB_CONFIG_STORAGE_KEY, JSON.stringify(AppState.config));
    localStorage.removeItem('unicode-art-theme');
  }

  applyTheme(key) {
    if (key === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', key);
    }
    this.currentTheme = key;
    this.saveTheme(key);
    this.updateUI();
  }

  switchTheme(key) {
    if (this.getTheme(key)) {
      this.applyTheme(key);
    }
  }

  updateUI() {
    const $sel = $(DOM.themeSelect);
    if ($sel.length) $sel.val(this.currentTheme);
  }
}

//#endregion

//#region 🟩 Toast

class ToastManager {
  show(msg, type = 'info', duration = 3000) {
    const $c = $(DOM.toastContainer);
    const $t = $('<div>').addClass(`toast ${type}`).text(msg);
    $c.append($t);
    setTimeout(() => $t.fadeOut(300, () => $t.remove()), duration);
  }
  success(m) { this.show(m, 'success'); }
  error(m) { this.show(m, 'error', 5000); }
  warning(m) { this.show(m, 'warning', 4000); }
}

//#endregion

//#region 🟩 Core适配

class CoreAdapter {
  constructor() { this.core = window.UnicodeArtCore; }
  async imageToArt(file, config) {
    if (!this.core?.imageToArt) throw new Error('Core库未加载');
    return await this.core.imageToArt(file, config);
  }
  async textToArt(text, config) {
    if (!this.core?.textToArt) throw new Error('Core库未加载');
    return await this.core.textToArt(text, config);
  }
  async semanticDocumentToArt(document, config, options) {
    if (!this.core?.semanticDocumentToArt) throw new Error('Core语义文档功能未加载');
    return await this.core.semanticDocumentToArt(document, config, options);
  }
  validateSemanticDocument(document, options) {
    if (!this.core?.validateSemanticDocument) throw new Error('Core语义文档校验功能未加载');
    return this.core.validateSemanticDocument(document, options);
  }
  parseUnicodeArtFontJson(source, options) {
    if (!this.core?.parseUnicodeArtFontJson) throw new Error('Core艺术字字体功能未加载');
    return this.core.parseUnicodeArtFontJson(source, options);
  }
  parseUnicodeArtExtensionManifestJson(source, options) {
    if (!this.core?.parseUnicodeArtExtensionManifestJson) throw new Error('Core扩展清单功能未加载');
    return this.core.parseUnicodeArtExtensionManifestJson(source, options);
  }
  evaluateUnicodeArtExtensionCompatibility(manifest, host) {
    if (!this.core?.evaluateUnicodeArtExtensionCompatibility) throw new Error('Core扩展兼容性功能未加载');
    return this.core.evaluateUnicodeArtExtensionCompatibility(manifest, host);
  }
  getCoreCapabilities() {
    if (!this.core?.getCoreCapabilities) throw new Error('Core能力查询功能未加载');
    return this.core.getCoreCapabilities();
  }
  getExtensionResourceCapabilities() {
    if (!this.core?.UNICODE_ART_EXTENSION_RESOURCE_CAPABILITIES) {
      throw new Error('Core扩展资源能力未加载');
    }
    return this.core.UNICODE_ART_EXTENSION_RESOURCE_CAPABILITIES;
  }
  renderUnicodeArtFontText(font, text, options) {
    if (!this.core?.renderUnicodeArtFontText) throw new Error('Core艺术字渲染功能未加载');
    return this.core.renderUnicodeArtFontText(font, text, options);
  }
  boxText(text, options) {
    if (!this.core?.boxText) throw new Error('Core boxText未加载');
    return this.core.boxText(text, options);
  }
  getBoxStyleNames() {
    if (!this.core?.getBoxStyleNames) return ['single','double','round','bold','classic','ascii','singleDouble','doubleSingle','thick'];
    return this.core.getBoxStyleNames();
  }
  previewBoxStyle(style) {
    if (!this.core?.previewBoxStyle) return '';
    return this.core.previewBoxStyle(style);
  }
}

//#endregion

//#region 🟩 生成器

class ArtGenerator {
  constructor() { this.coreAdapter = new CoreAdapter(); }

  /**
   * 从 UI 配置构建 Core 可消费的配置对象
   */
  buildCoreConfig() {
    const cfg = AppState.config;
    const charsetType = cfg.charset === '__CUSTOM__' ? 'CUSTOM' : cfg.charset;
    // `custom` 是 Web 表单的显示状态；实际宽度由 wideCharRegex 覆盖，
    // 不能把它作为 Core profile 传入，否则会触发未知 profile 的结构化错误。
    const glyphWidthProfile = cfg.glyphWidthProfile === 'custom'
      ? 'default'
      : cfg.glyphWidthProfile || 'default';
    return {
      height: parseIntegerOr(cfg.height, 20),
      width: cfg.width ? parseIntegerOr(cfg.width, 0) : undefined,
      charset: charsetType === 'CUSTOM'
        ? { type: 'CUSTOM', customChars: cfg.customChars || ' .:-=+*#%@' }
        : { type: charsetType },
      font: cfg.font,
      visualFont: {
        family: cfg.font,
        reduce: parseIntegerOr(cfg.fontReduce, 0),
      },
      glyphFont: {
        family: cfg.glyphFont,
        widthProfile: glyphWidthProfile,
        wideCharRegex: cfg.wideCharRegex || undefined,
      },
      glyphFontFamily: cfg.glyphFont,
      glyphWidthProfile,
      wideCharRegex: cfg.wideCharRegex || undefined,
      matrixSize: parseIntegerOr(cfg.matrixSize, 6),
      ratio: parseFloat(cfg.ratio) || 2.0,
      interpolation: cfg.interpolation,
      wideCharRatio: parseFloat(cfg.wideCharRatio) || 2.0,
      invert: cfg.invert,
      trimTrailingSpaces: cfg.trimTrailing,
      enableEarlyTermination: cfg.earlyTermination !== false,
      fontReduce: parseIntegerOr(cfg.fontReduce, 0),
      charSpace: parseIntegerOr(cfg.charSpace, 1),
      locale: cfg.locale || detectCoreLocale(),
      outputFormat: 'plain', // 预览统一用plain，导出时再切换
      outputTarget: 'web',
      box: cfg.boxEnabled
        ? {
            enabled: true,
            style: cfg.boxStyle,
            padding: parseIntegerOr(cfg.boxPadding, 1),
            margin: parseIntegerOr(cfg.boxMargin, 0),
            title: cfg.boxTitle || undefined,
            shadow: cfg.boxShadow ? { enabled: true } : false,
          }
        : false,
    };
  }

  async generate() {
    const t0 = performance.now();
    try {
      const coreConfig = this.buildCoreConfig();
      let result;
      if (AppState.mode === 'image' && AppState.imageFile) {
        result = await this.coreAdapter.imageToArt(AppState.imageFile, coreConfig);
      } else if (AppState.mode === 'text' && AppState.textContent) {
        result = await this.coreAdapter.textToArt(AppState.textContent, coreConfig);
      } else {
        return null;
      }
      const duration = Math.round(performance.now() - t0);
      return { ...result, duration };
    } catch (error) {
      console.error('生成失败:', error);
      throw error;
    }
  }
}

//#endregion

//#region 🟩 艺术字与布局编辑器

/**
 * 生成项目原创 UAF 示例字体。
 *
 * 字形行不保留行尾空格，以符合 UAF v1 的可序列化约束；视觉列宽由 advance 补齐。
 */
function createEditorDemoFont() {
  return {
    format: 'unicode-art-font',
    version: 1,
    meta: {
      id: 'org.unicodeartjs.web-line-demo',
      name: 'Web Line Demo',
      authors: ['UnicodeArtJs'],
      license: { expression: 'MIT', origin: 'original' },
      creation: { method: 'human', tool: 'unicodeartjs-web-editor' },
    },
    metrics: { height: 3, defaultAdvance: 5, letterSpacing: 1, fallbackGlyph: '?' },
    glyphs: {
      A: { lines: [' /\\', '/--\\', '|  |'] },
      '?': { lines: ['???', '  ?', '  ?'] },
    },
  };
}

/** 返回每次独立创建的内置模板，避免用户编辑时意外改变示例对象。 */
function getEditorBuiltinTemplates() {
  const font = createEditorDemoFont();
  return [
    {
      id: 'document-table',
      kind: 'document',
      labelKey: 'editor.preset.documentTable',
      source: JSON.stringify({
        version: 1,
        rows: [
          {
            role: 'header',
            cells: [
              { role: 'column-header', blocks: [{ kind: 'raw-text', text: 'Name' }] },
              { role: 'column-header', blocks: [{ kind: 'raw-text', text: 'Value' }] },
            ],
          },
          {
            cells: [
              { blocks: [{ kind: 'raw-text', text: 'UnicodeArtJs' }] },
              { blocks: [{ kind: 'raw-text', text: 'Ready' }] },
            ],
          },
        ],
      }, null, 2),
    },
    {
      id: 'document-art-font',
      kind: 'document',
      labelKey: 'editor.preset.documentArtFont',
      source: JSON.stringify({
        version: 1,
        rows: [
          {
            role: 'header',
            cells: [{ blocks: [{ kind: 'raw-text', text: 'Embedded UAF' }] }],
          },
          {
            cells: [{
              blocks: [
                { kind: 'art-font-text', text: 'A?', font, display: 'block' },
                { kind: 'raw-text', text: 'Canonical JSON + shared glyph widths', display: 'block' },
              ],
            }],
          },
        ],
      }, null, 2),
    },
    {
      id: 'font-line',
      kind: 'font',
      labelKey: 'editor.preset.fontLine',
      source: JSON.stringify(font, null, 2),
    },
    ...CELL_CANVAS_PRESETS.map((preset) => ({
      id: preset.id,
      kind: 'cellcanvas',
      labelKey: preset.labelKey,
      source: JSON.stringify(createCellCanvasDraftFromPreset(preset.id), null, 2),
    })),
  ];
}

/** P3.4 的浏览器本地工作区结构。 */
function createDefaultEditorWorkspace() {
  const templates = getEditorBuiltinTemplates();
  return {
    kind: 'document',
    documentSource: templates.find((template) => template.id === 'document-table').source,
    fontSource: templates.find((template) => template.id === 'font-line').source,
    cellCanvasSource: JSON.stringify(createDefaultCellCanvasDraft(), null, 2),
    fontSample: 'A?',
  };
}

/**
 * 🟢 source-first 编辑器控制器
 *
 * 🔹 仅保存 JSON 文本与本地模板；每次校验、导入、渲染都委托 Core API。
 * 🔹 工作区可临时保留未完成 JSON，保存为模板和替换导入内容则必须先校验成功。
 */
class EditorController {
  constructor(appController) {
    this.appController = appController;
    this.workspace = this.loadWorkspace();
    this.savedTemplates = this.loadSavedTemplates();
    this.result = null;
    this.renderGeneration = 0;
    this.studioResourceEntries = [];
    this.selectedStudioResourceId = '';
    this.studioImportProposal = null;
  }

  initialize() {
    this.syncControlsFromWorkspace();
    this.refreshLocale();
    this.applyGlyphFont();
    this.renderStudioResourceEntryOptions();
    this.setStudioResourceStatus('editor.resourceEntryReady');
    this.setPreviewPlaceholder(this.t('editor.previewPlaceholder'));
  }

  bindEvents($doc) {
    $doc.on('change', DOM.editorKind, (event) => this.changeKind($(event.target).val()));
    $doc.on('click', DOM.editorLoadPreset, () => this.loadPreset());
    $doc.on('input', DOM.editorSource, (event) => this.updateCurrentSource($(event.target).val()));
    $doc.on('input', DOM.editorFontSample, (event) => {
      this.workspace.fontSample = $(event.target).val();
      this.persistWorkspace();
    });
    $doc.on('click', DOM.editorValidate, () => this.validateCurrentSource());
    $doc.on('click', DOM.editorRender, () => this.renderPreview());
    $doc.on('click', DOM.editorSaveTemplate, () => this.saveTemplate());
    $doc.on('click', DOM.editorLoadTemplate, () => this.loadSavedTemplate());
    $doc.on('click', DOM.editorDeleteTemplate, () => this.deleteSavedTemplate());
    $doc.on('click', DOM.editorImport, () => $(DOM.editorImportFile).click());
    $doc.on('change', DOM.editorImportFile, (event) => this.importFile(event));
    $doc.on('click', DOM.editorExport, () => this.exportSource());
    $doc.on('click', DOM.editorExtensionInspect, () => $(DOM.editorExtensionFile).click());
    $doc.on('change', DOM.editorExtensionFile, (event) => this.inspectExtensionManifest(event));
    $doc.on('click', DOM.editorResourceEntryLoad, () => void this.loadStudioResourceEntries(true));
    $doc.on('change', DOM.editorResourceEntrySelect, (event) => this.selectStudioResourceEntry($(event.target).val()));
    $doc.on('click', DOM.editorResourceEntryInspect, () => this.inspectStudioResourceEntry());
    $doc.on('click', DOM.editorResourceEntryImport, () => void this.confirmStudioResourceImport());
    $doc.on('click', DOM.editorEmbedFont, () => this.embedFontInDocument());
    $doc.on('click', '[data-cellcanvas-cell]', (event) => this.selectCellCanvasCell(event.currentTarget));
    $doc.on('click', DOM.editorCellCanvasApply, () => this.applyCellCanvasCellEdit());
    $doc.on('click', DOM.editorCellCanvasSelect, () => this.applyCellCanvasSelection());
    $doc.on('click', DOM.editorCellCanvasCopy, () => this.copyCellCanvasSelection());
    $doc.on('click', DOM.editorCellCanvasPaste, () => this.pasteCellCanvasClipboard());
    $doc.on('click', DOM.editorCellCanvasUndo, () => this.undoCellCanvasHistory());
    $doc.on('click', DOM.editorCellCanvasRedo, () => this.redoCellCanvasHistory());
    $doc.on('click', DOM.editorCellCanvasDrawLine, () => this.drawCellCanvasConnectorFromControls());
    $doc.on('click', DOM.editorCellCanvasExportTxt, () => this.exportCellCanvasPlainText());
    $doc.on('click', DOM.editorCellCanvasExportHtml, () => this.exportCellCanvasHtml());
    $doc.on('click', DOM.editorCellCanvasExportPng, () => void this.exportCellCanvasPng());
    $doc.on('click', DOM.editorCellCanvasSaveProject, () => this.saveCellCanvasProject());
    $doc.on('click', DOM.editorCellCanvasOpenProject, () => $(DOM.editorCellCanvasProjectFile).click());
    $doc.on('change', DOM.editorCellCanvasProjectFile, (event) => this.openCellCanvasProjectFile(event));
    $doc.on('click', DOM.editorCopy, () => this.copyPreview());
  }

  activate() {
    this.applyGlyphFont();
    if (!this.result) {
      this.setPreviewPlaceholder(this.t('editor.previewPlaceholder'));
    }
  }

  refreshLocale() {
    this.populatePresetSelect();
    this.populateSavedTemplateSelect();
    this.updateKindUi();
    this.renderStudioResourceEntryOptions();
    if (!this.result) this.setStatus('editor.ready');
  }

  applyGlyphFont() {
    $(DOM.editorPreview).css('font-family', AppState.config.glyphFont);
  }

  t(key, params = {}) {
    return this.appController.i18nManager.t(key, params);
  }

  getCoreAdapter() {
    return this.appController.artGenerator.coreAdapter;
  }

  getCurrentSource() {
    if (this.workspace.kind === 'font') return this.workspace.fontSource;
    if (this.workspace.kind === 'cellcanvas') return this.workspace.cellCanvasSource;
    return this.workspace.documentSource;
  }

  updateCurrentSource(source) {
    if (this.workspace.kind === 'font') this.workspace.fontSource = source;
    else if (this.workspace.kind === 'cellcanvas') this.workspace.cellCanvasSource = source;
    else this.workspace.documentSource = source;
    this.persistWorkspace();
  }

  changeKind(kind) {
    if (kind !== 'document' && kind !== 'font' && kind !== 'cellcanvas') return;
    this.workspace.kind = kind;
    this.persistWorkspace();
    this.syncControlsFromWorkspace();
    // 两种内容类型拥有各自的内置示例和本地模板列表，切换后立即重建选项。
    this.populatePresetSelect();
    this.populateSavedTemplateSelect();
    this.result = null;
    this.setPreviewPlaceholder(this.t('editor.previewPlaceholder'));
  }

  /**
   * 将已由同源画廊读取的 canonical JSON 交给 source-first 编辑器。
   *
   * 画廊不保留可编辑副本，也不绕过 Core 校验：作品源文件进入编辑器后仍须
   * 按通常流程校验、渲染和保存。本方法只负责明确的本地工作区交接。
   */
  openExternalSource(kind, source, sample) {
    const workspaceKind = kind === 'unicode-art-font'
      ? 'font'
      : kind === 'cellcanvas'
        ? 'cellcanvas'
        : 'document';
    if (typeof source !== 'string' || !source.trim()) return;
    this.workspace.kind = workspaceKind;
    if (workspaceKind === 'font') {
      this.workspace.fontSource = source;
      if (typeof sample === 'string' && sample) this.workspace.fontSample = sample;
    } else if (workspaceKind === 'cellcanvas') {
      this.workspace.cellCanvasSource = source;
    } else {
      this.workspace.documentSource = source;
    }
    this.persistWorkspace();
    this.syncControlsFromWorkspace();
    this.refreshLocale();
    this.result = null;
    this.setPreviewPlaceholder(this.t('editor.previewPlaceholder'));
  }

  syncControlsFromWorkspace() {
    $(DOM.editorKind).val(this.workspace.kind);
    $(DOM.editorSource).val(this.getCurrentSource());
    $(DOM.editorFontSample).val(this.workspace.fontSample);
    this.updateKindUi();
  }

  updateKindUi() {
    const isFont = this.workspace.kind === 'font';
    const isCellCanvas = this.workspace.kind === 'cellcanvas';
    $(DOM.editorFontOptions).prop('hidden', !isFont);
    $(DOM.editorCellCanvasOptions).prop('hidden', !isCellCanvas);
    $(DOM.editorCellCanvasExportTxt).prop('hidden', !isCellCanvas);
    $(DOM.editorCellCanvasExportHtml).prop('hidden', !isCellCanvas);
    $(DOM.editorCellCanvasExportPng).prop('hidden', !isCellCanvas);
    $(DOM.editorCellCanvasSaveProject).prop('hidden', !isCellCanvas);
    $(DOM.editorCellCanvasOpenProject).prop('hidden', !isCellCanvas);
    $(DOM.editorFormatLabel).text(
      isFont ? 'unicode-art-font@1' : isCellCanvas ? CELL_CANVAS_DRAFT_SCHEMA : 'semantic-document@1',
    );
    if (isCellCanvas) this.syncCellCanvasControlsFromSource();
  }

  populatePresetSelect() {
    const $select = $(DOM.editorPreset);
    const selected = $select.val();
    $select.empty();
    getEditorBuiltinTemplates()
      .filter((template) => template.kind === this.workspace.kind)
      .forEach((template) => {
        $('<option>').val(template.id).text(this.t(template.labelKey)).appendTo($select);
      });
    if (selected && $select.find(`option[value="${selected}"]`).length > 0) {
      $select.val(selected);
    }
  }

  populateSavedTemplateSelect() {
    const $select = $(DOM.editorSavedTemplate);
    const selected = $select.val();
    $select.empty();
    $('<option>').val('').text('—').appendTo($select);
    this.savedTemplates
      .filter((template) => template.kind === this.workspace.kind)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .forEach((template) => {
        $('<option>').val(template.id).text(template.name).appendTo($select);
      });
    if (selected && $select.find(`option[value="${selected}"]`).length > 0) {
      $select.val(selected);
    }
  }

  loadPreset() {
    const template = getEditorBuiltinTemplates().find((item) => item.id === $(DOM.editorPreset).val());
    if (!template) return;
    this.updateCurrentSource(template.source);
    $(DOM.editorSource).val(template.source);
    this.syncCellCanvasControlsFromSource();
    this.result = null;
    this.setPreviewPlaceholder(this.t('editor.previewPlaceholder'));
  }

  validateSource(source, kind = this.workspace.kind) {
    const adapter = this.getCoreAdapter();
    if (kind === 'font') {
      const font = adapter.parseUnicodeArtFontJson(source, { locale: AppState.config.locale });
      return {
        kind,
        value: font,
        summary: `${font.meta.name} · ${Object.keys(font.glyphs).length}`,
      };
    }

    if (kind === 'cellcanvas') {
      const draft = readCellCanvasDraftFromStudioSource(JSON.parse(source));
      const summary = validateCellCanvasDocumentDraft(draft);
      return {
        kind,
        value: draft,
        summary: `${summary.width}x${summary.height} · ${summary.cells}`,
      };
    }

    const parsed = JSON.parse(source);
    const document = adapter.validateSemanticDocument(parsed, { locale: AppState.config.locale });
    return {
      kind,
      value: document,
      summary: `${document.rows.length}`,
    };
  }

  /**
   * 从当前编辑器源码读取 CellCanvas 草稿。
   *
   * 这里统一支持 raw draft 与 internal project envelope，避免导入、渲染、
   * 编辑和导出各自散落 JSON 解析规则。
   *
   * @returns {object} 可编辑 CellCanvas 草稿。
   */
  readCurrentCellCanvasDraft() {
    return readCellCanvasDraftFromStudioSource(JSON.parse(this.workspace.cellCanvasSource));
  }

  validateCurrentSource() {
    try {
      const validated = this.validateSource(this.getCurrentSource());
      this.setStatus('editor.status.valid', { summary: validated.summary }, 'success');
      return validated;
    } catch (error) {
      this.handleEditorError(error);
      return null;
    }
  }

  async renderPreview() {
    const request = ++this.renderGeneration;
    let validated;
    try {
      validated = this.validateSource(this.getCurrentSource());
      this.setStatus('editor.status.valid', { summary: validated.summary }, 'success');
    } catch (error) {
      this.handleEditorError(error);
      return;
    }

    this.appController.showLoading(true);
    try {
      const config = this.appController.artGenerator.buildCoreConfig();
      let result;
      if (validated.kind === 'document') {
        result = await this.getCoreAdapter().semanticDocumentToArt(validated.value, config, { grid: true });
      } else if (validated.kind === 'font') {
        const rendered = this.getCoreAdapter().renderUnicodeArtFontText(
          validated.value,
          this.workspace.fontSample || '?',
          {
            glyphWidthProfile: config.glyphWidthProfile,
            wideCharRegex: config.wideCharRegex,
            locale: AppState.config.locale,
          },
        );
        const content = config.box ? this.getCoreAdapter().boxText(rendered.content, config.box) : rendered.content;
        result = { content, rows: rendered.rows, cols: rendered.cols, duration: 0 };
      } else {
        const cellMap = getActiveCellMap(validated.value);
        const content = cellCanvasDraftToPlainText(validated.value);
        result = {
          content,
          rows: cellMap.height,
          cols: cellMap.width,
          duration: 0,
          draft: validated.value,
          kind: 'cellcanvas',
        };
      }

      if (request !== this.renderGeneration) return;
      this.result = result;
      if (validated.kind === 'cellcanvas') {
        this.refreshCellCanvasDraft(validated.value);
      } else {
        $(DOM.editorPreview).text(result.content);
        $(DOM.editorMeta).text(this.t('editor.metaReady', { cols: result.cols, rows: result.rows }));
      }
      this.setStatus('editor.status.rendered', {}, 'success');
    } catch (error) {
      if (request === this.renderGeneration) this.handleEditorError(error);
    } finally {
      if (request === this.renderGeneration) this.appController.showLoading(false);
    }
  }

  /**
   * 将 CellCanvas 草稿写回工作区与源码框。
   *
   * @param {object} draft 更新后的 CellCanvas 草稿。
   */
  commitCellCanvasDraft(draft) {
    const source = JSON.stringify(draft, null, 2);
    this.workspace.cellCanvasSource = source;
    $(DOM.editorSource).val(source);
    this.persistWorkspace();
  }

  /**
   * 从当前 CellCanvas JSON 同步单格编辑控件。
   */
  syncCellCanvasControlsFromSource() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const draft = this.readCurrentCellCanvasDraft();
      validateCellCanvasDocumentDraft(draft);
      const cellMap = getActiveCellMap(draft);
      const activeCell = draft.editorSession?.activeCell ?? { x: 0, y: 0 };
      const x = Math.min(Math.max(Number(activeCell.x) || 0, 0), cellMap.width - 1);
      const y = Math.min(Math.max(Number(activeCell.y) || 0, 0), cellMap.height - 1);
      const cell = cellMap.cells.find((item) => item.x === x && item.y === y);
      const selection = draft.editorSession?.selection ?? { x, y, width: 1, height: 1 };
      const selectX = Math.min(Math.max(Number(selection.x) || 0, 0), cellMap.width - 1);
      const selectY = Math.min(Math.max(Number(selection.y) || 0, 0), cellMap.height - 1);
      const selectWidth = Math.min(Math.max(Number(selection.width) || 1, 1), cellMap.width - selectX);
      const selectHeight = Math.min(Math.max(Number(selection.height) || 1, 1), cellMap.height - selectY);
      const historyState = getCellCanvasHistoryState(draft);
      const clipboardReady = draft.editorSession?.clipboard?.kind === 'cell-rectangle';

      $(DOM.editorCellCanvasX).attr('max', String(cellMap.width - 1)).val(String(x));
      $(DOM.editorCellCanvasY).attr('max', String(cellMap.height - 1)).val(String(y));
      $(DOM.editorCellCanvasChar).val(cell?.char ?? ' ');
      $(DOM.editorCellCanvasFg).val(cell?.fg ?? '');
      $(DOM.editorCellCanvasBg).val(cell?.bg ?? '');
      $(DOM.editorCellCanvasSelectX).attr('max', String(cellMap.width - 1)).val(String(selectX));
      $(DOM.editorCellCanvasSelectY).attr('max', String(cellMap.height - 1)).val(String(selectY));
      $(DOM.editorCellCanvasSelectWidth).attr('max', String(cellMap.width - selectX)).val(String(selectWidth));
      $(DOM.editorCellCanvasSelectHeight).attr('max', String(cellMap.height - selectY)).val(String(selectHeight));
      const syncLinePointControl = (selector, max, fallback) => {
        const raw = $(selector).val();
        const number = raw === '' ? Number.NaN : Number(raw);
        const value = Number.isFinite(number) ? Math.trunc(number) : fallback;
        const clamped = Math.min(Math.max(value, 0), max);
        $(selector).attr('max', String(max)).val(String(clamped));
      };
      syncLinePointControl(DOM.editorCellCanvasLineFromX, cellMap.width - 1, selectX);
      syncLinePointControl(DOM.editorCellCanvasLineFromY, cellMap.height - 1, selectY);
      syncLinePointControl(DOM.editorCellCanvasLineToX, cellMap.width - 1, Math.min(selectX + 4, cellMap.width - 1));
      syncLinePointControl(DOM.editorCellCanvasLineToY, cellMap.height - 1, selectY);
      if (!['auto', 'horizontal-first', 'vertical-first'].includes($(DOM.editorCellCanvasLineRoute).val())) {
        $(DOM.editorCellCanvasLineRoute).val('auto');
      }
      $(DOM.editorCellCanvasPaste).prop('disabled', !clipboardReady);
      $(DOM.editorCellCanvasUndo).prop('disabled', !historyState.canUndo);
      $(DOM.editorCellCanvasRedo).prop('disabled', !historyState.canRedo);
    } catch {
      // 源 JSON 正在编辑时可能暂时无效，控件保持上一次状态即可。
    }
  }

  /**
   * 渲染固定网格 CellCanvas 预览。
   *
   * @param {object} draft CellCanvas 草稿。
   */
  renderCellCanvasPreview(draft) {
    const cellMap = getActiveCellMap(draft);
    const activeCell = draft.editorSession?.activeCell ?? { x: 0, y: 0 };
    const selection = draft.editorSession?.selection ?? { x: activeCell.x, y: activeCell.y, width: 1, height: 1 };
    const selectionX = Math.min(Math.max(Number(selection.x) || 0, 0), cellMap.width - 1);
    const selectionY = Math.min(Math.max(Number(selection.y) || 0, 0), cellMap.height - 1);
    const selectionWidth = Math.min(Math.max(Number(selection.width) || 1, 1), cellMap.width - selectionX);
    const selectionHeight = Math.min(Math.max(Number(selection.height) || 1, 1), cellMap.height - selectionY);
    const cellIndex = new Map(cellMap.cells.map((cell) => [`${cell.x},${cell.y}`, cell]));
    const $grid = $('<span>')
      .addClass('cellcanvas-grid')
      .attr('role', 'grid')
      .attr('data-cellcanvas-grid', 'true')
      .attr('data-cellcanvas-width', String(cellMap.width))
      .attr('data-cellcanvas-height', String(cellMap.height))
      .css('--cellcanvas-cols', String(cellMap.width));

    for (let y = 0; y < cellMap.height; y += 1) {
      for (let x = 0; x < cellMap.width; x += 1) {
        const cell = cellIndex.get(`${x},${y}`) ?? { char: ' ', role: 'empty' };
        const isSelected = x >= selectionX
          && x < selectionX + selectionWidth
          && y >= selectionY
          && y < selectionY + selectionHeight;
        const $cell = $('<button>')
          .addClass('cellcanvas-cell')
          .toggleClass('is-active', x === activeCell.x && y === activeCell.y)
          .toggleClass('is-selected', isSelected)
          .attr('type', 'button')
          .attr('role', 'gridcell')
          .attr('data-cellcanvas-cell', 'true')
          .attr('data-cellcanvas-x', String(x))
          .attr('data-cellcanvas-y', String(y))
          .attr('data-cellcanvas-role', cell.role ?? 'text')
          .attr('aria-label', `CellCanvas ${x}, ${y}`)
          .text(cell.char === ' ' ? '\u00a0' : cell.char);

        if (cell.fg) $cell.css('color', cell.fg);
        if (cell.bg) $cell.css('background-color', cell.bg);
        $grid.append($cell);
      }
    }

    $(DOM.editorPreview).empty().append($grid);
    this.syncCellCanvasControlsFromSource();
  }

  /**
   * 从 CellCanvas 草稿刷新预览结果、元信息和网格。
   *
   * @param {object} draft CellCanvas 草稿。
   */
  refreshCellCanvasDraft(draft) {
    const cellMap = getActiveCellMap(draft);
    this.result = {
      content: cellCanvasDraftToPlainText(draft),
      rows: cellMap.height,
      cols: cellMap.width,
      duration: 0,
      draft,
      kind: 'cellcanvas',
    };
    this.renderCellCanvasPreview(draft);
    $(DOM.editorMeta).text(this.t('editor.metaReady', { cols: cellMap.width, rows: cellMap.height }));
  }

  /**
   * 选择 CellCanvas 预览中的单个字素格。
   *
   * @param {HTMLElement} target 被点击的字素格按钮。
   */
  selectCellCanvasCell(target) {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const x = Number($(target).attr('data-cellcanvas-x'));
      const y = Number($(target).attr('data-cellcanvas-y'));
      const draft = setCellCanvasSelectionDraft(
        this.readCurrentCellCanvasDraft(),
        { x, y, width: 1, height: 1 },
      );
      this.commitCellCanvasDraft(draft);
      this.refreshCellCanvasDraft(draft);
      this.setStatus('editor.status.cellSelected', { x, y }, 'info');
    } catch (error) {
      this.handleEditorError(error);
    }
  }

  /**
   * 应用 CellCanvas 单格编辑控件中的内容。
   */
  applyCellCanvasCellEdit() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const x = Number($(DOM.editorCellCanvasX).val());
      const y = Number($(DOM.editorCellCanvasY).val());
      const draft = this.readCurrentCellCanvasDraft();
      const nextDraft = updateCellCanvasCell(draft, x, y, {
        char: $(DOM.editorCellCanvasChar).val(),
        fg: $(DOM.editorCellCanvasFg).val(),
        bg: $(DOM.editorCellCanvasBg).val(),
      });
      this.commitCellCanvasDraft(nextDraft);
      this.refreshCellCanvasDraft(nextDraft);
      this.setStatus('editor.status.cellUpdated', {}, 'success');
    } catch (error) {
      this.handleEditorError(error);
    }
  }

  /**
   * 应用矩形选区控件中的坐标。
   */
  applyCellCanvasSelection() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const draft = setCellCanvasSelectionDraft(this.readCurrentCellCanvasDraft(), {
        x: Number($(DOM.editorCellCanvasSelectX).val()),
        y: Number($(DOM.editorCellCanvasSelectY).val()),
        width: Number($(DOM.editorCellCanvasSelectWidth).val()),
        height: Number($(DOM.editorCellCanvasSelectHeight).val()),
      });
      const selection = draft.editorSession.selection;
      this.commitCellCanvasDraft(draft);
      this.refreshCellCanvasDraft(draft);
      this.setStatus('editor.status.selectionApplied', {
        width: selection.width,
        height: selection.height,
      }, 'info');
    } catch (error) {
      this.handleEditorError(error);
    }
  }

  /**
   * 根据连线控件绘制最小 box-drawing 连接器。
   */
  drawCellCanvasConnectorFromControls() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const draft = this.readCurrentCellCanvasDraft();
      const nextDraft = drawCellCanvasConnector(
        draft,
        {
          x: Number($(DOM.editorCellCanvasLineFromX).val()),
          y: Number($(DOM.editorCellCanvasLineFromY).val()),
        },
        {
          x: Number($(DOM.editorCellCanvasLineToX).val()),
          y: Number($(DOM.editorCellCanvasLineToY).val()),
        },
        {
          route: $(DOM.editorCellCanvasLineRoute).val(),
        },
      );
      const history = nextDraft.editorSession?.history;
      const entry = history?.entries?.[Math.max(0, (history?.cursor ?? 1) - 1)];
      this.commitCellCanvasDraft(nextDraft);
      this.refreshCellCanvasDraft(nextDraft);
      this.setStatus('editor.status.connectorDrawn', {
        cells: entry?.patches?.length ?? 0,
      }, 'success');
    } catch (error) {
      this.handleEditorError(error);
    }
  }

  /**
   * 复制当前 CellCanvas 选区。
   */
  copyCellCanvasSelection() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const draft = copyCellCanvasSelectionDraft(this.readCurrentCellCanvasDraft());
      const clipboard = draft.editorSession.clipboard;
      this.commitCellCanvasDraft(draft);
      this.refreshCellCanvasDraft(draft);
      this.setStatus('editor.status.selectionCopied', {
        width: clipboard.width,
        height: clipboard.height,
      }, 'success');
    } catch (error) {
      this.handleEditorError(error);
    }
  }

  /**
   * 将剪贴板内容粘贴到选区起点。
   */
  pasteCellCanvasClipboard() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const draft = this.readCurrentCellCanvasDraft();
      const selection = draft.editorSession?.selection ?? draft.editorSession?.activeCell ?? { x: 0, y: 0 };
      const nextDraft = pasteCellCanvasClipboardDraft(draft, selection.x, selection.y);
      this.commitCellCanvasDraft(nextDraft);
      this.refreshCellCanvasDraft(nextDraft);
      this.setStatus('editor.status.selectionPasted', {}, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('clipboard')) {
        this.setStatus('editor.status.clipboardEmpty', {}, 'error');
        return;
      }
      this.handleEditorError(error);
    }
  }

  /**
   * 撤销最近一次 CellCanvas 修改。
   */
  undoCellCanvasHistory() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const nextDraft = undoCellCanvasHistoryDraft(this.readCurrentCellCanvasDraft());
      this.commitCellCanvasDraft(nextDraft);
      this.refreshCellCanvasDraft(nextDraft);
      this.setStatus('editor.status.undoDone', {}, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('history')) {
        this.setStatus('editor.status.historyEmpty', {}, 'error');
        return;
      }
      this.handleEditorError(error);
    }
  }

  /**
   * 重做下一次 CellCanvas 修改。
   */
  redoCellCanvasHistory() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const nextDraft = redoCellCanvasHistoryDraft(this.readCurrentCellCanvasDraft());
      this.commitCellCanvasDraft(nextDraft);
      this.refreshCellCanvasDraft(nextDraft);
      this.setStatus('editor.status.redoDone', {}, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('history')) {
        this.setStatus('editor.status.historyEmpty', {}, 'error');
        return;
      }
      this.handleEditorError(error);
    }
  }

  saveTemplate() {
    const name = String($(DOM.editorTemplateName).val() || '').trim();
    if (!name) {
      this.setStatus('editor.status.templateNameRequired', {}, 'error');
      return;
    }
    if (!this.validateCurrentSource()) return;

    const now = Date.now();
    const existing = this.savedTemplates.find((template) => template.kind === this.workspace.kind && template.name === name);
    const template = {
      id: existing?.id || `local-${now}`,
      name,
      kind: this.workspace.kind,
      source: this.getCurrentSource(),
      updatedAt: now,
    };
    this.savedTemplates = existing
      ? this.savedTemplates.map((item) => item.id === existing.id ? template : item)
      : [...this.savedTemplates, template];
    this.persistTemplates();
    this.populateSavedTemplateSelect();
    $(DOM.editorSavedTemplate).val(template.id);
    this.setStatus('editor.status.templateSaved', {}, 'success');
  }

  loadSavedTemplate() {
    const id = $(DOM.editorSavedTemplate).val();
    const template = this.savedTemplates.find((item) => item.id === id && item.kind === this.workspace.kind);
    if (!template) {
      this.setStatus('editor.status.templateSelectionRequired', {}, 'error');
      return;
    }
    this.updateCurrentSource(template.source);
    $(DOM.editorSource).val(template.source);
    $(DOM.editorTemplateName).val(template.name);
    this.syncCellCanvasControlsFromSource();
    this.result = null;
    this.setPreviewPlaceholder(this.t('editor.previewPlaceholder'));
  }

  deleteSavedTemplate() {
    const id = $(DOM.editorSavedTemplate).val();
    if (!id) {
      this.setStatus('editor.status.templateSelectionRequired', {}, 'error');
      return;
    }
    this.savedTemplates = this.savedTemplates.filter((template) => template.id !== id);
    this.persistTemplates();
    this.populateSavedTemplateSelect();
    this.setStatus('editor.status.templateDeleted', {}, 'success');
  }

  async importFile(event) {
    const file = event.target.files?.[0];
    $(DOM.editorImportFile).val('');
    if (!file) return;

    try {
      const source = await file.text();
      const parsed = JSON.parse(source);
      const isSpecialArtResult = parsed?.schema === 'unicodeartjs-special-art-result@0'
        || parsed?.result?.schema === 'unicodeartjs-special-art-result@0';
      const isCellCanvasProject = parsed?.schema === CELL_CANVAS_PROJECT_SCHEMA
        || parsed?.schema === STUDIO_PROJECT_SCHEMA;
      const kind = parsed?.format === 'unicode-art-font'
        ? 'font'
        : parsed?.schema === CELL_CANVAS_DRAFT_SCHEMA || isSpecialArtResult || isCellCanvasProject
          ? 'cellcanvas'
          : 'document';
      const effectiveSource = isSpecialArtResult
        ? JSON.stringify(createCellCanvasDraftFromSpecialArtResult(parsed, { sourceFixture: file.name }), null, 2)
        : isCellCanvasProject
          ? JSON.stringify(readCellCanvasDraftFromStudioSource(parsed), null, 2)
          : source;
      this.validateSource(effectiveSource, kind);
      this.workspace.kind = kind;
      this.updateCurrentSource(effectiveSource);
      this.syncControlsFromWorkspace();
      this.refreshLocale();
      this.result = null;
      this.setPreviewPlaceholder(this.t('editor.previewPlaceholder'));
      this.setStatus(
        isSpecialArtResult
          ? 'editor.status.specialArtImported'
          : isCellCanvasProject
            ? 'editor.status.projectLoaded'
            : 'editor.status.imported',
        {},
        'success',
      );
    } catch (error) {
      this.handleEditorError(error);
    }
  }

  /**
   * 🟢 检查一个由用户显式选择的 UAEM 清单
   *
   * 🔹 浏览器 File API 不会因选择一个清单而自动获得其相邻目录的读取权限。
   * 🔹 因而 Web v1 只解析 manifest 并报告兼容性，资源读取仍由未来受控目录导入流程承担。
   */
  async inspectExtensionManifest(event) {
    const file = event.target.files?.[0];
    $(DOM.editorExtensionFile).val('');
    if (!file) return;

    try {
      const source = await file.text();
      const adapter = this.getCoreAdapter();
      const manifest = adapter.parseUnicodeArtExtensionManifestJson(source, {
        locale: AppState.config.locale,
      });
      const coreCapabilities = adapter.getCoreCapabilities();
      const compatibility = adapter.evaluateUnicodeArtExtensionCompatibility(manifest, {
        target: 'web',
        coreVersion: coreCapabilities.version,
        capabilities: adapter.getExtensionResourceCapabilities(),
      });
      if (compatibility.compatible) {
        this.setExtensionStatus('editor.extensionSummary', {
          name: manifest.meta.name,
          resources: manifest.resources.length,
          compatible: this.t('editor.extensionCompatible'),
        }, 'success');
        return;
      }
      const reasons = compatibility.reasons
        .map((reason) => reason.code + ': ' + reason.value)
        .join(', ');
      this.setExtensionStatus('editor.extensionIncompatible', { reasons }, 'error');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setExtensionStatus('editor.extensionError', { message }, 'error');
    }
  }

  exportSource() {
    const extension = this.workspace.kind === 'font'
      ? 'uafont.json'
      : this.workspace.kind === 'cellcanvas'
        ? 'cellcanvas-draft.json'
        : 'uadoc.json';
    const blob = new Blob([this.getCurrentSource()], { type: 'application/json;charset=utf-8' });
    this.appController.downloadBlob(blob, `unicode-art-${this.workspace.kind}.${extension}`);
  }

  embedFontInDocument() {
    let font;
    try {
      const validated = this.validateSource(this.getCurrentSource(), 'font');
      font = validated.value;
    } catch (error) {
      this.handleEditorError(error);
      return;
    }

    const document = {
      version: 1,
      rows: [{
        cells: [{
          blocks: [{
            kind: 'art-font-text',
            text: this.workspace.fontSample || '?',
            font,
            display: 'block',
          }],
        }],
      }],
    };
    this.workspace.kind = 'document';
    this.workspace.documentSource = JSON.stringify(document, null, 2);
    this.persistWorkspace();
    this.syncControlsFromWorkspace();
    this.refreshLocale();
    void this.renderPreview();
  }

  async copyPreview() {
    if (!this.result?.content) return;
    try {
      await navigator.clipboard.writeText(this.result.content);
      this.setStatus('editor.status.copyDone', {}, 'success');
    } catch {
      this.setStatus('editor.status.copyFailed', {}, 'error');
    }
  }

  /**
   * 从当前 CellCanvas 草稿导出 TXT 投影。
   */
  exportCellCanvasPlainText() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const draft = this.readCurrentCellCanvasDraft();
      const projection = cellCanvasDraftToPlainTextProjection(draft);
      const blob = new Blob([projection.content], { type: 'text/plain;charset=utf-8' });
      this.appController.downloadBlob(blob, 'unicode-art-cellcanvas.txt');
      this.setStatus('editor.status.projectionExported', { kind: 'TXT' }, 'success');
    } catch (error) {
      this.handleEditorError(error);
    }
  }

  /**
   * 从当前 CellCanvas 草稿导出 HTML 投影。
   */
  exportCellCanvasHtml() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const draft = this.readCurrentCellCanvasDraft();
      const projection = cellCanvasDraftToHtmlProjection(draft);
      const html = [
        '<!doctype html>',
        '<html lang="zh-CN">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<title>UnicodeArtJs CellCanvas</title>',
        '<style>',
        'body{margin:24px;background:#f8fafc;color:#111827;}',
        '.unicode-art-cellcanvas{font-family:monospace;white-space:pre;line-height:1.2;font-size:16px;}',
        '</style>',
        '</head>',
        '<body>',
        projection.content,
        '</body>',
        '</html>',
      ].join('\n');
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      this.appController.downloadBlob(blob, 'unicode-art-cellcanvas.html');
      this.setStatus('editor.status.projectionExported', { kind: 'HTML' }, 'success');
    } catch (error) {
      this.handleEditorError(error);
    }
  }

  /**
   * 通过共享 Canvas 2D renderer 导出 CellMap PNG 投影。
   *
   * PNG 是 presentation projection，不是 canonical 文件格式。首轮用固定
   * cell 尺寸保证导出物稳定，后续可根据 glyph profile 扩展成可配置版式。
   */
  async exportCellCanvasPng() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const draft = this.readCurrentCellCanvasDraft();
      const cellMap = getActiveCellMap(draft);
      if (document.fonts?.ready) await document.fonts.ready.catch(() => {});

      const canvas = document.createElement('canvas');
      canvas.className = 'art-export-canvas';
      renderCellMapToCanvas2D(cellMap, canvas, {
        scale: 2,
        fontSize: 18,
        cellWidth: 22,
        cellHeight: 24,
        padding: 18,
        fontFamily: AppState.config.glyphFont,
        background: '#ffffff',
        textColor: '#111827',
        effectColor: '#4a90d9',
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        this.setStatus('editor.status.pngExportFailed', {}, 'error');
        return;
      }
      this.appController.downloadBlob(blob, 'unicode-art-cellcanvas.png');
      this.setStatus('editor.status.pngExported', {}, 'success');
    } catch (error) {
      this.handleEditorError(error);
    }
  }

  /**
   * 保存 Studio project 内部项目文件候选。
   *
   * 下载名使用 `.uart-project.json`，明确这是 Studio Alpha 内部项目包络。
   * 文件仍不属于公开稳定格式，后续才会补跨宿主兼容矩阵和迁移策略。
   */
  saveCellCanvasProject() {
    if (this.workspace.kind !== 'cellcanvas') return;

    try {
      const draft = this.readCurrentCellCanvasDraft();
      let appVersion = null;
      try {
        appVersion = this.getCoreAdapter().getCoreCapabilities().version ?? null;
      } catch {
        appVersion = null;
      }
      const capsule = createStudioProjectCapsuleFromCellCanvasDraft(draft, {
        appVersion,
        surface: 'web',
        projectTitle: draft.document?.title,
      });
      const blob = new Blob([JSON.stringify(capsule, null, 2)], { type: 'application/json;charset=utf-8' });
      this.appController.downloadBlob(blob, 'unicode-art-studio.uart-project.json');
      this.setStatus('editor.status.projectSaved', {}, 'success');
    } catch (error) {
      this.handleEditorError(error);
    }
  }

  /**
   * 从用户显式选择的内部项目文件加载 CellCanvas 草稿。
   *
   * 浏览器只读取当前 file input 交给它的文件，不会读取相邻目录，也不会
   * 自动安装或解析外部资源。
   *
   * @param {Event} event 文件选择事件。
   */
  async openCellCanvasProjectFile(event) {
    const file = event.target.files?.[0];
    $(DOM.editorCellCanvasProjectFile).val('');
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const draft = readCellCanvasDraftFromStudioSource(parsed);
      const source = JSON.stringify(draft, null, 2);
      this.workspace.kind = 'cellcanvas';
      this.updateCurrentSource(source);
      this.syncControlsFromWorkspace();
      this.refreshLocale();
      this.result = null;
      this.refreshCellCanvasDraft(draft);
      this.setStatus('editor.status.projectLoaded', {}, 'success');
    } catch (error) {
      this.handleEditorError(error);
    }
  }

  setPreviewPlaceholder(text) {
    $(DOM.editorPreview).empty().append($('<code>').addClass('preview-placeholder').text(text));
    $(DOM.editorMeta).text(this.t('editor.metaEmpty'));
  }

  setStatus(key, params = {}, state = 'info') {
    $(DOM.editorStatus)
      .text(this.t(key, params))
      .attr('data-state', state);
  }

  /** 更新独立扩展清单检查状态，不改变编辑器源文件或预览状态。 */
  setExtensionStatus(key, params = {}, state = 'info') {
    $(DOM.editorExtensionStatus)
      .text(this.t(key, params))
      .attr('data-state', state);
  }

  /** 更新 Studio 资源入口状态，不改变主编辑器校验/渲染状态。 */
  setStudioResourceStatus(key, params = {}, state = 'info') {
    $(DOM.editorResourceEntryStatus)
      .text(this.t(key, params))
      .attr('data-state', state);
  }

  /**
   * 载入同源资源发现状态，并在编辑器侧生成可选资源列表。
   *
   * 这里复用 Resource Discovery 已有的 hash、签名和撤回校验；编辑器侧只展示
   * review-only proposal，不自动安装资源，也不会绕过确认导入流程。
   *
   * @param {boolean} [force=false] 是否强制重新读取同源资源清单。
   */
  async loadStudioResourceEntries(force = false) {
    this.setStudioResourceStatus('editor.resourceEntryLoading');
    $(DOM.editorResourceEntryLoad).prop('disabled', true);

    try {
      const resourceController = this.appController.resourceDiscoveryController;
      await resourceController.ensureLoaded(force);
      this.studioResourceEntries = resourceController.getResourceStates().map((item) => ({
        id: item.resource.id,
        label: resourceController.getResourceDisplayTitle(item),
        state: item.ok ? 'verified' : 'failed',
      }));
      if (!this.studioResourceEntries.some((entry) => entry.id === this.selectedStudioResourceId)) {
        this.selectedStudioResourceId = this.studioResourceEntries[0]?.id || '';
      }
      this.renderStudioResourceEntryOptions();
      if (this.studioResourceEntries.length === 0) {
        this.setStudioResourceStatus('editor.resourceEntryEmpty', {}, 'error');
        $(DOM.editorResourceEntryProposal).text('');
        return;
      }
      this.setStudioResourceStatus('editor.resourceEntryLoaded', {
        count: this.studioResourceEntries.length,
      }, 'success');
      this.inspectStudioResourceEntry();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.studioResourceEntries = [];
      this.renderStudioResourceEntryOptions();
      $(DOM.editorResourceEntryProposal).text('');
      this.setStudioResourceStatus('editor.resourceEntryFailed', { message }, 'error');
    } finally {
      $(DOM.editorResourceEntryLoad).prop('disabled', false);
    }
  }

  /** 刷新 Studio 资源入口下拉与按钮可用状态。 */
  renderStudioResourceEntryOptions() {
    const $select = $(DOM.editorResourceEntrySelect);
    const selected = this.selectedStudioResourceId || $select.val();
    $select.empty();

    if (this.studioResourceEntries.length === 0) {
      $('<option>').val('').text('—').appendTo($select);
      $select.prop('disabled', true);
      $(DOM.editorResourceEntryInspect).prop('disabled', true);
      $(DOM.editorResourceEntryImport).prop('disabled', true);
      return;
    }

    this.studioResourceEntries.forEach((entry) => {
      $('<option>')
        .val(entry.id)
        .text(`${entry.label} · ${entry.id}`)
        .appendTo($select);
    });
    if (selected && this.studioResourceEntries.some((entry) => entry.id === selected)) {
      this.selectedStudioResourceId = String(selected);
      $select.val(selected);
    } else {
      this.selectedStudioResourceId = this.studioResourceEntries[0].id;
      $select.val(this.selectedStudioResourceId);
    }
    $select.prop('disabled', false);
    $(DOM.editorResourceEntryInspect).prop('disabled', false);
    $(DOM.editorResourceEntryImport).prop('disabled', this.studioImportProposal?.status !== 'confirmation-pending');
  }

  /** 切换 Studio 资源入口当前选中项。 */
  selectStudioResourceEntry(id) {
    this.selectedStudioResourceId = String(id || '');
    this.studioImportProposal = null;
    $(DOM.editorResourceEntryProposal).text('');
    $(DOM.editorResourceEntryImport).prop('disabled', true);
    this.inspectStudioResourceEntry();
  }

  /** 获取当前选中的已验证资源状态。 */
  getSelectedStudioResourceItem() {
    return this.appController.resourceDiscoveryController.getResourceState(this.selectedStudioResourceId);
  }

  /**
   * 生成并展示当前资源的导入提案。
   *
   * 提案只是 preview，不写工作区；确认导入仍会调用 Resource Discovery 的二次确认。
   */
  inspectStudioResourceEntry() {
    const item = this.getSelectedStudioResourceItem();
    if (!item) {
      this.studioImportProposal = null;
      $(DOM.editorResourceEntryProposal).text('');
      $(DOM.editorResourceEntryImport).prop('disabled', true);
      this.setStudioResourceStatus('editor.resourceEntryReady');
      return;
    }

    const entry = createStudioResourceEntryFromDiscoveryState(item, {
      title: this.appController.resourceDiscoveryController.getResourceDisplayTitle(item),
    });
    const proposal = createStudioImportProposalFromResourceEntry(entry);
    this.studioImportProposal = proposal;
    $(DOM.editorResourceEntryProposal).text(formatStudioImportProposalSummary(entry, proposal));
    $(DOM.editorResourceEntryImport).prop('disabled', proposal.status !== 'confirmation-pending');

    if (proposal.status === 'confirmation-pending') {
      this.setStudioResourceStatus('editor.resourceEntryProposalReady', { status: proposal.status }, 'success');
    } else {
      const reason = this.appController.resourceDiscoveryController.formatImportBlockReason(item);
      this.setStudioResourceStatus('editor.resourceEntryProposalBlocked', { reason }, 'error');
    }
  }

  /** 通过现有资源发现确认流导入当前 proposal 对应资源。 */
  async confirmStudioResourceImport() {
    const item = this.getSelectedStudioResourceItem();
    if (!item) return;
    if (!this.studioImportProposal) this.inspectStudioResourceEntry();
    if (this.studioImportProposal?.status !== 'confirmation-pending') {
      const reason = this.appController.resourceDiscoveryController.formatImportBlockReason(item);
      this.setStudioResourceStatus('editor.resourceEntryProposalBlocked', { reason }, 'error');
      return;
    }

    const imported = await this.appController.resourceDiscoveryController.importResourceItemToEditor(item);
    if (imported) {
      this.setStudioResourceStatus('editor.resourceEntryImported', {}, 'success');
    }
  }

  handleEditorError(error) {
    const message = error instanceof Error ? error.message : String(error);
    this.setStatus('editor.status.error', { message }, 'error');
    this.setPreviewPlaceholder(this.t('editor.previewPlaceholder'));
  }

  loadWorkspace() {
    const fallback = createDefaultEditorWorkspace();
    try {
      const stored = JSON.parse(localStorage.getItem(EDITOR_WORKSPACE_STORAGE_KEY) || 'null');
      if (!stored || typeof stored !== 'object') return fallback;
      const kind = ['document', 'font', 'cellcanvas'].includes(stored.kind) ? stored.kind : 'document';
      return {
        kind,
        documentSource: typeof stored.documentSource === 'string' ? stored.documentSource : fallback.documentSource,
        fontSource: typeof stored.fontSource === 'string' ? stored.fontSource : fallback.fontSource,
        cellCanvasSource: typeof stored.cellCanvasSource === 'string'
          ? stored.cellCanvasSource
          : fallback.cellCanvasSource,
        fontSample: typeof stored.fontSample === 'string' ? stored.fontSample : fallback.fontSample,
      };
    } catch {
      return fallback;
    }
  }

  loadSavedTemplates() {
    try {
      const stored = JSON.parse(localStorage.getItem(EDITOR_TEMPLATE_STORAGE_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      return stored.filter((template) => (
        template
        && (template.kind === 'document' || template.kind === 'font' || template.kind === 'cellcanvas')
        && typeof template.id === 'string'
        && typeof template.name === 'string'
        && typeof template.source === 'string'
        && Number.isFinite(template.updatedAt)
      ));
    } catch {
      return [];
    }
  }

  persistWorkspace() {
    localStorage.setItem(EDITOR_WORKSPACE_STORAGE_KEY, JSON.stringify(this.workspace));
  }

  persistTemplates() {
    localStorage.setItem(EDITOR_TEMPLATE_STORAGE_KEY, JSON.stringify(this.savedTemplates));
  }
}

//#endregion

//#region 🟩 静态作品画廊

/**
 * 🟢 只读静态作品画廊控制器
 *
 * 🔹 画廊索引和资源始终来自当前站点的 `public/gallery` 静态目录。
 * 🔹 每份资源都会先经画廊索引路径校验，再经 Core 的 UAF/语义文档校验。
 * 🔹 当前版本不支持上传、远程 URL、账户、评论或任何可执行扩展。
 */
class GalleryController {
  constructor(appController) {
    this.appController = appController;
    this.index = null;
    this.selectedArtwork = null;
    this.selectedSource = '';
    this.selectedResult = null;
    this.loadGeneration = 0;
  }

  bindEvents($doc) {
    $doc.on('input', DOM.gallerySearch, () => this.renderGrid());
    $doc.on('change', DOM.galleryTag, () => this.renderGrid());
    $doc.on('click', DOM.galleryClearFilters, () => this.clearFilters());
    $doc.on('click', '[data-gallery-artwork-id]', (event) => {
      const id = String($(event.currentTarget).attr('data-gallery-artwork-id') || '');
      void this.selectArtwork(id);
    });
    $doc.on('click', DOM.galleryCopy, () => void this.copySelectedArtwork());
    $doc.on('click', DOM.galleryDownload, () => this.downloadSelectedArtwork());
    $doc.on('click', DOM.galleryOpenEditor, () => this.openSelectedArtworkInEditor());
  }

  async activate() {
    this.applyGlyphFont();
    await this.ensureLoaded();
  }

  refreshLocale() {
    if (!this.index) {
      this.setStatus('gallery.status.ready');
      return;
    }
    this.populateTagOptions();
    this.renderGrid();
    if (this.selectedArtwork) this.renderSelectedArtwork();
  }

  applyGlyphFont() {
    $(DOM.galleryPreview).css('font-family', AppState.config.glyphFont);
  }

  t(key, params = {}) {
    return this.appController.i18nManager.t(key, params);
  }

  getCoreAdapter() {
    return this.appController.artGenerator.coreAdapter;
  }

  async ensureLoaded() {
    if (this.index) {
      this.populateTagOptions();
      this.renderGrid();
      if (!this.selectedArtwork && this.index.artworks.length > 0) {
        await this.selectArtwork(this.index.artworks[0].id);
      }
      return;
    }

    this.setStatus('gallery.status.loading');
    try {
      const response = await fetch(new URL('./gallery/index.json', window.location.href), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.index = parseUnicodeArtGalleryIndex(await response.text());
      this.populateTagOptions();
      this.renderGrid();
      this.setStatus('gallery.status.loaded', { count: this.index.artworks.length }, 'success');
      if (this.index.artworks.length > 0) await this.selectArtwork(this.index.artworks[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setStatus('gallery.status.error', { message }, 'error');
      this.setInspectorPlaceholder('gallery.previewFailed', { message });
    }
  }

  getAllTags() {
    if (!this.index) return [];
    return [...new Set(this.index.artworks.flatMap((artwork) => artwork.tags))].sort();
  }

  populateTagOptions() {
    const $select = $(DOM.galleryTag);
    const previousValue = $select.val();
    $select.empty();
    $('<option>').val('').text(this.t('gallery.tag.all')).appendTo($select);
    this.getAllTags().forEach((tag) => {
      const translated = this.t(`gallery.tag.${tag}`);
      $('<option>').val(tag).text(translated === `gallery.tag.${tag}` ? tag : translated).appendTo($select);
    });
    if (previousValue && $select.find(`option[value="${previousValue}"]`).length > 0) {
      $select.val(previousValue);
    }
  }

  getFilteredArtworks() {
    if (!this.index) return [];
    const search = String($(DOM.gallerySearch).val() || '').trim().toLocaleLowerCase();
    const tag = String($(DOM.galleryTag).val() || '');
    return this.index.artworks.filter((artwork) => {
      if (tag && !artwork.tags.includes(tag)) return false;
      if (!search) return true;
      const searchable = [
        getGalleryLocalizedText(artwork.title, AppState.config.locale),
        getGalleryLocalizedText(artwork.description, AppState.config.locale),
        artwork.author,
        ...artwork.tags,
      ].join(' ').toLocaleLowerCase();
      return searchable.includes(search);
    });
  }

  renderGrid() {
    const $grid = $(DOM.galleryGrid);
    $grid.empty();
    if (!this.index) return;

    const artworks = this.getFilteredArtworks();
    $(DOM.galleryCount).text(this.t('gallery.count', {
      visible: artworks.length,
      total: this.index.artworks.length,
    }));

    if (artworks.length === 0) {
      $('<p>').addClass('gallery-empty').text(this.t('gallery.status.empty')).appendTo($grid);
      return;
    }

    artworks.forEach((artwork) => {
      const isSelected = artwork.id === this.selectedArtwork?.id;
      const $button = $('<button>')
        .attr({
          type: 'button',
          'data-gallery-artwork-id': artwork.id,
          'aria-pressed': String(isSelected),
        })
        .addClass('gallery-artwork-card')
        .toggleClass('selected', isSelected);

      $('<span>')
        .addClass('gallery-artwork-kind')
        .text(this.t(`gallery.kind.${artwork.kind}`))
        .appendTo($button);
      $('<strong>')
        .addClass('gallery-artwork-title')
        .text(getGalleryLocalizedText(artwork.title, AppState.config.locale))
        .appendTo($button);
      $('<span>')
        .addClass('gallery-artwork-description')
        .text(getGalleryLocalizedText(artwork.description, AppState.config.locale))
        .appendTo($button);

      const $tags = $('<span>').addClass('gallery-artwork-tags');
      artwork.tags.forEach((tag) => {
        const label = this.t(`gallery.tag.${tag}`);
        $('<span>')
          .addClass('gallery-tag')
          .text(label === `gallery.tag.${tag}` ? tag : label)
          .appendTo($tags);
      });
      $tags.appendTo($button);
      $('<article>').attr('role', 'listitem').append($button).appendTo($grid);
    });
  }

  clearFilters() {
    $(DOM.gallerySearch).val('');
    $(DOM.galleryTag).val('');
    this.renderGrid();
  }

  async selectArtwork(id) {
    const artwork = this.index?.artworks.find((item) => item.id === id);
    if (!artwork) return;

    const request = ++this.loadGeneration;
    this.selectedArtwork = artwork;
    this.selectedSource = '';
    this.selectedResult = null;
    this.renderGrid();
    this.setInspectorLoading(artwork);

    try {
      const assetUrl = resolveUnicodeArtGalleryArtworkUrl(artwork.source);
      const response = await fetch(assetUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const source = await response.text();
      const adapter = this.getCoreAdapter();
      const config = { ...this.appController.artGenerator.buildCoreConfig(), box: false };
      let result;

      if (artwork.kind === 'semantic-document') {
        const document = adapter.validateSemanticDocument(JSON.parse(source), { locale: AppState.config.locale });
        result = await adapter.semanticDocumentToArt(document, config, { grid: true });
      } else {
        const font = adapter.parseUnicodeArtFontJson(source, { locale: AppState.config.locale });
        const rendered = adapter.renderUnicodeArtFontText(font, artwork.sample, {
          glyphWidthProfile: config.glyphWidthProfile,
          wideCharRegex: config.wideCharRegex,
          locale: AppState.config.locale,
        });
        result = { content: rendered.content, rows: rendered.rows, cols: rendered.cols };
      }

      if (request !== this.loadGeneration) return;
      this.selectedSource = source;
      this.selectedResult = result;
      this.renderSelectedArtwork();
    } catch (error) {
      if (request !== this.loadGeneration) return;
      const message = error instanceof Error ? error.message : String(error);
      this.setInspectorPlaceholder('gallery.previewFailed', { message });
      $(DOM.galleryTitle).text(getGalleryLocalizedText(artwork.title, AppState.config.locale));
      $(DOM.galleryDescription).text(getGalleryLocalizedText(artwork.description, AppState.config.locale));
      this.setActionAvailability(false);
    }
  }

  setInspectorLoading(artwork) {
    $(DOM.galleryKind).text(this.t(`gallery.kind.${artwork.kind}`));
    $(DOM.galleryTitle).text(getGalleryLocalizedText(artwork.title, AppState.config.locale));
    $(DOM.galleryDescription).text(getGalleryLocalizedText(artwork.description, AppState.config.locale));
    $(DOM.galleryMetadata).prop('hidden', true);
    $(DOM.galleryReview).prop('hidden', true);
    $(DOM.galleryPreview)
      .empty()
      .append($('<code>').addClass('preview-placeholder').text(this.t('gallery.loadingPreview')));
    $(DOM.galleryPreviewMeta).text('');
    this.setActionAvailability(false);
  }

  renderSelectedArtwork() {
    const artwork = this.selectedArtwork;
    const result = this.selectedResult;
    if (!artwork || !result) return;

    $(DOM.galleryKind).text(this.t(`gallery.kind.${artwork.kind}`));
    $(DOM.galleryTitle).text(getGalleryLocalizedText(artwork.title, AppState.config.locale));
    $(DOM.galleryDescription).text(getGalleryLocalizedText(artwork.description, AppState.config.locale));
    $(DOM.galleryAuthor).text(artwork.author);
    $(DOM.galleryLicense).text(artwork.license.expression);
    $(DOM.galleryReviewedAt).text(artwork.reviewedAt);
    $(DOM.galleryMetadata).prop('hidden', false);
    $(DOM.galleryReview).prop('hidden', false);
    $(DOM.galleryPreview).text(result.content);
    $(DOM.galleryPreviewMeta).text(`${result.cols} × ${result.rows}`);
    this.setActionAvailability(true);
  }

  setInspectorPlaceholder(key, params = {}) {
    $(DOM.galleryPreview)
      .empty()
      .append($('<code>').addClass('preview-placeholder').text(this.t(key, params)));
    $(DOM.galleryPreviewMeta).text('');
    $(DOM.galleryMetadata).prop('hidden', true);
    $(DOM.galleryReview).prop('hidden', true);
    this.setActionAvailability(false);
  }

  setActionAvailability(enabled) {
    $(DOM.galleryCopy).prop('disabled', !enabled);
    $(DOM.galleryDownload).prop('disabled', !enabled);
    $(DOM.galleryOpenEditor).prop('disabled', !enabled);
  }

  setStatus(key, params = {}, state = 'info') {
    $(DOM.galleryStatus)
      .text(this.t(key, params))
      .attr('data-state', state);
  }

  async copySelectedArtwork() {
    if (!this.selectedResult?.content) return;
    try {
      await navigator.clipboard.writeText(this.selectedResult.content);
      this.appController.toastManager.success(this.t('gallery.copyDone'));
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = this.selectedResult.content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (copied) this.appController.toastManager.success(this.t('gallery.copyDone'));
      else this.appController.toastManager.error(this.t('gallery.copyFailed'));
    }
  }

  downloadSelectedArtwork() {
    if (!this.selectedArtwork || !this.selectedSource) return;
    const filename = this.selectedArtwork.source.split('/').at(-1) || 'unicode-art-artwork.json';
    const blob = new Blob([this.selectedSource], { type: 'application/json;charset=utf-8' });
    this.appController.downloadBlob(blob, filename);
  }

  openSelectedArtworkInEditor() {
    if (!this.selectedArtwork || !this.selectedSource) return;
    this.appController.openGalleryArtworkInEditor(this.selectedArtwork, this.selectedSource);
  }
}

//#endregion

//#region 🟩 实验性资源发现

/**
 * 🟢 Web 资源发现与确认导入控制器
 *
 * 🔹 只读取当前站点随同发布的 `gallery/` 静态 sidecar 与资源。
 * 🔹 先校验 manifest、lock、revocations、签名，再校验单个资源字节。
 * 🔹 页面不会自动安装或执行资源；导入编辑器必须由用户显式确认。
 */
class ResourceDiscoveryController {
  constructor(appController) {
    this.appController = appController;
    this.manifest = null;
    this.galleryIndex = null;
    this.trustSummary = null;
    this.revocations = null;
    this.resourceStates = [];
    this.selectedResourceId = '';
    this.statusState = 'info';
    this.loadGeneration = 0;
    this.resourceSourceDecoder = new TextDecoder('utf-8', { fatal: false });
  }

  bindEvents($doc) {
    $doc.on('click', DOM.resourceRefresh, () => void this.ensureLoaded(true));
    $doc.on('click', '[data-resource-id]', (event) => {
      const id = String($(event.currentTarget).attr('data-resource-id') || '');
      this.selectResource(id);
    });
    $doc.on('click', DOM.resourceOpenGallery, () => void this.openSelectedResourceInGallery());
    $doc.on('click', DOM.resourceImportEditor, () => void this.importSelectedResourceToEditor());
  }

  async activate() {
    await this.ensureLoaded();
  }

  refreshLocale() {
    if (!this.manifest) {
      this.setStatus('resource.status.ready');
      this.setInspectorPlaceholder();
      return;
    }
    this.renderSummary();
    this.renderGrid();
    this.renderSelectedResource();
    this.updateLoadedStatus();
  }

  t(key, params = {}) {
    return this.appController.i18nManager.t(key, params);
  }

  /** 获取当前资源状态副本，供 Editor 资源入口只读展示。 */
  getResourceStates() {
    return [...this.resourceStates];
  }

  /** 按资源 ID 获取同源资源状态。 */
  getResourceState(id) {
    return this.resourceStates.find((entry) => entry.resource.id === id) || null;
  }

  /** 获取资源在当前 UI 语言下的展示标题。 */
  getResourceDisplayTitle(item) {
    return item?.artwork
      ? getGalleryLocalizedText(item.artwork.title, AppState.config.locale)
      : item?.resource?.id || '';
  }

  async ensureLoaded(force = false) {
    if (this.manifest && !force) {
      this.renderSummary();
      this.renderGrid();
      if (!this.selectedResourceId && this.resourceStates.length > 0) {
        this.selectResource(this.resourceStates[0].resource.id);
      } else {
        this.renderSelectedResource();
      }
      this.updateLoadedStatus();
      return;
    }

    const request = ++this.loadGeneration;
    this.setStatus('resource.status.loading');
    this.setInspectorPlaceholder();
    $(DOM.resourceRefresh).prop('disabled', true);

    try {
      const state = await this.loadDiscoveryState();
      if (request !== this.loadGeneration) return;
      this.manifest = state.manifest;
      this.galleryIndex = state.galleryIndex;
      this.trustSummary = state.trustSummary;
      this.revocations = state.revocations;
      this.resourceStates = state.resourceStates;
      if (!this.resourceStates.some((item) => item.resource.id === this.selectedResourceId)) {
        this.selectedResourceId = this.resourceStates[0]?.resource.id || '';
      }
      this.renderSummary();
      this.renderGrid();
      this.renderSelectedResource();
      this.updateLoadedStatus();
    } catch (error) {
      if (request !== this.loadGeneration) return;
      const message = error instanceof Error ? error.message : String(error);
      this.manifest = null;
      this.galleryIndex = null;
      this.trustSummary = null;
      this.revocations = null;
      this.resourceStates = [];
      this.setStatus('resource.status.error', { message }, 'error');
      this.renderSummary();
      this.renderGrid();
      this.setInspectorPlaceholder(message);
    } finally {
      if (request === this.loadGeneration) $(DOM.resourceRefresh).prop('disabled', false);
    }
  }

  async loadDiscoveryState() {
    const manifestFile = await this.fetchDiscoveryFile('resource-manifest.json');
    const manifest = parseUnicodeArtResourceManifest(manifestFile.text);

    const [
      indexFile,
      lockFile,
      revocationsFile,
      signatureFile,
    ] = await Promise.all([
      this.fetchDiscoveryFile(manifest.index),
      this.fetchDiscoveryFile('resource-lock.json'),
      this.fetchDiscoveryFile('resource-revocations.json'),
      this.fetchDiscoveryFile('resource-signature.json'),
    ]);

    const galleryIndex = parseUnicodeArtGalleryIndex(indexFile.text);
    matchResourceManifestWithGallery(manifest, galleryIndex);
    const lock = parseUnicodeArtResourceLock(lockFile.text);
    const revocations = parseUnicodeArtResourceRevocations(revocationsFile.text);
    const signatureEnvelope = parseUnicodeArtResourceSignature(signatureFile.text);
    const trustSummary = await verifyUnicodeArtResourceTrust({
      manifest,
      lock,
      revocations,
      signatureEnvelope,
      manifestBytes: manifestFile.bytes,
      lockBytes: lockFile.bytes,
      revocationsBytes: revocationsFile.bytes,
    });

    const artworkMap = new Map(galleryIndex.artworks.map((artwork) => [artwork.id, artwork]));
    const resourceStates = await Promise.all(manifest.resources.map(async (resource) => {
      const artwork = artworkMap.get(resource.id);
      const revocation = getUnicodeArtResourceRevocationStatus(revocations, resource.id);
      try {
        const resourceFile = await this.fetchDiscoveryFile(resource.source);
        const verification = await verifyUnicodeArtResourceBytes(resource, resourceFile.bytes);
        if (!verification.ok) {
          const reason = [
            verification.sizeOk ? '' : 'size mismatch',
            verification.sha256Ok ? '' : 'sha256 mismatch',
          ].filter(Boolean).join(', ');
          throw new Error(reason || 'verification failed');
        }
        return Object.freeze({
          resource,
          artwork,
          verification,
          trustStatus: trustSummary.status,
          revocation,
          importAllowed: Boolean(trustSummary.importAllowed && !revocation.revoked && artwork),
          ok: true,
          error: '',
        });
      } catch (error) {
        return Object.freeze({
          resource,
          artwork,
          verification: null,
          trustStatus: trustSummary.status,
          revocation,
          importAllowed: false,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }));

    return Object.freeze({
      manifest,
      galleryIndex,
      trustSummary,
      revocations,
      resourceStates: Object.freeze(resourceStates),
    });
  }

  async fetchDiscoveryFile(relativePath) {
    const url = resolveUnicodeArtResourceDiscoveryUrl(relativePath);
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${relativePath}`);
    const bytes = await response.arrayBuffer();
    return Object.freeze({
      bytes,
      text: this.resourceSourceDecoder.decode(bytes),
    });
  }

  renderSummary() {
    const total = this.manifest?.resources.length || 0;
    const verified = this.resourceStates.filter((item) => item.ok).length;
    $(DOM.resourceCount).text(total ? String(total) : '--');
    $(DOM.resourceVerifiedCount).text(total ? String(verified) : '--');
    $(DOM.resourceNetwork).text(this.manifest ? this.formatNetwork(this.manifest.network) : '--');
    $(DOM.resourceAutomaticInstall).text(this.manifest ? this.formatAutomaticInstall(this.manifest.automaticInstall) : '--');
    $(DOM.resourceReviewedAt).text(this.manifest?.reviewedAt || '--');
  }

  renderGrid() {
    const $grid = $(DOM.resourceGrid);
    $grid.empty();
    this.resourceStates.forEach((item) => {
      const { resource, artwork } = item;
      const isSelected = resource.id === this.selectedResourceId;
      const $button = $('<button>')
        .attr({
          type: 'button',
          'data-resource-id': resource.id,
          'data-state': item.ok ? 'verified' : 'failed',
          'aria-pressed': String(isSelected),
        })
        .addClass('resource-card')
        .toggleClass('selected', isSelected);

      $('<span>')
        .addClass('resource-card-kind')
        .text(this.t(`resource.kind.${resource.kind}`))
        .appendTo($button);
      $('<strong>')
        .addClass('resource-card-title')
        .text(artwork ? getGalleryLocalizedText(artwork.title, AppState.config.locale) : resource.id)
        .appendTo($button);
      $('<span>')
        .addClass('resource-card-id')
        .text(resource.id)
        .appendTo($button);
      $('<span>')
        .addClass('resource-card-hash')
        .text(this.t('resource.hashPrefix', { hash: this.shortHash(resource.sha256) }))
        .appendTo($button);
      $('<span>')
        .addClass('resource-card-status')
        .text(this.t(item.ok ? 'resource.status.verified' : 'resource.status.failed'))
        .appendTo($button);

      $('<article>').attr('role', 'listitem').append($button).appendTo($grid);
    });
  }

  selectResource(id) {
    if (!this.resourceStates.some((item) => item.resource.id === id)) return;
    this.selectedResourceId = id;
    this.renderGrid();
    this.renderSelectedResource();
  }

  renderSelectedResource() {
    const item = this.resourceStates.find((entry) => entry.resource.id === this.selectedResourceId);
    if (!item) {
      this.setInspectorPlaceholder();
      return;
    }

    const { resource, artwork, verification } = item;
    $(DOM.resourceKind).text(this.t(`resource.kind.${resource.kind}`));
    $(DOM.resourceTitle).text(artwork ? getGalleryLocalizedText(artwork.title, AppState.config.locale) : resource.id);
    $(DOM.resourceBadge)
      .text(this.t(item.ok ? 'resource.status.verified' : 'resource.status.failed'))
      .attr('data-state', item.ok ? 'verified' : 'failed');
    $(DOM.resourceId).text(resource.id);
    $(DOM.resourceKindValue).text(this.t(`resource.kind.${resource.kind}`));
    $(DOM.resourceSource).text(resource.source);
    $(DOM.resourceLicense).text(`${resource.license.expression} · ${resource.license.origin}`);
    $(DOM.resourceSize).text(this.t('resource.sizeBytes', { size: resource.size }));
    $(DOM.resourceSha256).text(resource.sha256);
    $(DOM.resourceActualSha256).text(verification?.actualSha256 || '--');
    $(DOM.resourceTrustStatus).text(this.formatTrustStatus(item.trustStatus));
    $(DOM.resourceRevocationStatus).text(this.formatRevocationStatus(item.revocation));
    $(DOM.resourceCacheTarget).text(this.t('resource.cacheTarget.editorWorkspace'));
    $(DOM.resourceBoundary).text(this.t('resource.boundaryText'));
    $(DOM.resourceMetadata).prop('hidden', false);
    $(DOM.resourceCheckResult).text(this.formatCheckResult(item));
    $(DOM.resourceOpenGallery).prop('disabled', !artwork);
    $(DOM.resourceImportEditor).prop('disabled', !this.canImportResource(item));
  }

  setInspectorPlaceholder(message = '') {
    $(DOM.resourceKind).text('');
    $(DOM.resourceTitle).text(this.t('resource.noSelection'));
    $(DOM.resourceBadge)
      .text(this.t('resource.status.pending'))
      .attr('data-state', 'pending');
    $(DOM.resourceMetadata).prop('hidden', true);
    $(DOM.resourceCheckResult).text(message || this.t('resource.detailPlaceholder'));
    $(DOM.resourceOpenGallery).prop('disabled', true);
    $(DOM.resourceImportEditor).prop('disabled', true);
  }

  setStatus(key, params = {}, state = 'info') {
    this.statusState = state;
    $(DOM.resourceStatus)
      .text(this.t(key, params))
      .attr('data-state', state);
  }

  updateLoadedStatus() {
    const total = this.resourceStates.length;
    const verified = this.resourceStates.filter((item) => item.ok).length;
    this.setStatus('resource.status.loaded', {
      verified,
      total,
    }, verified === total && this.trustSummary?.importAllowed ? 'success' : 'error');
  }

  formatCheckResult(item) {
    const { resource, verification } = item;
    const importLine = this.canImportResource(item)
      ? this.t('resource.importAllowed')
      : `${this.t('resource.importBlocked')}: ${this.formatImportBlockReason(item)}`;
    const lines = [
      item.ok ? this.t('resource.checkOk') : this.t('resource.checkFail', { reason: item.error }),
      `${this.t('resource.id')}: ${resource.id}`,
      `${this.t('resource.source')}: ${resource.source}`,
      `${this.t('resource.size')}: ${verification?.actualSize ?? '--'} / ${resource.size}`,
      `${this.t('resource.sha256')}: ${resource.sha256}`,
      `${this.t('resource.actualSha256')}: ${verification?.actualSha256 || '--'}`,
      `${this.t('resource.trustStatus')}: ${this.formatTrustStatus(item.trustStatus)}`,
      `${this.t('resource.revocationStatus')}: ${this.formatRevocationStatus(item.revocation)}`,
      `${this.t('resource.cacheTarget')}: ${this.t('resource.cacheTarget.editorWorkspace')}`,
      `${this.t('resource.importBlockedReason')}: ${importLine}`,
      `${this.t('resource.boundary')}: ${this.t('resource.boundaryText')}`,
    ];
    return lines.join('\n');
  }

  canImportResource(item) {
    return Boolean(item?.ok && item.importAllowed && item.artwork);
  }

  formatTrustStatus(status) {
    const key = `resource.trust.${status || 'invalid-signature'}`;
    const label = this.t(key);
    return label === key ? String(status || 'invalid-signature') : label;
  }

  formatRevocationStatus(revocation) {
    const status = revocation?.status || 'not-revoked';
    const key = `resource.revocation.${status}`;
    const label = this.t(key);
    return label === key ? status : label;
  }

  formatImportBlockReason(item) {
    if (!item?.ok) return this.t('resource.import.block.hash');
    if (item.revocation?.revoked) return this.t('resource.import.block.revoked');
    if (!item.artwork) return this.t('resource.import.block.artwork');
    if (!this.trustSummary?.importAllowed || item.trustStatus !== 'maintainer-signed') {
      return this.t('resource.import.block.signature');
    }
    return this.t('resource.import.block.unknown');
  }

  buildImportFacts(item) {
    const entry = createStudioResourceEntryFromDiscoveryState(item, {
      title: this.getResourceDisplayTitle(item),
    });
    const proposal = createStudioImportProposalFromResourceEntry(entry);
    return [
      [this.t('resource.id'), item.resource.id],
      [this.t('resource.kind'), this.t(`resource.kind.${item.resource.kind}`)],
      [this.t('resource.license'), `${item.resource.license.expression} · ${item.resource.license.origin}`],
      [this.t('resource.source'), item.resource.source],
      [this.t('resource.size'), this.t('resource.sizeBytes', { size: item.resource.size })],
      [this.t('resource.sha256'), item.resource.sha256],
      [this.t('resource.trustStatus'), this.formatTrustStatus(item.trustStatus)],
      [this.t('resource.revocationStatus'), this.formatRevocationStatus(item.revocation)],
      [this.t('resource.cacheTarget'), this.t('resource.cacheTarget.editorWorkspace')],
      ['targetAction', proposal.targetAction],
      ['targetScope', proposal.targetScope],
      ['effectSummary', proposal.effectSummary],
    ];
  }

  async confirmResourceImport(item) {
    const $dialog = $(DOM.resourceImportDialog);
    const dialog = $dialog[0];
    const facts = this.buildImportFacts(item);
    $(DOM.resourceImportBody).text(this.t('resource.importDialogBody'));

    const $facts = $(DOM.resourceImportFacts).empty();
    facts.forEach(([label, value]) => {
      $('<dt>').text(label).appendTo($facts);
      $('<dd>').text(value).appendTo($facts);
    });

    if (!dialog || typeof dialog.showModal !== 'function') {
      const text = facts.map(([label, value]) => `${label}: ${value}`).join('\n');
      return window.confirm(`${this.t('resource.importDialogBody')}\n\n${text}`);
    }

    dialog.returnValue = '';
    return await new Promise((resolve) => {
      dialog.addEventListener('close', () => {
        resolve(dialog.returnValue === 'confirm');
      }, { once: true });
      dialog.showModal();
    });
  }

  async importSelectedResourceToEditor() {
    const item = this.resourceStates.find((entry) => entry.resource.id === this.selectedResourceId);
    await this.importResourceItemToEditor(item);
  }

  /**
   * 通过统一确认流把已验证资源导入 source-first 编辑器。
   *
   * @param {Object|null} item 资源发现状态项。
   * @returns {Promise<boolean>} 成功导入时为 true，取消或失败时为 false。
   */
  async importResourceItemToEditor(item) {
    if (!this.canImportResource(item)) {
      const reason = this.formatImportBlockReason(item);
      this.appController.toastManager.warning(this.t('toast.resourceImportBlocked', { reason }));
      return false;
    }

    const confirmed = await this.confirmResourceImport(item);
    if (!confirmed) return false;

    this.setStatus('resource.status.importing');
    try {
      const resourceFile = await this.fetchDiscoveryFile(item.resource.source);
      const verification = await verifyUnicodeArtResourceBytes(item.resource, resourceFile.bytes);
      if (!verification.ok) {
        throw new Error(this.t('resource.import.block.hash'));
      }
      const workspaceKind = item.resource.kind === 'unicode-art-font' ? 'font' : 'document';
      this.appController.editorController.validateSource(resourceFile.text, workspaceKind);
      this.appController.openGalleryArtworkInEditor(item.artwork, resourceFile.text);
      this.appController.toastManager.success(this.t('toast.resourceImported'));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.appController.toastManager.error(this.t('toast.resourceImportFailed', { message }));
      this.updateLoadedStatus();
      return false;
    }
  }

  shortHash(hash) {
    return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
  }

  formatNetwork(value) {
    const key = `resource.network.${value}`;
    const label = this.t(key);
    return label === key ? String(value) : label;
  }

  formatAutomaticInstall(value) {
    const key = `resource.automaticInstall.${String(value)}`;
    const label = this.t(key);
    return label === key ? String(value) : label;
  }

  async openSelectedResourceInGallery() {
    const item = this.resourceStates.find((entry) => entry.resource.id === this.selectedResourceId);
    if (!item?.artwork) return;
    await this.appController.switchMode('gallery');
    await this.appController.galleryController.selectArtwork(item.resource.id);
  }
}

//#endregion

//#region 🟩 公开开发文档入口

/**
 * 🟢 公开文档入口控制器
 *
 * 🔹 数据来自构建期生成的 `public/docs/manifest.json`，只包含公开展示字段。
 * 🔹 本控制器不读取本地生成目录，也不暴露 WorkZone 或 AI 协作文档。
 * 🔹 详情链接统一指向 GitHub 仓库中的公开文档，便于 Pages 与源码同步浏览。
 */
class DocsController {
  constructor(appController) {
    this.appController = appController;
    this.manifest = null;
    this.selectedEntry = null;
    this.selectedSection = null;
  }

  bindEvents($doc) {
    $doc.on('click', '[data-docs-entry-id]', (event) => {
      const id = String($(event.currentTarget).attr('data-docs-entry-id') || '');
      this.selectEntry(id);
    });
    $doc.on('click', '[data-docs-section-id]', (event) => {
      const id = String($(event.currentTarget).attr('data-docs-section-id') || '');
      this.selectSection(id);
    });
  }

  async activate() {
    await this.ensureLoaded();
  }

  refreshLocale() {
    if (!this.manifest) {
      this.setStatus('docs.status.ready');
      return;
    }
    this.renderSummary();
    this.renderSections();
    this.renderGrid();
    this.renderSelection();
  }

  t(key, params = {}) {
    return this.appController.i18nManager.t(key, params);
  }

  async ensureLoaded() {
    if (this.manifest) {
      this.renderSummary();
      this.renderSections();
      this.renderGrid();
      if (!this.selectedEntry && !this.selectedSection && this.manifest.entries.length > 0) {
        this.selectEntry(this.manifest.entries[0].id);
      }
      return;
    }

    this.setStatus('docs.status.loading');
    try {
      const response = await fetch(new URL('./docs/manifest.json', window.location.href), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.manifest = this.parseManifest(await response.json());
      this.renderSummary();
      this.renderSections();
      this.renderGrid();
      this.setStatus('docs.status.loaded', { count: this.manifest.entries.length }, 'success');
      if (this.manifest.entries.length > 0) this.selectEntry(this.manifest.entries[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setStatus('docs.status.error', { message }, 'error');
      this.setInspectorPlaceholder('docs.previewPlaceholder');
    }
  }

  parseManifest(raw) {
    if (!raw || raw.contract !== 'unicodeartjs-public-docs-site-manifest') {
      throw new Error('Invalid public docs manifest');
    }
    if (!Array.isArray(raw.entries)) {
      throw new Error('Public docs manifest entries must be an array');
    }
    const rawArchitecture = raw.architecture && typeof raw.architecture === 'object' ? raw.architecture : {};
    const rawSections = Array.isArray(rawArchitecture.sections) ? rawArchitecture.sections : [];
    const rawApiReference = raw.apiReference && typeof raw.apiReference === 'object' ? raw.apiReference : {};
    const rawApiEntries = Array.isArray(rawApiReference.entries) ? rawApiReference.entries : [];
    return {
      ...raw,
      architecture: {
        ...rawArchitecture,
        checkCommand: String(rawArchitecture.checkCommand || ''),
        sections: rawSections.map((section) => ({
          ...section,
          id: String(section.id || ''),
          title: String(section.title || section.id || ''),
          docCount: Number.isFinite(Number(section.docCount)) ? Number(section.docCount) : 0,
          docs: Array.isArray(section.docs)
            ? section.docs.map((doc) => ({
              path: String(doc.path || ''),
              url: String(doc.url || raw.docsHomeUrl || raw.repository || ''),
            }))
            : [],
        })).filter((section) => section.id),
      },
      apiReference: {
        ...rawApiReference,
        symbolCount: Number.isFinite(Number(rawApiReference.symbolCount)) ? Number(rawApiReference.symbolCount) : 0,
        sourceFileCount: Number.isFinite(Number(rawApiReference.sourceFileCount)) ? Number(rawApiReference.sourceFileCount) : 0,
        entries: rawApiEntries.map((entry) => ({
          ...entry,
          entryId: String(entry.entryId || ''),
          symbolCount: Number.isFinite(Number(entry.symbolCount)) ? Number(entry.symbolCount) : 0,
          sourceFileCount: Number.isFinite(Number(entry.sourceFileCount)) ? Number(entry.sourceFileCount) : 0,
          symbols: Array.isArray(entry.symbols)
            ? entry.symbols.map((symbol) => ({
              ...symbol,
              id: String(symbol.id || ''),
              name: String(symbol.name || ''),
              kind: String(symbol.kind || ''),
              signature: String(symbol.signature || symbol.name || ''),
              summary: this.normalizeLocalizedText(symbol.summary),
              source: {
                path: String(symbol.source?.path || ''),
                line: Number.isFinite(Number(symbol.source?.line)) ? Number(symbol.source.line) : undefined,
                url: String(symbol.source?.url || ''),
              },
            })).filter((symbol) => symbol.id && symbol.name)
            : [],
        })).filter((entry) => entry.entryId),
      },
      entries: raw.entries.map((entry) => ({
        ...entry,
        id: String(entry.id || ''),
        title: String(entry.title || entry.id || ''),
        packageName: String(entry.packageName || ''),
        packageVersion: String(entry.packageVersion || ''),
        surface: String(entry.surface || ''),
        documentationKind: String(entry.documentationKind || ''),
        stability: String(entry.stability || ''),
        guideUrl: String(entry.guideUrl || raw.docsHomeUrl || raw.repository || ''),
        checkCommand: String(entry.checkCommand || ''),
        metrics: entry.metrics && typeof entry.metrics === 'object' ? entry.metrics : {},
      })),
    };
  }

  renderSummary() {
    if (!this.manifest) return;
    $(DOM.docsEntryCount).text(String(this.manifest.entries.length));
    $(DOM.docsSectionCount).text(String(this.manifest.architecture?.sections?.length ?? 0));
    $(DOM.docsGeneratedAt).text(this.formatDate(this.manifest.generatedAt));
    $(DOM.docsManifestVersion).text(`${this.manifest.contractVersion || '--'}`);
    $(DOM.docsRepoLink).attr('href', this.manifest.repository || 'https://github.com/mandolin/UnicodeArtJs');
  }

  renderSections() {
    const $sections = $(DOM.docsSections);
    $sections.empty();
    if (!this.manifest) return;

    (this.manifest.architecture?.sections || []).forEach((section) => {
      const isSelected = section.id === this.selectedSection?.id;
      const docCount = section.docs.length || section.docCount || 0;
      const $button = $('<button>')
        .attr({
          type: 'button',
          'data-docs-section-id': section.id,
          'aria-pressed': String(isSelected),
        })
        .addClass('docs-section-card')
        .toggleClass('selected', isSelected);

      $('<strong>')
        .addClass('docs-section-title')
        .text(this.formatSectionTitle(section))
        .appendTo($button);
      $('<span>')
        .addClass('docs-section-meta')
        .text(this.t('docs.section.docCount', { count: docCount }))
        .appendTo($button);
      $('<span>')
        .addClass('docs-section-description')
        .text(this.formatSectionDescription(section))
        .appendTo($button);

      $('<article>').attr('role', 'listitem').append($button).appendTo($sections);
    });
  }

  renderGrid() {
    const $grid = $(DOM.docsGrid);
    $grid.empty();
    if (!this.manifest) return;

    this.manifest.entries.forEach((entry) => {
      const isSelected = !this.selectedSection && entry.id === this.selectedEntry?.id;
      const $button = $('<button>')
        .attr({
          type: 'button',
          'data-docs-entry-id': entry.id,
          'aria-pressed': String(isSelected),
        })
        .addClass('docs-entry-card')
        .toggleClass('selected', isSelected);

      $('<span>')
        .addClass('docs-entry-kind')
        .text(this.formatDocumentationKind(entry.documentationKind))
        .appendTo($button);
      $('<strong>')
        .addClass('docs-entry-title')
        .text(entry.title)
        .appendTo($button);
      $('<span>')
        .addClass('docs-entry-description')
        .text(`${entry.packageName}@${entry.packageVersion}`)
        .appendTo($button);
      $('<span>')
        .addClass('docs-entry-surface')
        .text(this.formatSurface(entry.surface))
        .appendTo($button);
      const apiEntry = this.findApiEntry(entry.id);
      if (apiEntry) {
        $('<span>')
          .addClass('docs-entry-symbols')
          .text(this.t('docs.symbolCount', { count: apiEntry.symbolCount }))
          .appendTo($button);
      }

      $('<article>').attr('role', 'listitem').append($button).appendTo($grid);
    });
  }

  selectEntry(id) {
    const entry = this.manifest?.entries.find((item) => item.id === id);
    if (!entry) return;
    this.selectedEntry = entry;
    this.selectedSection = null;
    this.renderSections();
    this.renderGrid();
    this.renderSelectedEntry();
  }

  selectSection(id) {
    const section = this.manifest?.architecture?.sections?.find((item) => item.id === id);
    if (!section) return;
    this.selectedSection = section;
    this.selectedEntry = null;
    this.renderSections();
    this.renderGrid();
    this.renderSelectedSection();
  }

  renderSelection() {
    if (this.selectedSection) {
      this.renderSelectedSection();
      return;
    }
    this.renderSelectedEntry();
  }

  renderSelectedEntry() {
    const entry = this.selectedEntry;
    if (!entry) {
      this.setInspectorPlaceholder('docs.previewPlaceholder');
      return;
    }

    $(DOM.docsKind).text(this.formatDocumentationKind(entry.documentationKind));
    $(DOM.docsTitle).text(entry.title);
    $(DOM.docsStability).text(this.formatStability(entry.stability));
    $(DOM.docsPackage).text(`${entry.packageName}@${entry.packageVersion}`);
    $(DOM.docsSurface).text(this.formatSurface(entry.surface));
    $(DOM.docsCheckCommand).text(entry.checkCommand || '--');
    $(DOM.docsMetadata).prop('hidden', false);
    $(DOM.docsDescription).text(this.buildDescription(entry));
    const apiEntry = this.findApiEntry(entry.id);
    $(DOM.docsMetrics).text(this.formatMetrics({
      ...entry.metrics,
      symbolCount: apiEntry?.symbolCount,
      sourceFileCount: apiEntry?.sourceFileCount,
    }));
    this.renderSymbols(apiEntry);
    $(DOM.docsGuideLink).attr('href', entry.guideUrl || this.manifest?.docsHomeUrl || '#');
  }

  renderSelectedSection() {
    const section = this.selectedSection;
    if (!section) {
      this.setInspectorPlaceholder('docs.previewPlaceholder');
      return;
    }

    const firstDocUrl = section.docs[0]?.url || this.manifest?.docsHomeUrl || '#';
    $(DOM.docsKind).text(this.t('docs.kind.section'));
    $(DOM.docsTitle).text(this.formatSectionTitle(section));
    $(DOM.docsStability).text(this.t('docs.stability.public'));
    $(DOM.docsPackage).text('UnicodeArtJs');
    $(DOM.docsSurface).text(this.t('docs.surface.docs'));
    $(DOM.docsCheckCommand).text(this.manifest?.architecture?.checkCommand || '--');
    $(DOM.docsMetadata).prop('hidden', false);
    $(DOM.docsDescription).text(this.formatSectionDescription(section));
    $(DOM.docsMetrics).text(this.formatSectionDocs(section));
    this.renderSymbols(null);
    $(DOM.docsGuideLink).attr('href', firstDocUrl);
  }

  setInspectorPlaceholder(key) {
    $(DOM.docsKind).text('');
    $(DOM.docsTitle).text(this.t('docs.noSelection'));
    $(DOM.docsStability).text('');
    $(DOM.docsMetadata).prop('hidden', true);
    $(DOM.docsDescription).text(this.t(key));
    $(DOM.docsMetrics).text('');
    this.renderSymbols(null);
  }

  setStatus(key, params = {}, state = 'info') {
    $(DOM.docsStatus)
      .text(this.t(key, params))
      .attr('data-state', state);
  }

  buildDescription(entry) {
    return [
      this.formatSurface(entry.surface),
      this.formatDocumentationKind(entry.documentationKind),
      this.formatStability(entry.stability),
    ].filter(Boolean).join(' · ');
  }

  formatDocumentationKind(kind) {
    const label = this.t(`docs.kind.${kind}`);
    return label === `docs.kind.${kind}` ? kind : label;
  }

  formatSurface(surface) {
    const label = this.t(`docs.surface.${surface}`);
    return label === `docs.surface.${surface}` ? surface : label;
  }

  formatStability(stability) {
    const label = this.t(`docs.stability.${stability}`);
    return label === `docs.stability.${stability}` ? stability : label;
  }

  formatSectionTitle(section) {
    const key = `docs.section.${section.id}`;
    const label = this.t(key);
    return label === key ? section.title : label;
  }

  formatSectionDescription(section) {
    const key = `docs.section.${section.id}.description`;
    const label = this.t(key);
    return label === key ? '' : label;
  }

  formatSectionDocs(section) {
    const lines = (section.docs || [])
      .filter((doc) => doc.path)
      .map((doc) => `- ${doc.path}`);
    return lines.length > 0 ? `${this.t('docs.section.docs')}\n${lines.join('\n')}` : '';
  }

  findApiEntry(entryId) {
    return this.manifest?.apiReference?.entries?.find((entry) => entry.entryId === entryId) || null;
  }

  normalizeLocalizedText(value) {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    return {
      'zh-CN': String(value['zh-CN'] || value.zh || ''),
      'en-US': String(value['en-US'] || value.en || ''),
    };
  }

  formatLocalizedText(value) {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    const locale = this.appController.i18nManager.currentLocale;
    if (value[locale]) return value[locale];
    if (locale.startsWith('en') && value['en-US']) return value['en-US'];
    return value['zh-CN'] || value['en-US'] || '';
  }

  renderSymbols(apiEntry) {
    const $symbols = $(DOM.docsSymbols);
    $symbols.empty();
    if (!apiEntry?.symbols?.length) {
      $symbols.prop('hidden', true);
      return;
    }

    $symbols.prop('hidden', false);
    $('<h3>')
      .addClass('docs-symbols-header')
      .text(`${this.t('docs.symbols.title')} · ${apiEntry.symbolCount}`)
      .appendTo($symbols);

    apiEntry.symbols.forEach((symbol) => {
      const sourceLabel = symbol.source?.path
        ? `${symbol.source.path}${symbol.source.line ? `:${symbol.source.line}` : ''}`
        : '';
      const $card = $('<a>')
        .attr({
          href: symbol.source?.url || this.manifest?.repository || '#',
          target: '_blank',
          rel: 'noopener noreferrer',
          'data-docs-symbol-id': symbol.id,
        })
        .addClass('docs-symbol-card');

      $('<span>')
        .addClass('docs-symbol-kind')
        .text(symbol.kind)
        .appendTo($card);
      $('<strong>')
        .addClass('docs-symbol-name')
        .text(symbol.name)
        .appendTo($card);
      $('<code>')
        .addClass('docs-symbol-signature')
        .text(symbol.signature)
        .appendTo($card);
      $('<p>')
        .addClass('docs-symbol-summary')
        .text(this.formatLocalizedText(symbol.summary))
        .appendTo($card);
      $('<span>')
        .addClass('docs-symbol-source')
        .text(`${this.t('docs.symbols.source')}: ${sourceLabel}`)
        .appendTo($card);

      $('<article>').attr('role', 'listitem').append($card).appendTo($symbols);
    });
  }

  formatDate(value) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(AppState.config.locale);
  }

  formatMetrics(metrics = {}) {
    const lines = Object.entries(metrics)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        const label = this.t(`docs.metric.${key}`);
        const text = Array.isArray(value) ? value.join(', ') : String(value);
        return `${label === `docs.metric.${key}` ? key : label}: ${text}`;
      });
    return lines.length > 0 ? `${this.t('docs.metrics')}\n${lines.join('\n')}` : '';
  }
}

//#endregion

//#region 🟩 应用控制器

class AppController {
  constructor() {
    this.i18nManager = new I18nManager();
    this.themeManager = new ThemeManager();
    this.toastManager = new ToastManager();
    this.artGenerator = new ArtGenerator();
    this.editorController = new EditorController(this);
    this.galleryController = new GalleryController(this);
    this.resourceDiscoveryController = new ResourceDiscoveryController(this);
    this.docsController = new DocsController(this);
    this.fontAvailabilityChecker = createCanvasFontAvailabilityChecker(document);
    this.isBraveBrowser = false;

    //#region 🟩 防抖

    this._debounceTimer = null;
    this._debounceDelay = 300; // 300ms防抖
    this._queueRefresh = false;

    // 绑定防抖的refresh方法
    this.debouncedRefresh = () => {
      this._queueRefresh = true;
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this._debounceTimer = null;
        this._queueRefresh = false;
        this.refreshPreview();
      }, this._debounceDelay);
    };

    //#endregion

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadConfig();
    this.themeManager.applyTheme(AppState.config.themeName);
    this.i18nManager.apply(AppState.config.locale);
    this.refreshFontAvailability();
    this.detectBraveBrowser();
    this.waitForBrowserFonts();
    this.editorController.initialize();
    this.detectTouchDevice();
    this.initBoxStylePreview();
    this.handleResize();
    console.log('UnicodeArtJs Web 初始化完成');
  }

  // 检测触摸设备
  detectTouchDevice() {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
      document.documentElement.classList.add('touch-device');
      if (window.innerWidth <= 768) {
        $('.upload-text').text(this.i18nManager.t('input.uploadHint'));
        $('.upload-hint').text(this.i18nManager.t('input.uploadHintTouch'));
      }
    }
  }

  // 窗口尺寸变化处理
  handleResize() {
    let resizeTimer;
    $(window).on('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.applyGlyphFont();
      }, 200);
    });
  }

  // 初始化box样式预览
  initBoxStylePreview() {
    const $sel = $(DOM.boxStyle);
    const names = this.artGenerator.coreAdapter.getBoxStyleNames();
    const currentVal = $sel.val();

    // 动态更新样式下拉选项
    $sel.empty();
    names.forEach(name => {
      const label = this.i18nManager.t(`box.style.${name}`);
      $('<option>')
        .val(name)
        .prop('selected', name === currentVal)
        .text(label === `box.style.${name}` ? name.charAt(0).toUpperCase() + name.slice(1) : label)
        .appendTo($sel);
    });
  }

  bindEvents() {
    const $doc = $(document);

    // 模式
    $doc.on('click', DOM.modeButtons, (e) => this.handleModeSwitch(e));

    // 上传
    $doc.on('click', DOM.uploadZone, () => $(DOM.fileInput).click());
    $doc.on('keydown', DOM.uploadZone, (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $(DOM.fileInput).click();
      }
    });
    $doc.on('change', DOM.fileInput, (e) => this.handleFileSelect(e));
    $doc.on('dragover', DOM.uploadZone, (e) => { e.preventDefault(); e.stopPropagation(); $(DOM.uploadZone).addClass('dragover'); });
    $doc.on('dragleave', DOM.uploadZone, (e) => { e.preventDefault(); e.stopPropagation(); $(DOM.uploadZone).removeClass('dragover'); });
    $doc.on('drop', DOM.uploadZone, (e) => this.handleDrop(e));
    $doc.on('click', DOM.clearImage, () => this.clearImage());
    $doc.on('input', DOM.textInput, (e) => { AppState.textContent = $(e.target).val(); this.debouncedRefresh(); });

    // 基本配置（防抖）
    $doc.on('input', DOM.heightInput, (e) => { this.setConfigQuiet('height', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('input', DOM.widthInput, (e) => { this.setConfigQuiet('width', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('change', DOM.charsetSelect, (e) => { this.handleCharsetChange(e); });
    $doc.on('input', DOM.customChars, (e) => { this.setConfigQuiet('customChars', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('change', DOM.fontSelect, (e) => { this.handleVisualFontChange(e); });
    $doc.on('change', DOM.glyphFont, (e) => { this.handleGlyphFontChange(e); });

    // 高级配置（防抖）
    $doc.on('input', DOM.matrixSizeInput, (e) => { this.setNumConfigQuiet('matrixSize', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('input', DOM.ratioInput, (e) => { this.setConfigQuiet('ratio', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('change', DOM.interpolation, (e) => { this.setConfigQuiet('interpolation', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('input', DOM.wideCharRatio, (e) => { this.setConfigQuiet('wideCharRatio', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('input', DOM.fontReduce, (e) => { this.setNumConfigQuiet('fontReduce', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('input', DOM.charSpace, (e) => { this.setNumConfigQuiet('charSpace', $(e.target).val()); });
    $doc.on('change', DOM.glyphWidthProfile, (e) => { this.handleGlyphWidthProfileChange(e); });
    $doc.on('input', DOM.wideCharRegex, (e) => { this.setConfigQuiet('wideCharRegex', $(e.target).val()); });
    $doc.on('change', DOM.invertCheckbox, (e) => { this.setConfigQuiet('invert', $(e.target).prop('checked')); this.debouncedRefresh(); });
    $doc.on('change', DOM.trimTrailing, (e) => { this.setConfigQuiet('trimTrailing', $(e.target).prop('checked')); this.debouncedRefresh(); });
    $doc.on('change', DOM.earlyTermination, (e) => { this.setConfigQuiet('earlyTermination', $(e.target).prop('checked')); this.debouncedRefresh(); });

    // 裱框（防抖）
    $doc.on('change', DOM.boxEnabled, (e) => {
      this.setConfigQuiet('boxEnabled', $(e.target).prop('checked'));
      $(DOM.boxConfigBody).toggle($(e.target).prop('checked'));
      this.debouncedRefresh();
    });
    $doc.on('change', DOM.boxStyle, (e) => { this.setConfigQuiet('boxStyle', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('input', DOM.boxPadding, (e) => { this.setNumConfigQuiet('boxPadding', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('input', DOM.boxMargin, (e) => { this.setNumConfigQuiet('boxMargin', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('input', DOM.boxTitle, (e) => { this.setConfigQuiet('boxTitle', $(e.target).val()); this.debouncedRefresh(); });
    $doc.on('change', DOM.boxShadow, (e) => { this.setConfigQuiet('boxShadow', $(e.target).prop('checked')); this.debouncedRefresh(); });

    // 预览
    $doc.on('click', DOM.refreshBtn, () => this.refreshPreview());

    // 导出
    $doc.on('click', DOM.exportTxt, () => this.exportTxt());
    $doc.on('click', DOM.exportHtml, () => this.exportHtml());
    $doc.on('click', DOM.exportPng, () => this.exportPng());
    $doc.on('click', DOM.copyBtn, () => this.copyToClipboard());

    // 编辑器
    this.editorController.bindEvents($doc);

    // 静态画廊
    this.galleryController.bindEvents($doc);

    // 实验性资源发现
    this.resourceDiscoveryController.bindEvents($doc);

    // 公开开发文档
    this.docsController.bindEvents($doc);

    // 主题
    $doc.on('change', DOM.themeSelect, (e) => { this.themeManager.switchTheme($(e.target).val()); });
    $doc.on('change', DOM.languageSelect, (e) => { this.handleLanguageChange(e); });
  }

  handleModeSwitch(e) {
    const $btn = $(e.currentTarget);
    if ($btn.hasClass('disabled')) return;
    const mode = $btn.data('mode');
    if (mode === AppState.mode) return;
    void this.switchMode(mode);
  }

  /**
   * 切换多个独立工作台。
   *
   * 转换器、编辑器、画廊和文档页都使用 HTML `hidden` 语义，避免仅靠视觉样式隐藏
   * 后仍被键盘焦点访问。静态数据页首次激活时才读取同源索引。
   */
  async switchMode(mode) {
    if (!['image', 'text', 'editor', 'gallery', 'resources', 'docs'].includes(mode)) return;
    $(DOM.modeButtons).removeClass('active');
    $(`${DOM.modeButtons}[data-mode="${mode}"]`).addClass('active');
    if (mode === 'editor') {
      $(DOM.converterWorkbench).prop('hidden', true);
      $(DOM.galleryWorkbench).prop('hidden', true);
      $(DOM.resourceWorkbench).prop('hidden', true);
      $(DOM.docsWorkbench).prop('hidden', true);
      $(DOM.editorWorkbench).prop('hidden', false);
      AppState.mode = mode;
      this.editorController.activate();
      return;
    }

    if (mode === 'gallery') {
      $(DOM.converterWorkbench).prop('hidden', true);
      $(DOM.editorWorkbench).prop('hidden', true);
      $(DOM.resourceWorkbench).prop('hidden', true);
      $(DOM.docsWorkbench).prop('hidden', true);
      $(DOM.galleryWorkbench).prop('hidden', false);
      AppState.mode = mode;
      await this.galleryController.activate();
      return;
    }

    if (mode === 'resources') {
      $(DOM.converterWorkbench).prop('hidden', true);
      $(DOM.editorWorkbench).prop('hidden', true);
      $(DOM.galleryWorkbench).prop('hidden', true);
      $(DOM.docsWorkbench).prop('hidden', true);
      $(DOM.resourceWorkbench).prop('hidden', false);
      AppState.mode = mode;
      await this.resourceDiscoveryController.activate();
      return;
    }

    if (mode === 'docs') {
      $(DOM.converterWorkbench).prop('hidden', true);
      $(DOM.editorWorkbench).prop('hidden', true);
      $(DOM.galleryWorkbench).prop('hidden', true);
      $(DOM.resourceWorkbench).prop('hidden', true);
      $(DOM.docsWorkbench).prop('hidden', false);
      AppState.mode = mode;
      await this.docsController.activate();
      return;
    }

    $(DOM.editorWorkbench).prop('hidden', true);
    $(DOM.galleryWorkbench).prop('hidden', true);
    $(DOM.resourceWorkbench).prop('hidden', true);
    $(DOM.docsWorkbench).prop('hidden', true);
    $(DOM.converterWorkbench).prop('hidden', false);
    if (mode === 'image') { $(DOM.imageInputPanel).show(); $(DOM.textInputPanel).hide(); }
    else { $(DOM.imageInputPanel).hide(); $(DOM.textInputPanel).show(); }
    AppState.mode = mode;
    this.refreshPreview();
  }

  handleCharsetChange(e) {
    const val = $(e.target).val();
    this.setConfigQuiet('charset', val);
    if (val === '__CUSTOM__') $(DOM.customCharsGroup).show();
    else $(DOM.customCharsGroup).hide();
    this.debouncedRefresh();
  }

  handleGlyphFontChange(e) {
    this.setConfigQuiet('glyphFont', $(e.target).val());
    this.applyGlyphFont();
    this.refreshFontAvailability();
    // 字素字体既影响预览 CSS，也影响 Core 的字符模板，必须重新生成。
    this.debouncedRefresh();
  }

  handleVisualFontChange(e) {
    this.setConfigQuiet('font', $(e.target).val());
    this.refreshFontAvailability();
    this.debouncedRefresh();
  }

  handleGlyphWidthProfileChange(e) {
    const profile = $(e.target).val();
    this.setConfigQuiet('glyphWidthProfile', profile);
    $(DOM.wideCharRegexGroup).toggle(profile === 'custom');
  }

  handleLanguageChange(e) {
    this.i18nManager.apply($(e.target).val());
    this.initBoxStylePreview();
    this.editorController.refreshLocale();
    this.galleryController.refreshLocale();
    this.resourceDiscoveryController.refreshLocale();
    this.docsController.refreshLocale();
    this.refreshFontAvailability();
    this.saveConfig();
    if (!AppState.result) {
      this.setPlaceholder(this.getIdlePlaceholder());
    } else {
      this.displayResult(AppState.result, false);
    }
  }

  applyGlyphFont() {
    const $preview = $(DOM.artPreview);
    $preview.css('font-family', AppState.config.glyphFont);
    // 移动端自适应字号
    if (window.innerWidth <= 480) {
      $preview.css('font-size', '0.6rem');
    } else if (window.innerWidth <= 768) {
      $preview.css('font-size', '0.65rem');
    } else {
      $preview.css('font-size', '0.75rem');
    }
    this.editorController?.applyGlyphFont();
    this.galleryController?.applyGlyphFont();
  }

  /**
   * 刷新视觉字体与字素字体的可用性提示。
   *
   * 中文说明：检测只作为 UX 提示，不改变 Core 配置；浏览器隐私保护可能让结果偏保守。
   */
  refreshFontAvailability() {
    this.updateFontStatus(DOM.fontStatus, AppState.config.font);
    this.updateFontStatus(DOM.glyphFontStatus, AppState.config.glyphFont);
  }

  updateFontStatus(selector, fontFamily) {
    const summary = getFontAvailabilitySummary(fontFamily, this.fontAvailabilityChecker);
    let key = 'config.fontStatus.empty';
    let state = 'info';
    let params = {};

    if (summary.state === 'available') {
      key = 'config.fontStatus.available';
      state = 'available';
      params = { font: summary.availableFont };
    } else if (summary.state === 'unavailable') {
      key = 'config.fontStatus.unavailable';
      state = 'warning';
      params = { font: summary.primaryFont };
    } else if (summary.state === 'generic') {
      key = 'config.fontStatus.generic';
      state = 'info';
    }

    const suffix = state === 'warning' && this.isBraveBrowser
      ? ` ${this.i18nManager.t('config.fontStatus.brave')}`
      : '';
    $(selector)
      .text(`${this.i18nManager.t(key, params)}${suffix}`)
      .attr('data-state', state);
  }

  detectBraveBrowser() {
    const brave = navigator.brave;
    if (!brave || typeof brave.isBrave !== 'function') return;
    Promise.resolve(brave.isBrave())
      .then((isBrave) => {
        this.isBraveBrowser = Boolean(isBrave);
        this.refreshFontAvailability();
      })
      .catch(() => {});
  }

  waitForBrowserFonts() {
    if (!document.fonts?.ready) return;
    void document.fonts.ready.then(() => this.refreshFontAvailability());
  }

  /** 将已加载的同源审核画廊资源显式交给 source-first 编辑器。 */
  openGalleryArtworkInEditor(artwork, source) {
    this.editorController.openExternalSource(artwork.kind, source, artwork.sample);
    void this.switchMode('editor').then(() => this.editorController.renderPreview());
  }

  // 文件处理

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) this.processImageFile(file);
  }

  handleDrop(e) {
    e.preventDefault(); e.stopPropagation();
    $(DOM.uploadZone).removeClass('dragover');
    const files = e.originalEvent.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) this.processImageFile(file);
      else this.toastManager.error(this.i18nManager.t('toast.imageOnly'));
    }
  }

  processImageFile(file) {
    if (!file.type.startsWith('image/')) {
      this.toastManager.error(this.i18nManager.t('toast.imageOnly'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.toastManager.error(this.i18nManager.t('toast.imageTooLarge'));
      return;
    }
    AppState.imageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      $(DOM.previewImg).attr('src', e.target.result);
      $(DOM.imagePreview).show();
      $(DOM.uploadZone).hide();
    };
    reader.readAsDataURL(file);
    this.toastManager.success(this.i18nManager.t('toast.imageLoaded'));
    this.refreshPreview();
  }

  clearImage() {
    AppState.imageFile = null;
    $(DOM.fileInput).val('');
    $(DOM.imagePreview).hide();
    $(DOM.uploadZone).show();
    this.refreshPreview();
  }

  // 配置（不触发刷新，仅保存）
  setConfigQuiet(key, value) {
    AppState.config[key] = value;
    this.saveConfig();
  }

  setNumConfigQuiet(key, value) {
    AppState.config[key] = parseInt(value) || 0;
    this.saveConfig();
  }

  // 配置（保存并刷新 - 直连非防抖用）
  setConfig(key, value) {
    AppState.config[key] = value;
    this.saveConfig();
    this.refreshPreview();
  }

  setNumConfig(key, value) {
    AppState.config[key] = parseInt(value) || 0;
    this.saveConfig();
    this.refreshPreview();
  }

  loadConfig() {
    const saved = localStorage.getItem(WEB_CONFIG_STORAGE_KEY);
    let shouldPersist = false;
    if (saved) {
      try {
        const c = JSON.parse(saved);
        Object.assign(AppState.config, c);
        AppState.config.locale = normalizeUILocale(AppState.config.locale);
      } catch (e) { /* 损坏或陈旧配置忽略 */ }
    } else {
      // 兼容旧版独立主题键；迁移后仅保留统一配置键。
      const legacyTheme = localStorage.getItem('unicode-art-theme');
      if (legacyTheme) {
        AppState.config.themeName = legacyTheme;
        shouldPersist = true;
      }
    }

    shouldPersist = this.normalizeConfigForUI() || shouldPersist;
    this.syncUIFromConfig();
    this.applyGlyphFont();
    if (shouldPersist) this.saveConfig();
  }

  /**
   * 修复 localStorage 中已无法被当前下拉框表达的旧字体值。
   *
   * Web 页面目前只提供预设字体列表；保留不可选旧值会让 UI 与实际配置
   * 分离，且用户无法通过界面恢复。因此统一回退到当前可选的默认字体。
   */
  normalizeConfigForUI() {
    let changed = false;
    const normalizeSelect = (key, selector) => {
      const element = document.querySelector(selector);
      const supported = element && Array.from(element.options).some((option) => option.value === AppState.config[key]);
      if (!supported) {
        AppState.config[key] = DEFAULT_WEB_CONFIG[key];
        changed = true;
      }
    };

    normalizeSelect('font', DOM.fontSelect);
    normalizeSelect('glyphFont', DOM.glyphFont);
    normalizeSelect('charset', DOM.charsetSelect);
    normalizeSelect('interpolation', DOM.interpolation);
    normalizeSelect('glyphWidthProfile', DOM.glyphWidthProfile);
    normalizeSelect('themeName', DOM.themeSelect);
    return changed;
  }

  syncUIFromConfig() {
    const c = AppState.config;
    $(DOM.heightInput).val(c.height);
    $(DOM.widthInput).val(c.width);
    $(DOM.charsetSelect).val(c.charset);
    if (c.charset === '__CUSTOM__') $(DOM.customCharsGroup).show();
    $(DOM.customChars).val(c.customChars);
    $(DOM.fontSelect).val(c.font);
    $(DOM.glyphFont).val(c.glyphFont);
    $(DOM.matrixSizeInput).val(c.matrixSize);
    $(DOM.ratioInput).val(c.ratio);
    $(DOM.interpolation).val(c.interpolation);
    $(DOM.wideCharRatio).val(c.wideCharRatio);
    $(DOM.invertCheckbox).prop('checked', c.invert);
    $(DOM.trimTrailing).prop('checked', c.trimTrailing);
    $(DOM.earlyTermination).prop('checked', c.earlyTermination);
    $(DOM.fontReduce).val(c.fontReduce);
    $(DOM.charSpace).val(c.charSpace);
    $(DOM.glyphWidthProfile).val(c.glyphWidthProfile || 'default');
    $(DOM.wideCharRegex).val(c.wideCharRegex || '');
    $(DOM.wideCharRegexGroup).toggle((c.glyphWidthProfile || 'default') === 'custom');
    $(DOM.boxEnabled).prop('checked', c.boxEnabled);
    $(DOM.boxConfigBody).toggle(c.boxEnabled);
    $(DOM.boxStyle).val(c.boxStyle);
    $(DOM.boxPadding).val(c.boxPadding);
    $(DOM.boxMargin).val(c.boxMargin);
    $(DOM.boxTitle).val(c.boxTitle);
    $(DOM.boxShadow).prop('checked', c.boxShadow);
    $(DOM.themeSelect).val(c.themeName || 'default');
    $(DOM.languageSelect).val(c.locale || detectCoreLocale());
  }

  saveConfig() {
    localStorage.setItem(WEB_CONFIG_STORAGE_KEY, JSON.stringify(AppState.config));
  }

  // 预览

  async refreshPreview() {
    if (AppState.mode === 'editor') {
      await this.editorController.renderPreview();
      return;
    }
    if (AppState.mode === 'gallery') return;
    if (AppState.mode === 'resources') return;
    if (AppState.mode === 'docs') return;
    if (AppState.mode === 'image' && !AppState.imageFile) { this.setPlaceholder(this.i18nManager.t('preview.uploadImage')); return; }
    if (AppState.mode === 'text' && !AppState.textContent.trim()) { this.setPlaceholder(this.i18nManager.t('preview.enterText')); return; }

    const validation = this.validateParams();
    if (!validation.valid) {
      this.toastManager.warning(validation.message);
      this.setPlaceholder(validation.message);
      return;
    }

    // 取消上一次请求
    if (this._abortController) {
      this._abortController.abort();
    }
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    this.showLoading(true);
    $(DOM.previewInfo).text(this.i18nManager.t('preview.generating'));

    try {
      const result = await this.artGenerator.generate();
      if (signal.aborted) return; // 旧请求忽略
      if (result) {
        AppState.result = result;
        this.displayResult(result);
      } else {
        this.setPlaceholder(this.i18nManager.t('preview.placeholder'));
      }
    } catch (error) {
      if (signal.aborted) return;
      this.toastManager.error(this.i18nManager.t('toast.generateFailed', { message: error.message }));
      this.setPlaceholder(this.i18nManager.t('preview.failed'));
    } finally {
      if (!signal.aborted) {
        this.showLoading(false);
      }
    }
  }

  displayResult(result, showToast = true) {
    $(DOM.artPreview).text(result.content);
    $(DOM.previewInfo).text(this.i18nManager.t('preview.ready'));
    $(DOM.metaInfo).text(this.i18nManager.t('preview.meta.ready', {
      cols: result.cols,
      rows: result.rows,
      duration: result.duration,
    }));
    if (showToast) this.toastManager.success(this.i18nManager.t('toast.generateDone'));
  }

  setPlaceholder(text) {
    $(DOM.artPreview).empty().append($('<code>').addClass('preview-placeholder').text(text));
    $(DOM.previewInfo).text(this.i18nManager.t('preview.waiting'));
    $(DOM.metaInfo).text(this.i18nManager.t('preview.meta.empty'));
    AppState.result = null;
  }

  getIdlePlaceholder() {
    if (AppState.mode === 'image' && !AppState.imageFile) return this.i18nManager.t('preview.uploadImage');
    if (AppState.mode === 'text' && !AppState.textContent.trim()) return this.i18nManager.t('preview.enterText');
    return this.i18nManager.t('preview.placeholder');
  }

  // 参数校验
  validateParams() {
    const cfg = AppState.config;
    const h = parseInt(cfg.height);
    const m = parseInt(cfg.matrixSize);
    const r = parseFloat(cfg.ratio);

    if (isNaN(h) || h < 1) return { valid: false, message: this.i18nManager.t('validate.height') };
    if (cfg.width && (isNaN(parseInt(cfg.width)) || parseInt(cfg.width) < 1)) return { valid: false, message: this.i18nManager.t('validate.width') };
    if (isNaN(m) || m < 2 || m > 20) return { valid: false, message: this.i18nManager.t('validate.matrixSize') };
    if (isNaN(r) || r < 1.0 || r > 3.0) return { valid: false, message: this.i18nManager.t('validate.ratio') };

    const wr = parseFloat(cfg.wideCharRatio);
    if (isNaN(wr) || wr <= 0 || wr > 10) return { valid: false, message: this.i18nManager.t('validate.wideCharRatio') };

    return { valid: true };
  }

  // 导出

  exportTxt() {
    if (!AppState.result) { this.toastManager.warning(this.i18nManager.t('toast.exportFirst')); return; }
    const content = this.getExportContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, 'unicode-art.txt');
    this.toastManager.success(this.i18nManager.t('toast.exportTxt'));
  }

  exportHtml() {
    if (!AppState.result) { this.toastManager.warning(this.i18nManager.t('toast.exportFirst')); return; }
    const content = this.getExportContent();
    const glyphFont = AppState.config.glyphFont;
    const html = '<!DOCTYPE html>\n<html lang="' + AppState.config.locale + '">\n<head>\n'
      + '<meta charset="UTF-8">\n'
      + '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
      + '<title>Unicode Art - UnicodeArtJs</title>\n'
      + '<style>\n'
      + '  body {\n'
      + '    margin: 0;\n'
      + '    padding: 20px;\n'
      + '    background: #fafbfc;\n'
      + '    color: #1a1a2e;\n'
      + '    font-family: "Noto Sans SC", "Noto Sans", Roboto, "Liberation Sans", sans-serif;\n'
      + '  }\n'
      + '  .art-container {\n'
      + '    max-width: 100%;\n'
      + '    overflow-x: auto;\n'
      + '    padding: 20px;\n'
      + '    background: #ffffff;\n'
      + '    border: 1px solid #d0d5dd;\n'
      + '    border-radius: 8px;\n'
      + '    box-shadow: 0 1px 3px rgba(0,0,0,0.08);\n'
      + '  }\n'
      + '  pre {\n'
      + '    margin: 0;\n'
      + '    font-family: ' + glyphFont + ';\n'
      + '    font-size: 12px;\n'
      + '    line-height: 1.25;\n'
      + '    white-space: pre;\n'
      + '    color: #1a1a2e;\n'
      + '  }\n'
      + '</style>\n</head>\n<body>\n'
      + '<div class="art-container">\n'
      + '  <pre>' + this.escapeHtml(content) + '</pre>\n'
      + '</div>\n'
      + '<p style="margin-top:12px;font-size:12px;color:#6c757d;">\n'
      + '  Generated by <a href="https://github.com/mandolin/UnicodeArtJs">UnicodeArtJs</a>\n'
      + '  | ' + AppState.result.cols + 'x' + AppState.result.rows + ' chars'
      + '  | ' + AppState.result.duration + 'ms\n'
      + '</p>\n</body>\n</html>';

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    this.downloadBlob(blob, 'unicode-art.html');
    this.toastManager.success(this.i18nManager.t('toast.exportHtml'));
  }

  async exportPng() {
    if (!AppState.result) { this.toastManager.warning(this.i18nManager.t('toast.exportFirst')); return; }

    try {
      const content = this.getExportContent();
      const lines = content.split('\n');
      const lineCount = lines.length;
      const glyphFont = AppState.config.glyphFont;

      const fontSize = 14;
      const padding = 20;
      const lineHeight = fontSize * 1.35;

      // 用临时 canvas 逐行测宽
      const measureCanvas = document.createElement('canvas');
      const measureCtx = measureCanvas.getContext('2d');
      if (!measureCtx) { this.toastManager.error(this.i18nManager.t('toast.exportPngFailed')); return; }
      measureCtx.font = fontSize + 'px ' + glyphFont;

      let maxWidth = 0;
      const lineWidths = lines.map(function(l) { return Math.ceil(measureCtx.measureText(l).width); });
      lineWidths.forEach(function(w) { if (w > maxWidth) maxWidth = w; });

      const canvas = document.createElement('canvas');
      canvas.className = 'art-export-canvas';
      canvas.width = Math.ceil(maxWidth + padding * 2);
      canvas.height = Math.ceil(lineCount * lineHeight + padding * 2);

      const ctx = canvas.getContext('2d');
      if (!ctx) { this.toastManager.error(this.i18nManager.t('toast.exportPngFailed')); return; }

      // 白底
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 渲染文字（逐行居左）
      ctx.fillStyle = '#1a1a2e';
      ctx.font = fontSize + 'px ' + glyphFont;
      ctx.textBaseline = 'top';

      lines.forEach((line, i) => {
        ctx.fillText(line, padding, padding + i * lineHeight);
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        this.downloadBlob(blob, 'unicode-art.png');
        this.toastManager.success(this.i18nManager.t('toast.exportPng'));
      } else {
        this.toastManager.error(this.i18nManager.t('toast.exportPngFailed'));
      }
    } catch (error) {
      console.error('PNG导出失败:', error);
      this.toastManager.error(this.i18nManager.t('toast.generateFailed', { message: error.message }));
    }
  }

  async copyToClipboard() {
    if (!AppState.result) { this.toastManager.warning(this.i18nManager.t('toast.exportFirst')); return; }
    try {
      const content = this.getExportContent();
      await navigator.clipboard.writeText(content);
      this.toastManager.success(this.i18nManager.t('toast.copyDone'));
    } catch (_) {
      // 降级: 创建临时textarea
      try {
        const textarea = document.createElement('textarea');
        textarea.value = this.getExportContent();
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.toastManager.success(this.i18nManager.t('toast.copyDone'));
      } catch (_2) {
        this.toastManager.error(this.i18nManager.t('toast.copyFailed'));
      }
    }
  }

  /**
   * 获取当前结果内容（根据输出格式处理）
   */
  getExportContent() {
    if (!AppState.result) return '';
    // Core返回的结果已经是最终渲染的文本
    return AppState.result.content;
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showLoading(show) {
    AppState.loading = show;
    $(DOM.loadingOverlay).toggle(show);
  }
}

//#endregion

ensureJQuery().then(($ready) => {
  $ready(document).ready(() => {
    if (!window.UnicodeArtCore) console.error('Core库未加载');
    window.app = new AppController();
  });
}).catch((error) => {
  console.error('jQuery加载失败:', error);
});
