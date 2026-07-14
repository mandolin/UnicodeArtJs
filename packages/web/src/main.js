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
    'editor.sourceRegion': '编辑器源文件与模板',
    'editor.previewRegion': '编辑器预览',
    'editor.title': '艺术字与布局编辑器',
    'editor.experimental': '实验性',
    'editor.kind': '编辑内容',
    'editor.kind.document': '布局文档',
    'editor.kind.font': 'UAF 艺术字字体',
    'editor.preset': '内置示例',
    'editor.preset.documentTable': '标题表格',
    'editor.preset.documentArtFont': '嵌入艺术字 Banner',
    'editor.preset.fontLine': '线条艺术字',
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
    'config.glyphWidthHelp': '该选项目前用于冻结配置契约，后续会进一步接入更精细的字素宽度计算。',
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
    'editor.sourceRegion': 'Editor source and templates',
    'editor.previewRegion': 'Editor preview',
    'editor.title': 'Art Font and Layout Editor',
    'editor.experimental': 'Experimental',
    'editor.kind': 'Content type',
    'editor.kind.document': 'Layout document',
    'editor.kind.font': 'UAF art font',
    'editor.preset': 'Built-in example',
    'editor.preset.documentTable': 'Header table',
    'editor.preset.documentArtFont': 'Embedded art-font banner',
    'editor.preset.fontLine': 'Line art font',
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
    'config.glyphWidthHelp': 'This option freezes the config contract for now; finer glyph-width calculation will be integrated later.',
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
  glyphFont: '#glyphFont',
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
  editorSource: '#editorSource',
  editorFontOptions: '#editorFontOptions',
  editorFontSample: '#editorFontSample',
  editorEmbedFont: '#editorEmbedFont',
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
  ];
}

/** P3.4 的浏览器本地工作区结构。 */
function createDefaultEditorWorkspace() {
  const templates = getEditorBuiltinTemplates();
  return {
    kind: 'document',
    documentSource: templates.find((template) => template.id === 'document-table').source,
    fontSource: templates.find((template) => template.id === 'font-line').source,
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
  }

  initialize() {
    this.syncControlsFromWorkspace();
    this.refreshLocale();
    this.applyGlyphFont();
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
    $doc.on('click', DOM.editorEmbedFont, () => this.embedFontInDocument());
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
    return this.workspace.kind === 'font' ? this.workspace.fontSource : this.workspace.documentSource;
  }

  updateCurrentSource(source) {
    if (this.workspace.kind === 'font') this.workspace.fontSource = source;
    else this.workspace.documentSource = source;
    this.persistWorkspace();
  }

  changeKind(kind) {
    if (kind !== 'document' && kind !== 'font') return;
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
    const workspaceKind = kind === 'unicode-art-font' ? 'font' : 'document';
    if (typeof source !== 'string' || !source.trim()) return;
    this.workspace.kind = workspaceKind;
    if (workspaceKind === 'font') {
      this.workspace.fontSource = source;
      if (typeof sample === 'string' && sample) this.workspace.fontSample = sample;
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
    $(DOM.editorFontOptions).prop('hidden', !isFont);
    $(DOM.editorFormatLabel).text(isFont ? 'unicode-art-font@1' : 'semantic-document@1');
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

    const parsed = JSON.parse(source);
    const document = adapter.validateSemanticDocument(parsed, { locale: AppState.config.locale });
    return {
      kind,
      value: document,
      summary: `${document.rows.length}`,
    };
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
      } else {
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
      }

      if (request !== this.renderGeneration) return;
      this.result = result;
      $(DOM.editorPreview).text(result.content);
      $(DOM.editorMeta).text(this.t('editor.metaReady', { cols: result.cols, rows: result.rows }));
      this.setStatus('editor.status.rendered', {}, 'success');
    } catch (error) {
      if (request === this.renderGeneration) this.handleEditorError(error);
    } finally {
      if (request === this.renderGeneration) this.appController.showLoading(false);
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
      const kind = parsed?.format === 'unicode-art-font' ? 'font' : 'document';
      this.validateSource(source, kind);
      this.workspace.kind = kind;
      this.updateCurrentSource(source);
      this.syncControlsFromWorkspace();
      this.refreshLocale();
      this.result = null;
      this.setPreviewPlaceholder(this.t('editor.previewPlaceholder'));
      this.setStatus('editor.status.imported', {}, 'success');
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
    const extension = this.workspace.kind === 'font' ? 'uafont.json' : 'uadoc.json';
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
      return {
        kind: stored.kind === 'font' ? 'font' : 'document',
        documentSource: typeof stored.documentSource === 'string' ? stored.documentSource : fallback.documentSource,
        fontSource: typeof stored.fontSource === 'string' ? stored.fontSource : fallback.fontSource,
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
        && (template.kind === 'document' || template.kind === 'font')
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
 * 🔹 本阶段不支持上传、远程 URL、账户、评论或任何可执行扩展。
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

//#region 🟩 应用控制器

class AppController {
  constructor() {
    this.i18nManager = new I18nManager();
    this.themeManager = new ThemeManager();
    this.toastManager = new ToastManager();
    this.artGenerator = new ArtGenerator();
    this.editorController = new EditorController(this);
    this.galleryController = new GalleryController(this);

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
    $doc.on('change', DOM.fontSelect, (e) => { this.setConfigQuiet('font', $(e.target).val()); this.debouncedRefresh(); });
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
   * 切换三个独立工作台。
   *
   * 转换器、编辑器和画廊都使用 HTML `hidden` 语义，避免仅靠视觉样式隐藏
   * 后仍被键盘焦点访问。画廊首次激活时才读取同源静态索引。
   */
  async switchMode(mode) {
    if (!['image', 'text', 'editor', 'gallery'].includes(mode)) return;
    $(DOM.modeButtons).removeClass('active');
    $(`${DOM.modeButtons}[data-mode="${mode}"]`).addClass('active');
    if (mode === 'editor') {
      $(DOM.converterWorkbench).prop('hidden', true);
      $(DOM.galleryWorkbench).prop('hidden', true);
      $(DOM.editorWorkbench).prop('hidden', false);
      AppState.mode = mode;
      this.editorController.activate();
      return;
    }

    if (mode === 'gallery') {
      $(DOM.converterWorkbench).prop('hidden', true);
      $(DOM.editorWorkbench).prop('hidden', true);
      $(DOM.galleryWorkbench).prop('hidden', false);
      AppState.mode = mode;
      await this.galleryController.activate();
      return;
    }

    $(DOM.editorWorkbench).prop('hidden', true);
    $(DOM.galleryWorkbench).prop('hidden', true);
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
    // 字素字体既影响预览 CSS，也影响 Core 的字符模板，必须重新生成。
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
