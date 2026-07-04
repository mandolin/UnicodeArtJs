(function () {
  const vscode = acquireVsCodeApi();
  const state = {
    config: null,
    currentResult: '',
    imageData: '',
    imageFileName: '',
    imageSize: 0,
    activeRequestId: '',
    isBusy: false,
    templates: { defaultConfigured: false, slots: [] },
    i18n: {},
  };

  const elements = {
    mode: document.getElementById('mode'),
    controlsPanel: document.getElementById('controlsPanel'),
    input: document.getElementById('input'),
    imageInputWrap: document.getElementById('imageInputWrap'),
    imageInput: document.getElementById('imageInput'),
    imageName: document.getElementById('imageName'),
    imageMeta: document.getElementById('imageMeta'),
    clearImage: document.getElementById('clearImage'),
    height: document.getElementById('height'),
    width: document.getElementById('width'),
    charset: document.getElementById('charset'),
    customCharsWrap: document.getElementById('customCharsWrap'),
    customChars: document.getElementById('customChars'),
    font: document.getElementById('font'),
    visualFontOptions: document.getElementById('visualFontOptions'),
    glyphFont: document.getElementById('glyphFont'),
    glyphFontOptions: document.getElementById('glyphFontOptions'),
    fontWarning: document.getElementById('fontWarning'),
    matrixSize: document.getElementById('matrixSize'),
    ratio: document.getElementById('ratio'),
    invert: document.getElementById('invert'),
    trimTrailingSpaces: document.getElementById('trimTrailingSpaces'),
    fontReduce: document.getElementById('fontReduce'),
    boxEnabled: document.getElementById('boxEnabled'),
    boxStyle: document.getElementById('boxStyle'),
    boxTitle: document.getElementById('boxTitle'),
    boxShadow: document.getElementById('boxShadow'),
    boxPadding: document.getElementById('boxPadding'),
    boxMargin: document.getElementById('boxMargin'),
    insertMode: document.getElementById('insertMode'),
    glyphWidthProfile: document.getElementById('glyphWidthProfile'),
    wideCharRegex: document.getElementById('wideCharRegex'),
    outputTarget: document.getElementById('outputTarget'),
    locale: document.getElementById('locale'),
    convertText: document.getElementById('convertText'),
    cancelConvert: document.getElementById('cancelConvert'),
    copyResult: document.getElementById('copyResult'),
    insertResult: document.getElementById('insertResult'),
    saveDefaultTemplate: document.getElementById('saveDefaultTemplate'),
    templateSlot: document.getElementById('templateSlot'),
    saveTemplateSlot: document.getElementById('saveTemplateSlot'),
    saveTxt: document.getElementById('saveTxt'),
    saveHtml: document.getElementById('saveHtml'),
    output: document.getElementById('output'),
    statusText: document.getElementById('statusText'),
    resultMeta: document.getElementById('resultMeta'),
    templateStatus: document.getElementById('templateStatus'),
    progress: document.getElementById('progress'),
  };

  function post(type, payload) {
    vscode.postMessage({ type, payload });
  }

  function setStatus(text, progress) {
    elements.statusText.textContent = text;
    elements.progress.value = progress;
  }

  function localize(key, params) {
    const template = state.i18n[key] || key;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(params && params[name] !== undefined ? params[name] : `{${name}}`));
  }

  function applyLocalization(messages) {
    state.i18n = messages || {};
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = localize(element.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      element.setAttribute('placeholder', localize(element.dataset.i18nPlaceholder));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      element.setAttribute('aria-label', localize(element.dataset.i18nAriaLabel));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((element) => {
      element.setAttribute('title', localize(element.dataset.i18nTitle));
    });
  }

  function setBusy(isBusy) {
    state.isBusy = isBusy;
    elements.convertText.disabled = isBusy;
    elements.cancelConvert.disabled = !isBusy;
    elements.copyResult.disabled = isBusy || state.currentResult.length === 0;
    elements.insertResult.disabled = isBusy || state.currentResult.length === 0;
    elements.saveTxt.disabled = isBusy || state.currentResult.length === 0;
    elements.saveHtml.disabled = isBusy || state.currentResult.length === 0;
    elements.saveDefaultTemplate.disabled = isBusy;
    elements.saveTemplateSlot.disabled = isBusy;
    elements.templateSlot.disabled = isBusy;
    elements.controlsPanel.querySelectorAll('input, select, textarea').forEach((control) => {
      control.disabled = isBusy;
    });
  }

  function fillSelect(select, values, current) {
    select.textContent = '';
    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      if (value === current) option.selected = true;
      select.appendChild(option);
    });
  }

  function fillDatalist(datalist, values) {
    datalist.textContent = '';
    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      datalist.appendChild(option);
    });
  }

  function applyInitialState(payload) {
    state.config = payload.config;
    applyLocalization(payload.i18n);
    const config = payload.config;

    fillSelect(elements.charset, payload.options.charsets, config.charset);
    fillSelect(elements.boxStyle, payload.options.boxStyles, config.box && config.box.style ? config.box.style : 'round');
    fillSelect(elements.insertMode, payload.options.insertModes, config.insertMode);
    fillSelect(elements.outputTarget, payload.options.outputTargets, config.outputTarget);
    fillSelect(elements.locale, payload.options.locales, config.locale);
    fillDatalist(elements.visualFontOptions, payload.options.visualFonts || []);
    fillDatalist(elements.glyphFontOptions, payload.options.glyphFonts || []);
    applyTemplateState(payload.templates);

    elements.height.value = String(config.height);
    elements.width.value = config.width === undefined ? '' : String(config.width);
    elements.customChars.value = config.customChars || '';
    elements.font.value = config.visualFont || config.font;
    elements.glyphFont.value = config.glyphFont || "Consolas, 'Courier New', monospace";
    elements.glyphWidthProfile.value = config.glyphWidthProfile || 'default';
    elements.wideCharRegex.value = config.wideCharRegex || '';
    elements.matrixSize.value = String(config.matrixSize);
    elements.ratio.value = String(config.ratio);
    elements.invert.checked = Boolean(config.invert);
    elements.trimTrailingSpaces.checked = Boolean(config.trimTrailingSpaces);
    elements.fontReduce.value = String(config.fontReduce);
    elements.boxEnabled.checked = Boolean(config.box);
    elements.boxTitle.value = config.box && config.box.title ? String(config.box.title) : '';
    elements.boxShadow.checked = Boolean(config.box && config.box.shadow);
    elements.boxPadding.value = config.box && config.box.padding !== undefined ? String(config.box.padding) : '1';
    elements.boxMargin.value = config.box && config.box.margin !== undefined ? String(config.box.margin) : '0';
    updateCustomCharsVisibility();
    updateModeVisibility();
    applyGlyphFont();
    updateFontWarning();
    setStatus(localize('web.ready'), 0);
    setBusy(false);
  }

  function collectConfig() {
    const boxEnabled = elements.boxEnabled.checked;
    return {
      height: numberOr(elements.height.value, 20),
      width: optionalNumber(elements.width.value),
      charset: elements.charset.value,
      customChars: elements.customChars.value,
      // 视觉字体用于输入文字渲染，保留 font 作为旧配置别名。
      visualFont: elements.font.value,
      font: elements.font.value,
      // 字素字体用于 Converter 预览和后续 HTML 导出显示。
      glyphFont: elements.glyphFont.value,
      glyphWidthProfile: elements.glyphWidthProfile.value.trim() || 'default',
      wideCharRegex: elements.wideCharRegex.value.trim(),
      matrixSize: numberOr(elements.matrixSize.value, 6),
      ratio: numberOr(elements.ratio.value, 2),
      invert: elements.invert.checked,
      trimTrailingSpaces: elements.trimTrailingSpaces.checked,
      fontReduce: numberOr(elements.fontReduce.value, 0),
      box: boxEnabled
        ? {
            enabled: true,
            style: elements.boxStyle.value,
            padding: numberOr(elements.boxPadding.value, 1),
            margin: numberOr(elements.boxMargin.value, 0),
            title: elements.boxTitle.value.trim() || undefined,
            shadow: elements.boxShadow.checked,
          }
        : false,
      insertMode: elements.insertMode.value,
      preset: state.config ? state.config.preset : 'default',
      locale: elements.locale.value || (state.config ? state.config.locale : 'zh-CN'),
      outputTarget: elements.outputTarget.value || 'vscode',
    };
  }

  function applyTemplateState(templates) {
    state.templates = templates || { defaultConfigured: false, slots: [] };
    elements.templateSlot.textContent = '';
    state.templates.slots.forEach((item) => {
      const option = document.createElement('option');
      option.value = String(item.slot);
      option.textContent = item.configured
        ? `${item.label} (${item.preset || localize('web.savedFallback')})`
        : `${item.label} (${localize('web.empty')})`;
      elements.templateSlot.appendChild(option);
    });

    const defaultText = state.templates.defaultConfigured
      ? localize('web.defaultSaved')
      : localize('web.defaultUsesSettings');
    const savedSlots = state.templates.slots
      .filter((item) => item.configured)
      .map((item) => item.label)
      .join(', ');
    elements.templateStatus.textContent = savedSlots
      ? `${defaultText} | ${localize('web.saved')}: ${savedSlots}`
      : `${defaultText} | ${localize('web.noCustomTemplates')}`;
  }

  function numberOr(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function optionalNumber(value) {
    if (value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function validateConfig(config) {
    if (!Number.isInteger(config.height) || config.height < 1 || config.height > 300) {
      return localize('web.heightValidation');
    }
    if (config.width !== undefined && (!Number.isInteger(config.width) || config.width < 1 || config.width > 1000)) {
      return localize('web.widthValidation');
    }
    if (!Number.isFinite(config.matrixSize) || config.matrixSize < 2 || config.matrixSize > 32) {
      return localize('web.matrixValidation');
    }
    if (!Number.isFinite(config.ratio) || config.ratio < 0.1 || config.ratio > 10) {
      return localize('web.ratioValidation');
    }
    if (config.charset === 'CUSTOM' && config.customChars.trim().length === 0) {
      return localize('web.customCharsRequired');
    }
    return '';
  }

  function updateCustomCharsVisibility() {
    elements.customCharsWrap.hidden = elements.charset.value !== 'CUSTOM';
  }

  function updateModeVisibility() {
    const imageMode = elements.mode.value === 'image';
    elements.input.parentElement.hidden = imageMode;
    elements.imageInputWrap.hidden = !imageMode;
  }

  function applyGlyphFont() {
    elements.output.style.fontFamily = elements.glyphFont.value || "Consolas, 'Courier New', monospace";
  }

  function updateFontWarning() {
    const glyphFont = elements.glyphFont.value.toLowerCase();
    const visualFont = elements.font.value.toLowerCase();
    const boxStyle = elements.boxStyle.value;
    const boxEnabled = elements.boxEnabled.checked;
    let message = '';

    if (boxEnabled && boxStyle === 'round' && (glyphFont.includes('nsimsun') || glyphFont.includes('新宋体'))) {
      message = localize('web.fontWarningRoundNSimSun');
    } else if (glyphFont.includes('微软雅黑 mono') || glyphFont.includes('microsoft yahei mono') || visualFont.includes('微软雅黑 mono') || visualFont.includes('microsoft yahei mono')) {
      message = localize('web.fontWarningYaHeiMono');
    }

    elements.fontWarning.textContent = message;
    elements.fontWarning.hidden = message.length === 0;
  }

  function convert() {
    const config = collectConfig();
    const validationError = validateConfig(config);
    if (validationError) {
      setStatus(validationError, 0);
      return;
    }

    const requestId = createRequestId();
    state.activeRequestId = requestId;
    setBusy(true);

    if (elements.mode.value === 'image') {
      if (!state.imageData) {
        setStatus(localize('web.chooseImage'), 0);
        setBusy(false);
        return;
      }
      if (state.imageSize > 10 * 1024 * 1024) {
        setStatus(localize('web.largeImage'), 0.05);
      }
      setStatus(localize('web.sendingImage'), 0.1);
      post('convertImage', {
        imageData: state.imageData,
        fileName: state.imageFileName,
        fileSize: state.imageSize,
        mimeType: getImageMimeType(),
        config,
        requestId,
      });
      return;
    }
    if (elements.input.value.length === 0) {
      setStatus(localize('web.inputRequired'), 0);
      setBusy(false);
      return;
    }
    setStatus(localize('web.sendingRequest'), 0.1);
    post('convertText', {
      text: elements.input.value,
      config,
      requestId,
    });
  }

  function createRequestId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  elements.convertText.addEventListener('click', convert);
  elements.cancelConvert.addEventListener('click', () => {
    if (!state.activeRequestId) return;
    post('cancel', { requestId: state.activeRequestId });
    setStatus(localize('web.canceling'), elements.progress.value);
    setBusy(false);
    state.activeRequestId = '';
  });
  elements.mode.addEventListener('change', updateModeVisibility);
  elements.charset.addEventListener('change', updateCustomCharsVisibility);
  elements.font.addEventListener('input', updateFontWarning);
  elements.glyphFont.addEventListener('input', () => {
    applyGlyphFont();
    updateFontWarning();
  });
  elements.boxEnabled.addEventListener('change', updateFontWarning);
  elements.boxStyle.addEventListener('change', updateFontWarning);
  elements.imageInput.addEventListener('change', () => {
    const file = elements.imageInput.files && elements.imageInput.files[0];
    if (!file) {
      state.imageData = '';
      state.imageFileName = '';
      state.imageSize = 0;
      elements.imageName.textContent = localize('web.noImageSelected');
      elements.imageMeta.textContent = '';
      elements.clearImage.disabled = true;
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      state.imageData = typeof reader.result === 'string' ? reader.result : '';
      state.imageFileName = file.name;
      state.imageSize = file.size;
      elements.imageName.textContent = file.name;
      elements.imageMeta.textContent = localize('web.imageDetails', {
        name: file.name,
        type: file.type || 'unknown',
        size: formatBytes(file.size),
      });
      elements.clearImage.disabled = false;
      setStatus(localize('web.imageReady'), 0);
    });
    reader.addEventListener('error', () => {
      state.imageData = '';
      state.imageFileName = '';
      state.imageSize = 0;
      elements.imageName.textContent = localize('web.failedToLoadImage');
      elements.imageMeta.textContent = '';
      elements.clearImage.disabled = true;
      setStatus(localize('web.failedToLoadImage'), 0);
    });
    reader.readAsDataURL(file);
  });
  elements.clearImage.addEventListener('click', clearImage);
  elements.copyResult.addEventListener('click', () => post('copy', { content: state.currentResult }));
  elements.insertResult.addEventListener('click', () => post('insert', {
    content: state.currentResult,
    mode: elements.insertMode.value,
  }));
  elements.saveDefaultTemplate.addEventListener('click', () => {
    const config = {
      ...collectConfig(),
      preset: 'default',
    };
    post('savePreset', { config, target: 'default' });
  });
  elements.saveTemplateSlot.addEventListener('click', () => {
    const slot = numberOr(elements.templateSlot.value, 1);
    const config = collectConfig();
    post('savePreset', {
      config: {
        ...config,
        preset: `template-${slot}`,
      },
      target: 'slot',
      slot,
    });
  });
  elements.saveTxt.addEventListener('click', () => post('save', { content: state.currentResult, format: 'txt' }));
  elements.saveHtml.addEventListener('click', () => post('save', {
    content: state.currentResult,
    format: 'html',
    glyphFont: collectConfig().glyphFont,
  }));

  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'readyAck':
        applyInitialState(message.payload);
        break;
      case 'progress':
        setStatus(message.payload.stage, message.payload.progress);
        break;
      case 'result':
        state.currentResult = message.payload.content;
        applyGlyphFont();
        elements.output.textContent = message.payload.content;
        elements.resultMeta.textContent = localize('web.meta', {
          source: message.payload.source,
          cols: message.payload.cols,
          rows: message.payload.rows,
          chars: message.payload.content.length,
          preset: collectConfig().preset,
        });
        state.activeRequestId = '';
        setBusy(false);
        setStatus(localize('web.done', { cols: message.payload.cols, rows: message.payload.rows }), 1);
        break;
      case 'templateState':
        applyTemplateState(message.payload);
        break;
      case 'error':
        state.activeRequestId = '';
        setBusy(false);
        setStatus(message.payload.code
          ? localize('web.errorWithCode', { message: message.payload.message, code: message.payload.code })
          : localize('web.error', { message: message.payload.message }), 0);
        break;
      case 'notice':
        if (message.payload.message.includes('canceled')) {
          state.activeRequestId = '';
          setBusy(false);
        }
        setStatus(message.payload.message, elements.progress.value);
        break;
      default:
        setStatus(localize('web.unknownHostMessage'), 0);
    }
  });

  post('ready');

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  function clearImage() {
    state.imageData = '';
    state.imageFileName = '';
    state.imageSize = 0;
    elements.imageInput.value = '';
    elements.imageName.textContent = localize('web.noImageSelected');
    elements.imageMeta.textContent = '';
    elements.clearImage.disabled = true;
    setStatus(localize('web.noImageSelected'), 0);
  }

  function getImageMimeType() {
    const match = /^data:([^;,]+);/u.exec(state.imageData);
    return match ? match[1] : '';
  }
}());
