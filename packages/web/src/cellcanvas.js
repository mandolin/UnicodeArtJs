/**
 * CellCanvas 固定网格编辑 Alpha。
 *
 * 这个模块只承载 Web 端 CellCanvas 编辑器的最小稳定内核：
 * - 将结构化 cellMap 包装成可保存的编辑草稿。
 * - 将草稿投影为普通字符画文本。
 * - 支持单个字素格的确定性更新。
 * - 支持首轮矩形选区、剪贴板和撤销/重做历史。
 *
 * 真实的拖拽选择、图层叠加和插件式导入会在后续 W-art-P16.x
 * 阶段继续扩展。这里先避免把编辑器交互和数据结构绑死。
 */

// #region 常量与内置样例

/** @type {string} CellCanvas 草稿结构版本。 */
export const CELL_CANVAS_DRAFT_SCHEMA = 'unicodeartjs-cellcanvas-document-draft@0';

/** @type {string} 内部草稿稳定性标记，避免误宣称为公开文件格式。 */
export const CELL_CANVAS_DRAFT_STABILITY = 'internal-draft';

/**
 * Web Alpha 阶段可直接加载的 CellCanvas 样例。
 *
 * 这些样例来自前面特殊艺术流水线的结构化输出，但这里只保留公开
 * Web 编辑器需要的最小 cellMap 信息。
 */
export const CELL_CANVAS_PRESETS = Object.freeze([
  {
    id: 'cellcanvas-line-banner',
    labelKey: 'editor.preset.cellcanvasLineBanner',
    title: 'Line Banner CellCanvas',
    sourceStage: 'W-art-P15.4',
    sourceFixture: 'work-zone/dev/fixtures/special-art-uaf-line-banner-prototype-v0.sample.json',
    lines: ['|| /\\ _|', '\\/ || \\/'],
  },
  {
    id: 'cellcanvas-shadow-textfx',
    labelKey: 'editor.preset.cellcanvasShadow',
    title: 'Shadow TextFx CellCanvas',
    sourceStage: 'W-art-P15.5',
    sourceFixture: 'work-zone/dev/fixtures/special-art-auditable-textfx-prototype-v0.sample.json',
    lines: ['|| /\\ _| ', ' ._|_  | ', '\\/ |_\\_| '],
    effectChars: ['.'],
  },
]);

// #endregion

// #region 工具函数

/**
 * 创建纯 JSON 深拷贝，避免调用方误改内置样例。
 *
 * @template T
 * @param {T} value 待复制的 JSON 值。
 * @returns {T} 独立副本。
 */
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 将单个用户输入规范为一个字素字符。
 *
 * 当前 Alpha 只取第一个 Unicode code point。后续若接入 grapheme splitter，
 * 可以在这里扩展为真正的字素簇处理。
 *
 * @param {unknown} value 用户输入。
 * @returns {string} 单格字符。
 */
function normalizeCellChar(value) {
  const text = String(value ?? ' ');
  const [firstChar] = Array.from(text);
  return firstChar ?? ' ';
}

/**
 * 由文本行创建固定网格 cellMap。
 *
 * @param {string[]} lines 等宽字符行。
 * @param {{ effectChars?: string[] }} [options] 样式识别选项。
 * @returns {{ width: number, height: number, cells: Array<object> }} cellMap。
 */
function createCellMapFromLines(lines, options = {}) {
  const width = Math.max(0, ...lines.map((line) => Array.from(line).length));
  const effectSet = new Set(options.effectChars ?? []);
  const cells = [];

  for (let y = 0; y < lines.length; y += 1) {
    const chars = Array.from(lines[y]);
    for (let x = 0; x < width; x += 1) {
      const char = chars[x] ?? ' ';
      const role = char === ' ' ? 'empty' : effectSet.has(char) ? 'effect' : 'text';
      cells.push({
        x,
        y,
        char,
        width: 1,
        role,
        sourceGlyph: char === ' ' ? null : char,
      });
    }
  }

  return { width, height: lines.length, cells };
}

/**
 * 按坐标读取 cell，便于渲染和编辑。
 *
 * @param {{ width: number, height: number, cells: Array<object> }} cellMap cellMap。
 * @param {number} x 横坐标。
 * @param {number} y 纵坐标。
 * @returns {object | undefined} 匹配的 cell。
 */
function findCell(cellMap, x, y) {
  return cellMap.cells.find((cell) => cell.x === x && cell.y === y);
}

/**
 * 规范化整数坐标。
 *
 * @param {unknown} value 原始值。
 * @param {number} fallback 默认值。
 * @returns {number} 整数。
 */
function toInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

/**
 * 将数值限制在范围内。
 *
 * @param {number} value 原始数值。
 * @param {number} min 最小值。
 * @param {number} max 最大值。
 * @returns {number} 限制后的数值。
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 提取可进入历史和剪贴板的 cell 数据。
 *
 * @param {object} cell 原始 cell。
 * @returns {object} 可序列化快照。
 */
function snapshotCellData(cell) {
  const data = {
    char: normalizeCellChar(cell?.char),
    width: Number.isInteger(cell?.width) ? cell.width : 1,
    role: typeof cell?.role === 'string' ? cell.role : 'text',
    sourceGlyph: Object.prototype.hasOwnProperty.call(cell ?? {}, 'sourceGlyph') ? cell.sourceGlyph : null,
  };

  if (cell?.fg) data.fg = String(cell.fg);
  if (cell?.bg) data.bg = String(cell.bg);
  return data;
}

/**
 * 把快照数据写回 cell。
 *
 * @param {object} cell 目标 cell。
 * @param {object} data cell 数据快照。
 */
function restoreCellData(cell, data) {
  cell.char = normalizeCellChar(data?.char);
  cell.width = Number.isInteger(data?.width) ? data.width : 1;
  cell.role = typeof data?.role === 'string'
    ? data.role
    : cell.char === ' '
      ? 'empty'
      : 'text';
  cell.sourceGlyph = Object.prototype.hasOwnProperty.call(data ?? {}, 'sourceGlyph')
    ? data.sourceGlyph
    : cell.char === ' '
      ? null
      : cell.char;

  if (data?.fg) cell.fg = String(data.fg);
  else delete cell.fg;

  if (data?.bg) cell.bg = String(data.bg);
  else delete cell.bg;
}

/**
 * 组合单格 patch 与原 cell，生成完整 after 快照。
 *
 * @param {object} cell 原始 cell。
 * @param {{ char?: unknown, fg?: string, bg?: string }} patch 用户补丁。
 * @returns {object} 更新后的 cell 快照。
 */
function createPatchedCellData(cell, patch) {
  const data = snapshotCellData(cell);

  if (Object.prototype.hasOwnProperty.call(patch, 'char')) {
    data.char = normalizeCellChar(patch.char);
    data.role = data.char === ' ' ? 'empty' : data.role === 'effect' ? 'effect' : 'text';
    data.sourceGlyph = data.char === ' ' ? null : data.char;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'fg')) {
    if (patch.fg) data.fg = String(patch.fg);
    else delete data.fg;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'bg')) {
    if (patch.bg) data.bg = String(patch.bg);
    else delete data.bg;
  }

  return data;
}

/**
 * 比较两个 cell 快照是否完全一致。
 *
 * @param {object} left 左侧快照。
 * @param {object} right 右侧快照。
 * @returns {boolean} 是否一致。
 */
function isSameCellData(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * 确保 editorSession 与 history 结构存在。
 *
 * @param {object} draft CellCanvas 草稿。
 * @returns {object} editorSession。
 */
function ensureEditorSession(draft) {
  draft.editorSession ??= {};
  draft.editorSession.viewport ??= { x: 0, y: 0, zoom: 1 };
  draft.editorSession.activeCell ??= { x: 0, y: 0 };
  draft.editorSession.selection ??= { kind: 'single-cell', x: 0, y: 0, width: 1, height: 1 };
  draft.editorSession.clipboard ??= { kind: 'empty' };
  draft.editorSession.history ??= { cursor: 0, entries: [] };
  if (!Array.isArray(draft.editorSession.history.entries)) {
    draft.editorSession.history.entries = [];
  }
  draft.editorSession.history.cursor = clamp(
    toInteger(draft.editorSession.history.cursor, draft.editorSession.history.entries.length),
    0,
    draft.editorSession.history.entries.length,
  );
  return draft.editorSession;
}

/**
 * 规范化一个选区矩形，确保其不会超出画布。
 *
 * @param {object} selection 原始选区。
 * @param {{ width: number, height: number }} cellMap cellMap。
 * @returns {{ kind: string, x: number, y: number, width: number, height: number }} 规范化选区。
 */
function normalizeSelection(selection, cellMap) {
  const x = clamp(toInteger(selection?.x, 0), 0, cellMap.width - 1);
  const y = clamp(toInteger(selection?.y, 0), 0, cellMap.height - 1);
  const width = clamp(toInteger(selection?.width, 1), 1, cellMap.width - x);
  const height = clamp(toInteger(selection?.height, 1), 1, cellMap.height - y);

  return {
    kind: width === 1 && height === 1 ? 'single-cell' : 'rectangle',
    x,
    y,
    width,
    height,
  };
}

/**
 * 将选区写入 editorSession。
 *
 * @param {object} session editorSession。
 * @param {{ kind: string, x: number, y: number, width: number, height: number }} selection 规范化选区。
 */
function applySelectionToSession(session, selection) {
  session.selection = { ...selection };
  session.activeCell = { x: selection.x, y: selection.y };
}

/**
 * 生成一条历史记录。
 *
 * @param {string} kind 操作类型。
 * @param {Array<object>} patches patch 列表。
 * @param {object} selectionBefore 操作前选区。
 * @param {object} selectionAfter 操作后选区。
 * @returns {object} 历史记录。
 */
function createHistoryEntry(kind, patches, selectionBefore, selectionAfter) {
  return {
    id: `hist-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    createdAt: new Date().toISOString(),
    selectionBefore,
    selectionAfter,
    patches,
  };
}

/**
 * 记录历史，若当前 cursor 位于中间则截断 redo 分支。
 *
 * @param {object} draft CellCanvas 草稿。
 * @param {object} entry 历史记录。
 */
function pushHistoryEntry(draft, entry) {
  const session = ensureEditorSession(draft);
  const history = session.history;
  const preservedEntries = history.entries.slice(0, history.cursor);
  preservedEntries.push(entry);
  session.history = {
    cursor: preservedEntries.length,
    entries: preservedEntries,
  };
}

/**
 * 应用若干 cell patch。
 *
 * @param {object} draft CellCanvas 草稿。
 * @param {Array<{ x: number, y: number, after: object }>} cellPatches cell patch。
 * @param {{ historyKind?: string, recordHistory?: boolean, selectionAfter?: object }} [options] 应用选项。
 * @returns {object} 更新后的草稿。
 */
function applyCellCanvasPatches(draft, cellPatches, options = {}) {
  validateCellCanvasDocumentDraft(draft);
  const nextDraft = cloneJson(draft);
  const session = ensureEditorSession(nextDraft);
  const cellMap = getActiveCellMap(nextDraft);
  const selectionBefore = normalizeSelection(session.selection, cellMap);
  const effectivePatches = [];

  for (const patch of cellPatches) {
    const x = toInteger(patch.x, -1);
    const y = toInteger(patch.y, -1);
    const cell = findCell(cellMap, x, y);
    if (!cell) continue;

    const before = snapshotCellData(cell);
    restoreCellData(cell, patch.after);
    const after = snapshotCellData(cell);
    if (!isSameCellData(before, after)) {
      effectivePatches.push({ x, y, before, after });
    }
  }

  const selectionAfter = normalizeSelection(options.selectionAfter ?? selectionBefore, cellMap);
  applySelectionToSession(session, selectionAfter);

  if (effectivePatches.length > 0 && options.recordHistory !== false) {
    pushHistoryEntry(
      nextDraft,
      createHistoryEntry(options.historyKind ?? 'cell-patch', effectivePatches, selectionBefore, selectionAfter),
    );
  }

  return nextDraft;
}

// #endregion

// #region 草稿创建与校验

/**
 * 从内置样例创建 CellCanvas 草稿。
 *
 * @param {string} presetId 样例 ID。
 * @returns {object} CellCanvas 草稿。
 */
export function createCellCanvasDraftFromPreset(presetId) {
  const preset = CELL_CANVAS_PRESETS.find((item) => item.id === presetId) ?? CELL_CANVAS_PRESETS[0];
  return createCellCanvasDraftFromCellMap({
    id: preset.id,
    title: preset.title,
    sourceStage: preset.sourceStage,
    sourceFixture: preset.sourceFixture,
    cellMap: createCellMapFromLines(preset.lines, { effectChars: preset.effectChars }),
  });
}

/**
 * 创建默认 CellCanvas 草稿。
 *
 * @returns {object} CellCanvas 草稿。
 */
export function createDefaultCellCanvasDraft() {
  return createCellCanvasDraftFromPreset('cellcanvas-line-banner');
}

/**
 * 将 cellMap 包装为 CellCanvas 编辑草稿。
 *
 * @param {{
 *   id?: string,
 *   title?: string,
 *   sourceStage?: string,
 *   sourceFixture?: string,
 *   cellMap: { width: number, height: number, cells: Array<object> }
 * }} input 输入 cellMap 与来源信息。
 * @returns {object} CellCanvas 草稿。
 */
export function createCellCanvasDraftFromCellMap(input) {
  const layerId = 'layer-imported-main';
  const cellMap = cloneJson(input.cellMap);

  return {
    schema: CELL_CANVAS_DRAFT_SCHEMA,
    stability: CELL_CANVAS_DRAFT_STABILITY,
    document: {
      schema: 'unicode-art-document',
      version: 'uadm-0',
      id: input.id ?? 'cellcanvas-draft',
      title: input.title ?? 'CellCanvas Draft',
      canvas: {
        width: cellMap.width,
        height: cellMap.height,
        unit: 'glyph-cell',
      },
      layers: [
        {
          id: layerId,
          kind: 'cell-map',
          locked: false,
          visible: true,
          cellMap,
        },
      ],
    },
    editorSession: {
      activeLayerId: layerId,
      activeCell: { x: 0, y: 0 },
      selection: { kind: 'single-cell', x: 0, y: 0, width: 1, height: 1 },
      viewport: { x: 0, y: 0, zoom: 1 },
      clipboard: { kind: 'empty' },
      history: { cursor: 0, entries: [] },
    },
    importRecords: [
      {
        id: `import-${input.id ?? 'cellcanvas'}`,
        sourceStage: input.sourceStage ?? 'W-art-P16.3',
        sourceFixture: input.sourceFixture ?? null,
        canonicalInput: 'SpecialArtRenderResult.cellMap',
        importKind: 'structured-special-art-result',
        diagnosticCodes: ['UA_CELLCANVAS_IMPORT_READY'],
      },
    ],
    diagnostics: [
      {
        code: 'UA_CELLCANVAS_IMPORT_READY',
        severity: 'info',
        message: 'CellCanvas draft is ready for fixed-grid editing.',
      },
    ],
  };
}

/**
 * 读取草稿当前活动图层的 cellMap。
 *
 * @param {object} draft CellCanvas 草稿。
 * @returns {{ width: number, height: number, cells: Array<object> }} cellMap。
 */
export function getActiveCellMap(draft) {
  const layers = draft?.document?.layers;
  if (!Array.isArray(layers) || layers.length === 0) {
    throw new Error('CellCanvas draft must contain at least one layer.');
  }

  const activeLayerId = draft?.editorSession?.activeLayerId;
  const layer = layers.find((item) => item.id === activeLayerId) ?? layers[0];
  if (!layer?.cellMap || !Array.isArray(layer.cellMap.cells)) {
    throw new Error('CellCanvas active layer must contain a valid cellMap.');
  }

  return layer.cellMap;
}

/**
 * 校验 CellCanvas 草稿并返回摘要。
 *
 * @param {object} draft CellCanvas 草稿。
 * @returns {{ schema: string, width: number, height: number, cells: number }} 校验摘要。
 */
export function validateCellCanvasDocumentDraft(draft) {
  if (!draft || draft.schema !== CELL_CANVAS_DRAFT_SCHEMA) {
    throw new Error(`CellCanvas draft schema must be ${CELL_CANVAS_DRAFT_SCHEMA}.`);
  }

  if (draft.stability !== CELL_CANVAS_DRAFT_STABILITY) {
    throw new Error(`CellCanvas draft stability must be ${CELL_CANVAS_DRAFT_STABILITY}.`);
  }

  const cellMap = getActiveCellMap(draft);
  if (!Number.isInteger(cellMap.width) || cellMap.width <= 0) {
    throw new Error('CellCanvas cellMap.width must be a positive integer.');
  }

  if (!Number.isInteger(cellMap.height) || cellMap.height <= 0) {
    throw new Error('CellCanvas cellMap.height must be a positive integer.');
  }

  const expectedCells = cellMap.width * cellMap.height;
  if (cellMap.cells.length !== expectedCells) {
    throw new Error(`CellCanvas cell count must be ${expectedCells}.`);
  }

  for (const cell of cellMap.cells) {
    if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y)) {
      throw new Error('CellCanvas cell coordinates must be integers.');
    }
    if (cell.x < 0 || cell.x >= cellMap.width || cell.y < 0 || cell.y >= cellMap.height) {
      throw new Error('CellCanvas cell coordinates are out of bounds.');
    }
    if (typeof cell.char !== 'string' || Array.from(cell.char).length !== 1) {
      throw new Error('CellCanvas cell.char must contain exactly one character.');
    }
  }

  return {
    schema: draft.schema,
    width: cellMap.width,
    height: cellMap.height,
    cells: cellMap.cells.length,
  };
}

// #endregion

// #region 文本投影与单格编辑

/**
 * 将 CellCanvas 草稿投影为纯文本字符画。
 *
 * @param {object} draft CellCanvas 草稿。
 * @returns {string} 普通字符画文本。
 */
export function cellCanvasDraftToPlainText(draft) {
  validateCellCanvasDocumentDraft(draft);
  const cellMap = getActiveCellMap(draft);
  const lines = [];

  for (let y = 0; y < cellMap.height; y += 1) {
    let line = '';
    for (let x = 0; x < cellMap.width; x += 1) {
      line += findCell(cellMap, x, y)?.char ?? ' ';
    }
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * 设置 CellCanvas 当前矩形选区。
 *
 * @param {object} draft CellCanvas 草稿。
 * @param {{ x: number, y: number, width?: number, height?: number }} selection 选区。
 * @returns {object} 更新后的新草稿。
 */
export function setCellCanvasSelection(draft, selection) {
  validateCellCanvasDocumentDraft(draft);

  const nextDraft = cloneJson(draft);
  const session = ensureEditorSession(nextDraft);
  const cellMap = getActiveCellMap(nextDraft);
  applySelectionToSession(session, normalizeSelection(selection, cellMap));
  return nextDraft;
}

/**
 * 读取当前选区覆盖的字素格。
 *
 * @param {object} draft CellCanvas 草稿。
 * @returns {{ selection: object, cells: Array<object> }} 选区和格子列表。
 */
export function getCellCanvasSelectionCells(draft) {
  validateCellCanvasDocumentDraft(draft);

  const cellMap = getActiveCellMap(draft);
  const session = ensureEditorSession(cloneJson(draft));
  const selection = normalizeSelection(session.selection, cellMap);
  const cells = [];

  for (let y = selection.y; y < selection.y + selection.height; y += 1) {
    for (let x = selection.x; x < selection.x + selection.width; x += 1) {
      const cell = findCell(cellMap, x, y);
      if (cell) {
        cells.push({
          ...snapshotCellData(cell),
          x,
          y,
          dx: x - selection.x,
          dy: y - selection.y,
        });
      }
    }
  }

  return { selection, cells };
}

/**
 * 将当前选区复制到 editorSession.clipboard。
 *
 * @param {object} draft CellCanvas 草稿。
 * @returns {object} 更新后的新草稿。
 */
export function copyCellCanvasSelection(draft) {
  validateCellCanvasDocumentDraft(draft);

  const nextDraft = cloneJson(draft);
  const session = ensureEditorSession(nextDraft);
  const { selection, cells } = getCellCanvasSelectionCells(nextDraft);
  session.clipboard = {
    kind: 'cell-rectangle',
    width: selection.width,
    height: selection.height,
    cells: cells.map((cell) => ({
      dx: cell.dx,
      dy: cell.dy,
      char: cell.char,
      width: cell.width,
      role: cell.role,
      sourceGlyph: cell.sourceGlyph,
      ...(cell.fg ? { fg: cell.fg } : {}),
      ...(cell.bg ? { bg: cell.bg } : {}),
    })),
    sourceSelection: selection,
  };
  return nextDraft;
}

/**
 * 将剪贴板内容粘贴到目标坐标。
 *
 * @param {object} draft CellCanvas 草稿。
 * @param {number} targetX 目标横坐标。
 * @param {number} targetY 目标纵坐标。
 * @returns {object} 更新后的新草稿。
 */
export function pasteCellCanvasClipboard(draft, targetX, targetY) {
  validateCellCanvasDocumentDraft(draft);

  const session = ensureEditorSession(cloneJson(draft));
  const clipboard = session.clipboard;
  if (clipboard?.kind !== 'cell-rectangle' || !Array.isArray(clipboard.cells)) {
    throw new Error('CellCanvas clipboard does not contain a cell rectangle.');
  }

  const cellMap = getActiveCellMap(draft);
  const x = clamp(toInteger(targetX, 0), 0, cellMap.width - 1);
  const y = clamp(toInteger(targetY, 0), 0, cellMap.height - 1);
  const width = clamp(toInteger(clipboard.width, 1), 1, cellMap.width - x);
  const height = clamp(toInteger(clipboard.height, 1), 1, cellMap.height - y);
  const cellPatches = clipboard.cells
    .map((cell) => ({
      x: x + toInteger(cell.dx, 0),
      y: y + toInteger(cell.dy, 0),
      after: snapshotCellData(cell),
    }))
    .filter((patch) => patch.x < cellMap.width && patch.y < cellMap.height);

  return applyCellCanvasPatches(draft, cellPatches, {
    historyKind: 'paste-selection',
    selectionAfter: { kind: 'rectangle', x, y, width, height },
  });
}

/**
 * 更新一个 CellCanvas 字素格。
 *
 * @param {object} draft CellCanvas 草稿。
 * @param {number} x 横坐标。
 * @param {number} y 纵坐标。
 * @param {{ char?: unknown, fg?: string, bg?: string }} patch 单格补丁。
 * @returns {object} 更新后的新草稿。
 */
export function updateCellCanvasCell(draft, x, y, patch) {
  validateCellCanvasDocumentDraft(draft);

  const cellMap = getActiveCellMap(draft);
  const cell = findCell(cellMap, x, y);
  if (!cell) {
    throw new Error(`CellCanvas cell (${x}, ${y}) does not exist.`);
  }

  return applyCellCanvasPatches(draft, [{
    x,
    y,
    after: createPatchedCellData(cell, patch),
  }], {
    historyKind: 'update-cell',
    selectionAfter: { kind: 'single-cell', x, y, width: 1, height: 1 },
  });
}

/**
 * 获取 CellCanvas 历史状态。
 *
 * @param {object} draft CellCanvas 草稿。
 * @returns {{ cursor: number, entries: number, canUndo: boolean, canRedo: boolean }} 历史摘要。
 */
export function getCellCanvasHistoryState(draft) {
  const history = ensureEditorSession(cloneJson(draft)).history;
  return {
    cursor: history.cursor,
    entries: history.entries.length,
    canUndo: history.cursor > 0,
    canRedo: history.cursor < history.entries.length,
  };
}

/**
 * 撤销最近一次 CellCanvas 历史操作。
 *
 * @param {object} draft CellCanvas 草稿。
 * @returns {object} 更新后的新草稿。
 */
export function undoCellCanvasHistory(draft) {
  validateCellCanvasDocumentDraft(draft);

  const nextDraft = cloneJson(draft);
  const session = ensureEditorSession(nextDraft);
  const history = session.history;
  if (history.cursor <= 0) {
    throw new Error('CellCanvas history has nothing to undo.');
  }

  const entry = history.entries[history.cursor - 1];
  const cellMap = getActiveCellMap(nextDraft);
  for (const patch of entry.patches || []) {
    const cell = findCell(cellMap, patch.x, patch.y);
    if (cell) restoreCellData(cell, patch.before);
  }

  history.cursor -= 1;
  applySelectionToSession(session, normalizeSelection(entry.selectionBefore ?? session.selection, cellMap));
  return nextDraft;
}

/**
 * 重做下一次 CellCanvas 历史操作。
 *
 * @param {object} draft CellCanvas 草稿。
 * @returns {object} 更新后的新草稿。
 */
export function redoCellCanvasHistory(draft) {
  validateCellCanvasDocumentDraft(draft);

  const nextDraft = cloneJson(draft);
  const session = ensureEditorSession(nextDraft);
  const history = session.history;
  if (history.cursor >= history.entries.length) {
    throw new Error('CellCanvas history has nothing to redo.');
  }

  const entry = history.entries[history.cursor];
  const cellMap = getActiveCellMap(nextDraft);
  for (const patch of entry.patches || []) {
    const cell = findCell(cellMap, patch.x, patch.y);
    if (cell) restoreCellData(cell, patch.after);
  }

  history.cursor += 1;
  applySelectionToSession(session, normalizeSelection(entry.selectionAfter ?? session.selection, cellMap));
  return nextDraft;
}

// #endregion
