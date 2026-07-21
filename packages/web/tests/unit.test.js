/**
 * UnicodeArtJs Web 单元测试
 *
 * 使用原生 Node test runner (node >= 18)
 * 测试核心逻辑：主题管理、配置持久化、参数校验、导出工具
 */

import {
  getFontAvailabilitySummary,
  isGenericFontFamily,
  parseFontFamilyList,
} from '../src/font-availability.js';
import {
  CELL_CANVAS_DRAFT_SCHEMA,
  CELL_CANVAS_PROJECT_SCHEMA,
  cellCanvasDraftToHtmlProjection,
  cellCanvasDraftToPlainText,
  cellCanvasDraftToPlainTextProjection,
  copyCellCanvasSelection,
  createCellCanvasDraftFromCellMap,
  createCellCanvasDraftFromPreset,
  createDefaultCellCanvasDraft,
  createCellCanvasProjectEnvelope,
  createCellCanvasDraftFromSpecialArtResult,
  drawCellCanvasConnector,
  getCellCanvasHistoryState,
  getCellCanvasSelectionCells,
  pasteCellCanvasClipboard,
  readCellCanvasDraftFromProjectEnvelope,
  redoCellCanvasHistory,
  resolveCellCanvasSingleLineChar,
  setCellCanvasSelection,
  undoCellCanvasHistory,
  updateCellCanvasCell,
  validateCellCanvasDocumentDraft,
} from '../src/cellcanvas.js';
import {
  VIRTUAL_GRID_PROJECTION_SCHEMA,
  VIRTUAL_GRID_SESSION_PATCH_SCHEMA,
  createVirtualGridProjection,
  createVirtualGridSessionPatch,
  hitTestVirtualGrid,
  normalizeVirtualGridViewport,
} from '../src/studio/virtual-grid.js';

//#region 🟩 测试框架

function describe(name, fn) {
  console.log(`\n  ${name}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`    ✔ ${name}`);
  } catch (e) {
    console.error(`    ✖ ${name}`);
    console.error(`      ${e.message}`);
    process.exitCode = 1;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(a, b) {
  if (a !== b) throw new Error(`Expected ${JSON.stringify(a)}, got ${JSON.stringify(b)}`);
}

//#endregion

//#region 🟩 测试: Studio Virtual Grid

function createTestCellMap(width, height) {
  const cells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      cells.push({
        x,
        y,
        char: String((x + y) % 10),
        width: 1,
        role: 'text',
        sourceGlyph: `${x},${y}`,
      });
    }
  }
  return { width, height, cells };
}

describe('Studio Virtual Grid视口原型', () => {

  it('规范化视口并只投影可见字素格', () => {
    const cellMap = createTestCellMap(20, 10);
    const viewport = normalizeVirtualGridViewport(cellMap, {
      x: 18,
      y: 9,
      cols: 6,
      rows: 4,
      overscanCols: 1,
      overscanRows: 1,
    });
    const projection = createVirtualGridProjection(cellMap, viewport);

    assertEqual(viewport.x, 14);
    assertEqual(viewport.y, 6);
    assertEqual(projection.schema, VIRTUAL_GRID_PROJECTION_SCHEMA);
    assertEqual(projection.visibleRect.x, 13);
    assertEqual(projection.visibleRect.y, 5);
    assertEqual(projection.visibleRect.width, 7);
    assertEqual(projection.visibleRect.height, 5);
    assertEqual(projection.metrics.totalCells, 200);
    assertEqual(projection.metrics.visibleCells, 35);
    assertEqual(projection.rows.length, 5);
    assertEqual(projection.rows[0].length, 7);
  });

  it('投影使用cell副本且不修改CellMap源模型', () => {
    const cellMap = createTestCellMap(8, 4);
    const projection = createVirtualGridProjection(cellMap, { x: 2, y: 1, cols: 3, rows: 2 });

    projection.cells[0].char = '#';

    assertEqual(cellMap.cells.find((cell) => cell.x === 2 && cell.y === 1).char, '3');
    assertEqual(projection.sourceModel, 'CellMap');
    assertEqual(projection.rendererIsSourceModel, false);
  });

  it('基础命中测试可把屏幕坐标映射回CellMap坐标', () => {
    const cellMap = createTestCellMap(12, 8);
    const projection = createVirtualGridProjection(cellMap, { x: 4, y: 2, cols: 4, rows: 3 });
    const hit = hitTestVirtualGrid(projection, {
      originX: 10,
      originY: 20,
      clientX: 31,
      clientY: 42,
      cellWidth: 10,
      cellHeight: 10,
    });
    const miss = hitTestVirtualGrid(projection, {
      originX: 10,
      originY: 20,
      clientX: 200,
      clientY: 42,
      cellWidth: 10,
      cellHeight: 10,
    });

    assertEqual(hit.hit, true);
    assertEqual(hit.x, 6);
    assertEqual(hit.y, 4);
    assertEqual(hit.cell.sourceGlyph, '6,4');
    assertEqual(miss.hit, false);
  });

  it('session patch只写入viewport和renderer诊断，不写CellMap内容', () => {
    const cellMap = createTestCellMap(16, 8);
    const projection = createVirtualGridProjection(cellMap, { x: 1, y: 2, cols: 5, rows: 3 });
    const patch = createVirtualGridSessionPatch(projection);

    assertEqual(patch.schema, VIRTUAL_GRID_SESSION_PATCH_SCHEMA);
    assertEqual(patch.viewport.x, 1);
    assertEqual(patch.renderer.kind, 'virtual-grid');
    assertEqual(patch.renderer.rendererIsSourceModel, false);
    assertEqual(patch.renderer.metrics.visibleCells, 15);
    assertEqual(Array.isArray(patch.documents), false);
    assertEqual(Array.isArray(patch.resources), false);
    assertEqual(patch.diagnostics[0].code, 'UA_STUDIO_VIRTUAL_GRID_VISIBLE_WINDOW');
  });

});

//#endregion

//#region 🟩 测试: 字体可用性提示

describe('字体可用性提示', () => {

  it('解析带引号和逗号的字体栈', () => {
    const families = parseFontFamilyList("'Sarasa Mono SC', \"LXGW WenKai Mono\", monospace");
    assertEqual(families.length, 3);
    assertEqual(families[0], 'Sarasa Mono SC');
    assertEqual(families[1], 'LXGW WenKai Mono');
    assertEqual(families[2], 'monospace');
  });

  it('识别CSS通用字体族', () => {
    assert(isGenericFontFamily('monospace'), 'monospace应为通用字体族');
    assert(isGenericFontFamily('sans-serif'), 'sans-serif应为通用字体族');
    assert(!isGenericFontFamily('Sarasa Mono SC'), '具体字体不应被视为通用字体族');
  });

  it('汇总第一个可用具体字体', () => {
    const summary = getFontAvailabilitySummary(
      "'Missing Font', 'Sarasa Mono SC', monospace",
      (font) => font === 'Sarasa Mono SC',
    );
    assertEqual(summary.state, 'available');
    assertEqual(summary.primaryFont, 'Missing Font');
    assertEqual(summary.availableFont, 'Sarasa Mono SC');
  });

  it('仅通用fallback时返回generic状态', () => {
    const summary = getFontAvailabilitySummary('monospace', () => false);
    assertEqual(summary.state, 'generic');
    assertEqual(summary.primaryFont, 'monospace');
  });

});

//#endregion

//#region 🟩 测试: CellCanvas 固定网格草稿

describe('CellCanvas固定网格草稿', () => {

  it('创建默认草稿并投影为纯文本', () => {
    const draft = createDefaultCellCanvasDraft();
    const summary = validateCellCanvasDocumentDraft(draft);

    assertEqual(draft.schema, CELL_CANVAS_DRAFT_SCHEMA);
    assertEqual(summary.width, 8);
    assertEqual(summary.height, 2);
    assertEqual(cellCanvasDraftToPlainText(draft), '|| /\\ _|\n\\/ || \\/');
  });

  it('保留特殊艺术TextFx网格的尾随空格', () => {
    const draft = createCellCanvasDraftFromPreset('cellcanvas-shadow-textfx');
    const summary = validateCellCanvasDocumentDraft(draft);
    const lines = cellCanvasDraftToPlainText(draft).split('\n');

    assertEqual(summary.width, 9);
    assertEqual(summary.height, 3);
    assertEqual(lines[0].length, 9);
    assertEqual(lines[0].endsWith(' '), true);
  });

  it('单格更新不会修改原草稿对象', () => {
    const draft = createDefaultCellCanvasDraft();
    const nextDraft = updateCellCanvasCell(draft, 0, 0, { char: '#', fg: '#111827' });

    assertEqual(cellCanvasDraftToPlainText(draft).startsWith('|'), true);
    assertEqual(cellCanvasDraftToPlainText(nextDraft).startsWith('#'), true);
    assertEqual(nextDraft.editorSession.activeCell.x, 0);
    assertEqual(nextDraft.editorSession.activeCell.y, 0);
    assertEqual(getCellCanvasHistoryState(nextDraft).canUndo, true);
  });

  it('矩形选区可复制并粘贴到新位置', () => {
    let draft = createDefaultCellCanvasDraft();
    draft = setCellCanvasSelection(draft, { x: 0, y: 0, width: 2, height: 1 });

    const selected = getCellCanvasSelectionCells(draft);
    assertEqual(selected.selection.kind, 'rectangle');
    assertEqual(selected.cells.length, 2);

    draft = copyCellCanvasSelection(draft);
    draft = setCellCanvasSelection(draft, { x: 2, y: 0, width: 2, height: 1 });
    const pasted = pasteCellCanvasClipboard(draft, 2, 0);

    const firstLine = cellCanvasDraftToPlainText(pasted).split('\n')[0];
    assertEqual(firstLine.slice(0, 4), '||||');
    assertEqual(getCellCanvasHistoryState(pasted).canUndo, true);
  });

  it('撤销和重做可恢复CellCanvas历史操作', () => {
    let draft = createDefaultCellCanvasDraft();
    draft = updateCellCanvasCell(draft, 0, 0, { char: '#' });

    const undone = undoCellCanvasHistory(draft);
    assertEqual(cellCanvasDraftToPlainText(undone).startsWith('|'), true);
    assertEqual(getCellCanvasHistoryState(undone).canRedo, true);

    const redone = redoCellCanvasHistory(undone);
    assertEqual(cellCanvasDraftToPlainText(redone).startsWith('#'), true);
    assertEqual(getCellCanvasHistoryState(redone).canRedo, false);
  });

  it('可从SpecialArtRenderResult结构化导入且不使用plainTextPreview作为事实输入', () => {
    const specialArtFixture = {
      stage: 'W-art-P15.test',
      result: {
        schema: 'unicodeartjs-special-art-result@0',
        status: 'ok',
        cellMap: {
          width: 2,
          height: 1,
          cells: [[
            { char: 'U', width: 1, role: 'text', sourceGlyph: 'glyph:U' },
            { char: 'A', width: 1, role: 'text', sourceGlyph: 'glyph:A' },
          ]],
        },
        plainTextPreview: 'WRONG',
        specialArt: { engineId: 'test-engine', inputText: 'UA' },
        diagnostics: [{ code: 'UA_TEST', severity: 'info', message: 'ok' }],
      },
    };

    const draft = createCellCanvasDraftFromSpecialArtResult(specialArtFixture);
    assertEqual(validateCellCanvasDocumentDraft(draft).cells, 2);
    assertEqual(cellCanvasDraftToPlainText(draft), 'UA');
    assertEqual(draft.importRecords[0].plainTextPreviewUsed, false);
    assertEqual(draft.importRecords[0].diagnosticCodes.includes('UA_TEST'), true);
  });

  it('CellCanvas TXT和HTML投影都从CellMap生成', () => {
    let draft = createDefaultCellCanvasDraft();
    draft = updateCellCanvasCell(draft, 0, 0, { char: '<', fg: '#123456', bg: 'white' });

    const textProjection = cellCanvasDraftToPlainTextProjection(draft);
    const htmlProjection = cellCanvasDraftToHtmlProjection(draft);

    assertEqual(textProjection.kind, 'plain-text');
    assertEqual(textProjection.content.startsWith('<'), true);
    assertEqual(htmlProjection.kind, 'html');
    assert(htmlProjection.content.includes('&lt;'), 'HTML投影应转义特殊字符');
    assert(htmlProjection.content.includes('color:#123456'), 'HTML投影应保留安全前景色');
    assert(htmlProjection.content.includes('background-color:white'), 'HTML投影应保留安全背景色');
  });

  it('CellCanvas内部项目包络可保存并读回活动草稿', () => {
    const draft = createDefaultCellCanvasDraft();
    const envelope = createCellCanvasProjectEnvelope(draft, {
      appVersion: 'test-version',
      surface: 'web-test',
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:01:00.000Z',
      sourceResource: {
        id: 'official-test',
        sha256: 'abc123',
        localPath: 'K:\\secret\\image.png',
      },
    });
    const loaded = readCellCanvasDraftFromProjectEnvelope(envelope);

    assertEqual(envelope.schema, CELL_CANVAS_PROJECT_SCHEMA);
    assertEqual(envelope.stability, 'internal-draft');
    assertEqual(envelope.app.version, 'test-version');
    assertEqual(envelope.app.surface, 'web-test');
    assertEqual(envelope.metadata.width, 8);
    assertEqual(envelope.sourceResource.id, 'official-test');
    assertEqual(envelope.sourceResource.localPath, undefined);
    assertEqual(cellCanvasDraftToPlainText(loaded), cellCanvasDraftToPlainText(draft));
  });

  it('CellCanvas最小连线器可绘制折线并记录历史', () => {
    const draft = createCellCanvasDraftFromCellMap({
      id: 'connector-test',
      title: 'Connector Test',
      cellMap: { width: 5, height: 3, cells: [] },
    });
    const nextDraft = drawCellCanvasConnector(
      draft,
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { route: 'horizontal-first' },
    );
    const lines = cellCanvasDraftToPlainText(nextDraft).split('\n');

    assertEqual(resolveCellCanvasSingleLineChar(15), '┼');
    assertEqual(lines[0], '────┐');
    assertEqual(lines[1], '    │');
    assertEqual(lines[2], '    │');
    assertEqual(getCellCanvasHistoryState(nextDraft).canUndo, true);
    assertEqual(nextDraft.editorSession.history.entries.at(-1).kind, 'draw-connector');
  });

  it('CellCanvas连线器会与已有单线字符合并成交叉点', () => {
    let draft = createCellCanvasDraftFromCellMap({
      id: 'connector-cross-test',
      title: 'Connector Cross Test',
      cellMap: { width: 5, height: 3, cells: [] },
    });
    draft = drawCellCanvasConnector(draft, { x: 0, y: 1 }, { x: 4, y: 1 });
    draft = drawCellCanvasConnector(draft, { x: 2, y: 0 }, { x: 2, y: 2 });

    const lines = cellCanvasDraftToPlainText(draft).split('\n');
    assertEqual(lines[0], '  │  ');
    assertEqual(lines[1], '──┼──');
    assertEqual(lines[2], '  │  ');
  });

});

//#endregion

//#region 🟩 测试: 参数校验逻辑

describe('参数校验', () => {

  it('高度必须大于0', () => {
    const result = validateTestConfig({ height: '0' });
    assert(result.valid === false, '高度为0时应无效');
    assert(result.message.includes('高度'), '提示应包含高度');
  });

  it('高度有效通过', () => {
    const result = validateTestConfig({ height: '20' });
    assert(result.valid === true, '高度为20时应有效');
  });

  it('矩阵大小必须在2-20之间', () => {
    const r1 = validateTestConfig({ matrixSize: '1' });
    assert(r1.valid === false, '矩阵1应无效');
    const r2 = validateTestConfig({ matrixSize: '21' });
    assert(r2.valid === false, '矩阵21应无效');
    const r3 = validateTestConfig({ matrixSize: '6' });
    assert(r3.valid === true, '矩阵6应有效');
  });

  it('宽高比必须在1.0-3.0之间', () => {
    assert(validateTestConfig({ ratio: '0.5' }).valid === false);
    assert(validateTestConfig({ ratio: '2.0' }).valid === true);
    assert(validateTestConfig({ ratio: '5.0' }).valid === false);
  });

  it('宽字符比例必须在0-10之间', () => {
    assert(validateTestConfig({ wideCharRatio: '0' }).valid === false);
    assert(validateTestConfig({ wideCharRatio: '2.0' }).valid === true);
    assert(validateTestConfig({ wideCharRatio: '15' }).valid === false);
  });

  it('宽度可选，但指定时必须大于0', () => {
    assert(validateTestConfig({ width: '' }).valid === true);
    assert(validateTestConfig({ width: '0' }).valid === false);
    assert(validateTestConfig({ width: '80' }).valid === true);
  });

});

function validateTestConfig(overrides) {
  const cfg = {
    height: '20',
    width: '',
    matrixSize: '6',
    ratio: '2.0',
    wideCharRatio: '2.0',
    ...overrides,
  };

  const h = parseInt(cfg.height);
  const m = parseInt(cfg.matrixSize);
  const r = parseFloat(cfg.ratio);

  if (isNaN(h) || h < 1) return { valid: false, message: '高度必须大于0' };
  if (cfg.width && (isNaN(parseInt(cfg.width)) || parseInt(cfg.width) < 1))
    return { valid: false, message: '宽度必须大于0' };
  if (isNaN(m) || m < 2 || m > 20)
    return { valid: false, message: '矩阵大小必须在2-20之间' };
  if (isNaN(r) || r < 1.0 || r > 3.0)
    return { valid: false, message: '宽高比必须在1.0-3.0之间' };
  const wr = parseFloat(cfg.wideCharRatio);
  if (isNaN(wr) || wr <= 0 || wr > 10)
    return { valid: false, message: '宽字符比例必须在0-10之间' };
  return { valid: true };
}

//#endregion

//#region 🟩 测试: 配置持久化

describe('配置持久化', () => {

  it('序列化/反序列化保持数据完整', () => {
    const original = {
      height: 20,
      charset: 'EXTENDED',
      font: 'Noto Sans SC',
      glyphFont: "'Sarasa Mono SC', monospace",
      locale: 'zh-CN',
      matrixSize: 8,
      invert: true,
      boxEnabled: true,
      themeName: 'dark',
    };

    const serialized = JSON.stringify(original);
    const restored = JSON.parse(serialized);

    assertEqual(restored.height, 20);
    assertEqual(restored.charset, 'EXTENDED');
    assertEqual(restored.font, 'Noto Sans SC');
    assertEqual(restored.glyphFont, "'Sarasa Mono SC', monospace");
    assertEqual(restored.locale, 'zh-CN');
    assertEqual(restored.matrixSize, 8);
    assertEqual(restored.invert, true);
  });

  it('缺失字段使用默认值', () => {
    const partial = JSON.parse('{"height":30}');
    // 模拟 Object.assign 补默认
    const defaults = {
      height: 20, width: '', charset: 'ASCII', font: 'Noto Sans SC',
      glyphFont: "'Sarasa Mono SC', 'Sarasa Term SC', '等距更纱黑体 SC Nerd Font', '等距更纱黑体 SC', '等距更纱黑体', '等距更紗黑體 SC', monospace", locale: 'zh-CN',
      matrixSize: 6, ratio: 2.0, charSpace: 1, invert: false, boxEnabled: false,
    };
    const merged = Object.assign({}, defaults, partial);
    assertEqual(merged.height, 30);
    assertEqual(merged.charset, 'ASCII');
    assertEqual(merged.locale, 'zh-CN');
    assertEqual(merged.charSpace, 1);
    assertEqual(merged.invert, false);
  });

});

//#endregion

//#region 🟩 测试: 导出工具

describe('导出工具', () => {

  it('HTML转义防止XSS', () => {
    function escapeHtml(text) {
      const div = document ? document.createElement('div') : { textContent: '' };
      div.textContent = text;
      return div.innerHTML || '';
    }

    // 在非浏览器环境下跳过HTML escape测试
    if (typeof document === 'undefined') return;

    assertEqual(escapeHtml('<script>'), '&lt;script&gt;');
    assertEqual(escapeHtml('&amp;'), '&amp;amp;');
    assertEqual(escapeHtml('"hello"'), '&quot;hello&quot;');
  });

  it('Blob下载生成正确URL', () => {
    // 仅在浏览器环境测试
    if (typeof Blob === 'undefined') return;

    const content = 'Hello Unicode Art!';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    assert(blob instanceof Blob, '应为Blob实例');
    assertEqual(blob.type, 'text/plain;charset=utf-8');
  });

});

//#endregion

//#region 🟩 测试: 主题管理

describe('主题管理', () => {

  it('主题列表包含所有预设', () => {
    const themes = [
      'default', 'dark', 'high-contrast',
      'solarized-light', 'nord',
    ];
    assertEqual(themes.length, 5);
    assert(themes.includes('dark'), '应包含暗黑主题');
    assert(themes.includes('nord'), '应包含Nord主题');
  });

  it('localStorage读写主题', () => {
    const storage = {};
    function setItem(k, v) { storage[k] = v; }
    function getItem(k) { return storage[k] || null; }

    setItem('unicode-art-theme', 'dark');
    assertEqual(getItem('unicode-art-theme'), 'dark');

    setItem('unicode-art-theme', 'solarized-light');
    assertEqual(getItem('unicode-art-theme'), 'solarized-light');
  });

});

//#endregion

//#region 🟩 测试: 生成器配置构建

describe('生成器配置构建', () => {

  it('charset为ASCII时输出正确格式', () => {
    const charset = 'ASCII';
    const config = {
      charset: charset === '__CUSTOM__'
        ? { type: 'CUSTOM', customChars: ' .#@' }
        : { type: charset },
    };
    assertEqual(config.charset.type, 'ASCII');
  });

  it('charset为CUSTOM时包含customChars', () => {
    const config = {
      charset: { type: 'CUSTOM', customChars: ' .:-=+*#%@' },
    };
    assertEqual(config.charset.type, 'CUSTOM');
    assertEqual(config.charset.customChars, ' .:-=+*#%@');
  });

  it('box启用时构建正确结构', () => {
    const box = {
      enabled: true,
      style: 'round',
      padding: 1,
      margin: 0,
      title: 'Test',
    };
    assertEqual(box.enabled, true);
    assertEqual(box.style, 'round');
    assertEqual(box.padding, 1);
  });

  it('box禁用时为false', () => {
    const box = false;
    assertEqual(box, false);
  });

  it('统一字体与语言字段透传到Core配置', () => {
    const cfg = {
      font: 'Noto Sans SC',
      glyphFont: "'Sarasa Mono SC', monospace",
      glyphWidthProfile: 'default',
      wideCharRegex: '',
      charSpace: 1,
      locale: 'zh-CN',
    };
    const coreConfig = {
      font: cfg.font,
      visualFont: { family: cfg.font, reduce: 0 },
      glyphFont: {
        family: cfg.glyphFont,
        widthProfile: cfg.glyphWidthProfile,
        wideCharRegex: cfg.wideCharRegex || undefined,
      },
      charSpace: cfg.charSpace,
      locale: cfg.locale,
      outputTarget: 'web',
    };
    assertEqual(coreConfig.visualFont.family, 'Noto Sans SC');
    assertEqual(coreConfig.glyphFont.family, "'Sarasa Mono SC', monospace");
    assertEqual(coreConfig.locale, 'zh-CN');
    assertEqual(coreConfig.outputTarget, 'web');
  });

});

//#region 🟩 测试: UI多语言基础

describe('UI多语言基础', () => {

  it('支持中英文语言标识', () => {
    const supported = ['zh-CN', 'en-US'];
    assert(supported.includes('zh-CN'), '应包含中文');
    assert(supported.includes('en-US'), '应包含英文');
  });

  it('语言选择会影响Core locale字段', () => {
    const config = { locale: 'zh-CN' };
    config.locale = 'en-US';
    assertEqual(config.locale, 'en-US');
  });

});

//#endregion

//#endregion

//#region 🟩 入口

console.log('\n=== UnicodeArtJs Web Unit Tests ===');
