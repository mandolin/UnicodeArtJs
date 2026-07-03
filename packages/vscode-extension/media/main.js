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
  };

  const elements = {
    mode: document.getElementById('mode'),
    input: document.getElementById('input'),
    imageInputWrap: document.getElementById('imageInputWrap'),
    imageInput: document.getElementById('imageInput'),
    imageName: document.getElementById('imageName'),
    height: document.getElementById('height'),
    width: document.getElementById('width'),
    charset: document.getElementById('charset'),
    customCharsWrap: document.getElementById('customCharsWrap'),
    customChars: document.getElementById('customChars'),
    font: document.getElementById('font'),
    glyphFont: document.getElementById('glyphFont'),
    glyphFontOptions: document.getElementById('glyphFontOptions'),
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
    convertText: document.getElementById('convertText'),
    cancelConvert: document.getElementById('cancelConvert'),
    copyResult: document.getElementById('copyResult'),
    insertResult: document.getElementById('insertResult'),
    savePreset: document.getElementById('savePreset'),
    saveTxt: document.getElementById('saveTxt'),
    saveHtml: document.getElementById('saveHtml'),
    output: document.getElementById('output'),
    statusText: document.getElementById('statusText'),
    resultMeta: document.getElementById('resultMeta'),
    progress: document.getElementById('progress'),
  };

  function post(type, payload) {
    vscode.postMessage({ type, payload });
  }

  function setStatus(text, progress) {
    elements.statusText.textContent = text;
    elements.progress.value = progress;
  }

  function setBusy(isBusy) {
    state.isBusy = isBusy;
    elements.convertText.disabled = isBusy;
    elements.cancelConvert.disabled = !isBusy;
    elements.copyResult.disabled = isBusy || state.currentResult.length === 0;
    elements.insertResult.disabled = isBusy || state.currentResult.length === 0;
    elements.saveTxt.disabled = isBusy || state.currentResult.length === 0;
    elements.saveHtml.disabled = isBusy || state.currentResult.length === 0;
    elements.savePreset.disabled = isBusy;
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
    const config = payload.config;

    fillSelect(elements.charset, payload.options.charsets, config.charset);
    fillSelect(elements.boxStyle, payload.options.boxStyles, config.box && config.box.style ? config.box.style : 'round');
    fillSelect(elements.insertMode, payload.options.insertModes, config.insertMode);
    fillDatalist(elements.glyphFontOptions, payload.options.glyphFonts || []);

    elements.height.value = String(config.height);
    elements.width.value = config.width === undefined ? '' : String(config.width);
    elements.customChars.value = config.customChars || '';
    elements.font.value = config.visualFont || config.font;
    elements.glyphFont.value = config.glyphFont || "Consolas, 'Courier New', monospace";
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
    setStatus('Ready', 0);
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
      glyphWidthProfile: state.config ? state.config.glyphWidthProfile : 'default',
      wideCharRegex: state.config ? state.config.wideCharRegex : '',
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
      locale: state.config ? state.config.locale : 'zh-CN',
      outputTarget: 'vscode',
    };
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
      return 'Height must be an integer between 1 and 300.';
    }
    if (config.width !== undefined && (!Number.isInteger(config.width) || config.width < 1 || config.width > 1000)) {
      return 'Width must be empty or an integer between 1 and 1000.';
    }
    if (!Number.isFinite(config.matrixSize) || config.matrixSize < 2 || config.matrixSize > 32) {
      return 'Matrix must be between 2 and 32.';
    }
    if (!Number.isFinite(config.ratio) || config.ratio < 0.1 || config.ratio > 10) {
      return 'Ratio must be between 0.1 and 10.';
    }
    if (config.charset === 'CUSTOM' && config.customChars.trim().length === 0) {
      return 'Custom Chars is required when charset is CUSTOM.';
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
        setStatus('Please choose an image file.', 0);
        setBusy(false);
        return;
      }
      if (state.imageSize > 10 * 1024 * 1024) {
        setStatus('Large image selected; conversion may take a while.', 0.05);
      }
      setStatus('Sending image...', 0.1);
      post('convertImage', {
        imageData: state.imageData,
        fileName: state.imageFileName,
        config,
        requestId,
      });
      return;
    }
    if (elements.input.value.length === 0) {
      setStatus('Input Text cannot be empty.', 0);
      setBusy(false);
      return;
    }
    setStatus('Sending request...', 0.1);
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
    setStatus('Canceling conversion...', elements.progress.value);
    setBusy(false);
    state.activeRequestId = '';
  });
  elements.mode.addEventListener('change', updateModeVisibility);
  elements.charset.addEventListener('change', updateCustomCharsVisibility);
  elements.glyphFont.addEventListener('input', applyGlyphFont);
  elements.imageInput.addEventListener('change', () => {
    const file = elements.imageInput.files && elements.imageInput.files[0];
    if (!file) {
      state.imageData = '';
      state.imageFileName = '';
      state.imageSize = 0;
      elements.imageName.textContent = 'No image selected';
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      state.imageData = typeof reader.result === 'string' ? reader.result : '';
      state.imageFileName = file.name;
      state.imageSize = file.size;
      elements.imageName.textContent = `${file.name} (${formatBytes(file.size)})`;
      setStatus('Image ready', 0);
    });
    reader.addEventListener('error', () => {
      state.imageData = '';
      state.imageFileName = '';
      state.imageSize = 0;
      elements.imageName.textContent = 'Failed to load image';
      setStatus('Failed to load image.', 0);
    });
    reader.readAsDataURL(file);
  });
  elements.copyResult.addEventListener('click', () => post('copy', { content: state.currentResult }));
  elements.insertResult.addEventListener('click', () => post('insert', {
    content: state.currentResult,
    mode: elements.insertMode.value,
  }));
  elements.savePreset.addEventListener('click', () => {
    const config = collectConfig();
    post('savePreset', { config });
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
        elements.resultMeta.textContent = `${message.payload.source} | ${message.payload.cols} cols x ${message.payload.rows} rows | ${formatBytes(message.payload.content.length)}`;
        state.activeRequestId = '';
        setBusy(false);
        setStatus(`Done (${message.payload.cols}x${message.payload.rows})`, 1);
        break;
      case 'error':
        state.activeRequestId = '';
        setBusy(false);
        setStatus(`Error: ${message.payload.message}`, 0);
        break;
      case 'notice':
        if (message.payload.message.includes('canceled')) {
          state.activeRequestId = '';
          setBusy(false);
        }
        setStatus(message.payload.message, elements.progress.value);
        break;
      default:
        setStatus('Unknown host message', 0);
    }
  });

  post('ready');

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }
}());
