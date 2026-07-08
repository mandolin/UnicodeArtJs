/**
 * ============================================================================
 * 🟦 UnicodeArtJs Web 主入口
 * ============================================================================
 *
 * @module main.js
 * @author Comate
 * @since 0.1.0-alpha
 * @license MIT
 * ============================================================================
 */

//#region 🟩 应用状态

let $ = window.jQuery || window.$;

function detectCoreLocale() {
  const language = navigator.language || navigator.userLanguage || 'zh-CN';
  return language.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
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

const AppState = {
  mode: 'image',
  imageFile: null,
  textContent: '',
  config: {
    height: 20,
    width: '',
    charset: 'ASCII',
    customChars: '',
    font: 'Noto Sans SC',
    glyphFont: "'Sarasa Mono SC', 'LXGW WenKai Mono', 'Source Code Pro', 'Liberation Mono', monospace",
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

    // 主题
    themeName: 'default',
  },
  result: null,
  loading: false,
};

//#endregion

//#region 🟩 DOM缓存

const DOM = {
  modeButtons: '.mode-btn',
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
  loadingOverlay: '#loadingOverlay',
  toastContainer: '#toastContainer',
};

//#endregion

//#region 🟩 主题管理

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

    this.currentTheme = this.loadTheme() || 'default';
    this.applyTheme(this.currentTheme);
  }

  // 获取所有主题
  getThemeList() { return this.themes; }

  // 获取主题
  getTheme(key) { return this.themes.find(t => t.key === key); }

  loadTheme() { return AppState.config.themeName || localStorage.getItem('unicode-art-theme'); }

  saveTheme(t) {
    AppState.config.themeName = t;
    localStorage.setItem('unicode-art-theme', t);
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
    return {
      height: parseInt(cfg.height) || 20,
      width: cfg.width ? parseInt(cfg.width) : undefined,
      charset: charsetType === 'CUSTOM'
        ? { type: 'CUSTOM', customChars: cfg.customChars || ' .:-=+*#%@' }
        : { type: charsetType },
      font: cfg.font,
      visualFont: {
        family: cfg.font,
        reduce: parseInt(cfg.fontReduce) || 0,
      },
      glyphFont: {
        family: cfg.glyphFont,
        widthProfile: cfg.glyphWidthProfile || 'default',
        wideCharRegex: cfg.wideCharRegex || undefined,
      },
      glyphFontFamily: cfg.glyphFont,
      glyphWidthProfile: cfg.glyphWidthProfile || 'default',
      wideCharRegex: cfg.wideCharRegex || undefined,
      matrixSize: parseInt(cfg.matrixSize) || 6,
      ratio: parseFloat(cfg.ratio) || 2.0,
      interpolation: cfg.interpolation,
      wideCharRatio: parseFloat(cfg.wideCharRatio) || 2.0,
      invert: cfg.invert,
      trimTrailingSpaces: cfg.trimTrailing,
      enableEarlyTermination: cfg.earlyTermination !== false,
      fontReduce: parseInt(cfg.fontReduce) || 0,
      charSpace: parseInt(cfg.charSpace) || 1,
      locale: cfg.locale || detectCoreLocale(),
      outputFormat: 'plain', // 预览统一用plain，导出时再切换
      outputTarget: 'web',
      box: cfg.boxEnabled
        ? {
            enabled: true,
            style: cfg.boxStyle,
            padding: parseInt(cfg.boxPadding) || 1,
            margin: parseInt(cfg.boxMargin) || 0,
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

//#region 🟩 应用控制器

class AppController {
  constructor() {
    this.themeManager = new ThemeManager();
    this.toastManager = new ToastManager();
    this.artGenerator = new ArtGenerator();

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
    this.detectTouchDevice();
    this.bindEvents();
    this.loadConfig();
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
        $('.upload-text').text('点击选择图片');
        $('.upload-hint').text('移动端暂不支持拖拽');
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
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      $sel.append(`<option value="${name}" ${name === currentVal ? 'selected' : ''}>${label}</option>`);
    });
  }

  bindEvents() {
    const $doc = $(document);

    // 模式
    $doc.on('click', DOM.modeButtons, (e) => this.handleModeSwitch(e));

    // 上传
    $doc.on('click', DOM.uploadZone, () => $(DOM.fileInput).click());
    $doc.on('change', DOM.fileInput, (e) => this.handleFileSelect(e));
    $doc.on('dragover', DOM.uploadZone, (e) => { e.preventDefault(); e.stopPropagation(); $(DOM.uploadZone).addClass('dragover'); });
    $doc.on('dragleave', DOM.uploadZone, (e) => { e.preventDefault(); e.stopPropagation(); $(DOM.uploadZone).removeClass('dragover'); });
    $doc.on('drop', DOM.uploadZone, (e) => this.handleDrop(e));
    $doc.on('click', DOM.clearImage, () => this.clearImage());
    $doc.on('input', DOM.textInput, (e) => { AppState.textContent = $(e.target).val(); this.debouncedRefresh(); });

    // 基本配置（防抖）
    $doc.on('input', DOM.heightInput, (e) => { this.setConfigQuiet('height', $(e.target).val()); });
    $doc.on('input', DOM.widthInput, (e) => { this.setConfigQuiet('width', $(e.target).val()); });
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
    $doc.on('input', DOM.charSpace, (e) => { this.setNumConfigQuiet('charSpace', $(e.target).val()); this.debouncedRefresh(); });
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

    // 主题
    $doc.on('change', DOM.themeSelect, (e) => { this.themeManager.switchTheme($(e.target).val()); });
  }

  handleModeSwitch(e) {
    const $btn = $(e.currentTarget);
    if ($btn.hasClass('disabled')) return;
    const mode = $btn.data('mode');
    if (mode === AppState.mode) return;
    $(DOM.modeButtons).removeClass('active');
    $btn.addClass('active');
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
    AppState.config.glyphFont = $(e.target).val();
    this.applyGlyphFont();
    this.saveConfig();
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
      else this.toastManager.error('请上传图片文件');
    }
  }

  processImageFile(file) {
    if (file.size > 10 * 1024 * 1024) {
      this.toastManager.error('图片文件过大，请选择小于10MB的图片');
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
    this.toastManager.success('图片已加载');
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
    const saved = localStorage.getItem('unicode-art-config');
    if (saved) {
      try {
        const c = JSON.parse(saved);
        Object.assign(AppState.config, c);
        this.syncUIFromConfig();
      }       catch (e) { /* 陈旧配置忽略 */ }
    }
    this.applyGlyphFont();
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
    $(DOM.boxEnabled).prop('checked', c.boxEnabled);
    $(DOM.boxConfigBody).toggle(c.boxEnabled);
    $(DOM.boxStyle).val(c.boxStyle);
    $(DOM.boxPadding).val(c.boxPadding);
    $(DOM.boxMargin).val(c.boxMargin);
    $(DOM.boxTitle).val(c.boxTitle);
    $(DOM.boxShadow).prop('checked', c.boxShadow);
    // 主题
    if (c.themeName && c.themeName !== 'default') {
      document.documentElement.setAttribute('data-theme', c.themeName);
    }
    $(DOM.themeSelect).val(c.themeName || 'default');
  }

  saveConfig() {
    localStorage.setItem('unicode-art-config', JSON.stringify(AppState.config));
  }

  // 预览

  async refreshPreview() {
    if (AppState.mode === 'image' && !AppState.imageFile) { this.setPlaceholder('请上传图片'); return; }
    if (AppState.mode === 'text' && !AppState.textContent.trim()) { this.setPlaceholder('请输入文字'); return; }

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
    $(DOM.previewInfo).text('正在生成...');

    try {
      const result = await this.artGenerator.generate();
      if (signal.aborted) return; // 旧请求忽略
      if (result) {
        AppState.result = result;
        this.displayResult(result);
      } else {
        this.setPlaceholder('预览区域');
      }
    } catch (error) {
      if (signal.aborted) return;
      this.toastManager.error('生成失败: ' + error.message);
      this.setPlaceholder('生成失败');
    } finally {
      if (!signal.aborted) {
        this.showLoading(false);
      }
    }
  }

  displayResult(result) {
    $(DOM.artPreview).text(result.content);
    $(DOM.previewInfo).text('就绪');
    $(DOM.metaInfo).text(`宽度: ${result.cols} 高度: ${result.rows} 耗时: ${result.duration}ms`);
    this.toastManager.success('字符画生成完成');
  }

  setPlaceholder(text) {
    $(DOM.artPreview).html(`<code class="preview-placeholder">${text}</code>`);
    $(DOM.previewInfo).text('等待输入');
    $(DOM.metaInfo).text('宽度: -- 高度: -- 耗时: --ms');
    AppState.result = null;
  }

  // 参数校验
  validateParams() {
    const cfg = AppState.config;
    const h = parseInt(cfg.height);
    const m = parseInt(cfg.matrixSize);
    const r = parseFloat(cfg.ratio);

    if (isNaN(h) || h < 1) return { valid: false, message: '高度必须大于0' };
    if (cfg.width && (isNaN(parseInt(cfg.width)) || parseInt(cfg.width) < 1)) return { valid: false, message: '宽度必须大于0' };
    if (isNaN(m) || m < 2 || m > 20) return { valid: false, message: '矩阵大小必须在2-20之间' };
    if (isNaN(r) || r < 1.0 || r > 3.0) return { valid: false, message: '宽高比必须在1.0-3.0之间' };

    const wr = parseFloat(cfg.wideCharRatio);
    if (isNaN(wr) || wr <= 0 || wr > 10) return { valid: false, message: '宽字符比例必须在0-10之间' };

    return { valid: true };
  }

  // 导出

  exportTxt() {
    if (!AppState.result) { this.toastManager.warning('请先生成字符画'); return; }
    const content = this.getExportContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, 'unicode-art.txt');
    this.toastManager.success('已导出为TXT');
  }

  exportHtml() {
    if (!AppState.result) { this.toastManager.warning('请先生成字符画'); return; }
    const content = this.getExportContent();
    const glyphFont = AppState.config.glyphFont;
    const html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n'
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
    this.toastManager.success('已导出为HTML');
  }

  async exportPng() {
    if (!AppState.result) { this.toastManager.warning('请先生成字符画'); return; }

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
      if (!measureCtx) { this.toastManager.error('浏览器不支持Canvas'); return; }
      measureCtx.font = fontSize + 'px ' + glyphFont;

      let maxWidth = 0;
      const lineWidths = lines.map(function(l) { return Math.ceil(measureCtx.measureText(l).width); });
      lineWidths.forEach(function(w) { if (w > maxWidth) maxWidth = w; });

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(maxWidth + padding * 2);
      canvas.height = Math.ceil(lineCount * lineHeight + padding * 2);

      const ctx = canvas.getContext('2d');
      if (!ctx) { this.toastManager.error('浏览器不支持Canvas'); return; }

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
        this.toastManager.success('已导出为PNG');
      } else {
        this.toastManager.error('PNG导出失败');
      }
    } catch (error) {
      console.error('PNG导出失败:', error);
      this.toastManager.error('PNG导出失败: ' + error.message);
    }
  }

  async copyToClipboard() {
    if (!AppState.result) { this.toastManager.warning('请先生成字符画'); return; }
    try {
      const content = this.getExportContent();
      await navigator.clipboard.writeText(content);
      this.toastManager.success('已复制到剪贴板');
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
        this.toastManager.success('已复制到剪贴板');
      } catch (_2) {
        this.toastManager.error('复制失败，请手动选择文本复制');
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
