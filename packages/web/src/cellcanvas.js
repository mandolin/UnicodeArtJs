/**
 * CellCanvas 固定网格编辑 Alpha。
 *
 * 这个模块只承载 Web 端 CellCanvas 编辑器的最小稳定内核：
 * - 将结构化 cellMap 包装成可保存的编辑草稿。
 * - 将草稿投影为普通字符画文本。
 * - 支持单个字素格的确定性更新。
 * - 支持首轮矩形选区、剪贴板和撤销/重做历史。
 * - 支持从 SpecialArtRenderResult 结构化导入，并从 CellMap 投影 TXT/HTML。
 * - 支持 internal project envelope 方式保存/加载草稿候选。
 *
 * 真实的拖拽选择、图层叠加和插件式导入会在后续 W-art-P16.x
 * 阶段继续扩展。这里先避免把编辑器交互和数据结构绑死。
 */

// #region 常量与内置样例

/** @type {string} CellCanvas 草稿结构版本。 */
export const CELL_CANVAS_DRAFT_SCHEMA = 'unicodeartjs-cellcanvas-document-draft@0';

/** @type {string} 内部草稿稳定性标记，避免误宣称为公开文件格式。 */
export const CELL_CANVAS_DRAFT_STABILITY = 'internal-draft';

/** @type {string} CellCanvas 投影描述结构版本。 */
export const CELL_CANVAS_PROJECTION_SCHEMA = 'unicodeartjs-cellcanvas-projection@0';

/** @type {string} CellCanvas 内部项目包络结构版本；不作为公开稳定格式。 */
export const CELL_CANVAS_PROJECT_SCHEMA = 'unicodeartjs-cellcanvas-project@0';

/** @type {string} P15 Special Art 结果结构版本。 */
export const SPECIAL_ART_RESULT_SCHEMA = 'unicodeartjs-special-art-result@0';

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
 * 规范化内部项目文件时间戳。
 *
 * @param {unknown} value 候选时间戳。
 * @param {string} fallback 兜底 ISO 时间。
 * @returns {string} ISO 时间字符串。
 */
function normalizeIsoTimestamp(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const time = Date.parse(value);
  return Number.isNaN(time) ? fallback : new Date(time).toISOString();
}

/**
 * 判断值是否为普通对象。
 *
 * @param {unknown} value 待判断值。
 * @returns {value is Record<string, unknown>} 是否为对象。
 */
function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 从来源资源记录中摘取可公开保存的低敏字段。
 *
 * 内部 `.uart` 项目候选不写入本机绝对路径、浏览器信息或系统信息。
 * 后续若接入资源库，可以把同源资源 id/hash/trust 状态放进这里。
 *
 * @param {unknown} value 原始来源资源。
 * @returns {object | undefined} 脱敏后的来源记录。
 */
function sanitizeProjectSourceResource(value) {
  if (!isObject(value)) return undefined;
  const allowedScalarKeys = [
    'id',
    'kind',
    'schema',
    'source',
    'engineId',
    'resourceId',
    'hash',
    'sha256',
    'license',
    'trust',
    'reviewedAt',
  ];
  const output = {};

  for (const key of allowedScalarKeys) {
    const candidate = value[key];
    if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
      output[key] = candidate;
    }
  }

  return Object.keys(output).length > 0 ? output : undefined;
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
 * 转义 HTML 文本内容。
 *
 * @param {unknown} value 原始文本。
 * @returns {string} HTML 安全文本。
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * 把用户可编辑颜色值收窄为安全 CSS token。
 *
 * 这里不是完整 CSS 解析器，只允许常见颜色写法，避免 HTML 投影把
 * `;`、`url()` 等额外 CSS 片段带入内联样式。
 *
 * @param {unknown} value 原始颜色值。
 * @returns {string} 可写入 style 的颜色值。
 */
function normalizeCssColorToken(value) {
  const color = String(value ?? '').trim();
  if (!color) return '';
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) return color;
  if (/^[a-zA-Z][a-zA-Z0-9 -]{0,31}$/.test(color)) return color;
  if (/^(rgb|rgba|hsl|hsla)\([\d\s,%.+-]+\)$/.test(color)) return color;
  return '';
}

/**
 * 将任意 cell 输入规范为带坐标的 CellCanvas cell。
 *
 * @param {unknown} value 原始 cell。
 * @param {number} x 横坐标。
 * @param {number} y 纵坐标。
 * @param {object} defaultCell 缺省 cell。
 * @returns {object} 规范化后的 cell。
 */
function normalizeImportedCell(value, x, y, defaultCell) {
  const source = isObject(value) ? value : defaultCell;
  const char = normalizeCellChar(source.char ?? defaultCell.char ?? ' ');
  const cell = {
    ...cloneJson(source),
    x,
    y,
    char,
    width: Number.isInteger(source.width) ? source.width : 1,
    role: typeof source.role === 'string'
      ? source.role
      : char === ' '
        ? 'empty'
        : 'text',
  };

  if (!Object.prototype.hasOwnProperty.call(cell, 'sourceGlyph')) {
    cell.sourceGlyph = char === ' ' ? null : char;
  }
  return cell;
}

/**
 * 将嵌套或扁平 cellMap 统一为 CellCanvas 使用的扁平结构。
 *
 * P15 的 SpecialArt fixture 使用二维 `cells[y][x]`，而 Web 编辑器内部
 * 为了更容易做 patch/history 使用扁平数组。差异只在导入层消化。
 *
 * @param {object} cellMap 原始 cellMap。
 * @returns {{ width: number, height: number, cells: Array<object> }} 规范化 cellMap。
 */
function normalizeCellMapForDraft(cellMap) {
  if (!isObject(cellMap)) {
    throw new Error('CellCanvas import requires a cellMap object.');
  }

  const width = toInteger(cellMap.width, 0);
  const height = toInteger(cellMap.height, 0);
  if (width <= 0 || height <= 0) {
    throw new Error('CellCanvas imported cellMap must have positive width and height.');
  }

  const defaultCell = isObject(cellMap.defaultCell)
    ? cellMap.defaultCell
    : { char: ' ', width: 1, role: 'empty', sourceGlyph: null };
  const sourceCells = Array.isArray(cellMap.cells) ? cellMap.cells : [];
  const flatCells = [];
  const cellByPosition = new Map();

  if (Array.isArray(sourceCells[0])) {
    for (let y = 0; y < height; y += 1) {
      const row = Array.isArray(sourceCells[y]) ? sourceCells[y] : [];
      for (let x = 0; x < width; x += 1) {
        flatCells.push(normalizeImportedCell(row[x], x, y, defaultCell));
      }
    }
    return { width, height, cells: flatCells };
  }

  for (const sourceCell of sourceCells) {
    if (!isObject(sourceCell)) continue;
    const x = toInteger(sourceCell.x, -1);
    const y = toInteger(sourceCell.y, -1);
    if (x >= 0 && x < width && y >= 0 && y < height) {
      cellByPosition.set(`${x},${y}`, sourceCell);
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      flatCells.push(normalizeImportedCell(cellByPosition.get(`${x},${y}`), x, y, defaultCell));
    }
  }

  return { width, height, cells: flatCells };
}

/**
 * 从 fixture 包装或直接结果中提取 SpecialArtRenderResult。
 *
 * @param {unknown} input SpecialArt fixture 或结果。
 * @returns {{ result: object, wrapper: object | null }} 提取结果。
 */
function extractSpecialArtResult(input) {
  if (isObject(input) && input.schema === SPECIAL_ART_RESULT_SCHEMA) {
    return { result: input, wrapper: null };
  }
  if (isObject(input) && isObject(input.result) && input.result.schema === SPECIAL_ART_RESULT_SCHEMA) {
    return { result: input.result, wrapper: input };
  }
  throw new Error(`SpecialArtResult schema must be ${SPECIAL_ART_RESULT_SCHEMA}.`);
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
  const cellMap = normalizeCellMapForDraft(input.cellMap);

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
        plainTextPreviewUsed: false,
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
 * 从 P15 SpecialArtRenderResult 结构化导入 CellCanvas 草稿。
 *
 * 导入只读取 `result.cellMap`。即使结果里有 `plainTextPreview`，
 * 也只能作为展示投影的历史证据，不能作为 canonical input。
 *
 * @param {object} input SpecialArt fixture 包装或直接结果对象。
 * @param {{ id?: string, title?: string, sourceFixture?: string }} [options] 导入选项。
 * @returns {object} CellCanvas 草稿。
 */
export function createCellCanvasDraftFromSpecialArtResult(input, options = {}) {
  const { result, wrapper } = extractSpecialArtResult(input);
  if (result.status && result.status !== 'ok') {
    throw new Error('SpecialArtResult status must be ok before CellCanvas import.');
  }
  if (!isObject(result.cellMap)) {
    throw new Error('SpecialArtResult.cellMap is required for CellCanvas import.');
  }

  const engineId = result.specialArt?.engineId ?? 'special-art';
  const inputText = result.specialArt?.inputText ?? wrapper?.prototype?.inputText ?? 'result';
  const draft = createCellCanvasDraftFromCellMap({
    id: options.id ?? `cellcanvas-special-art-${engineId}`,
    title: options.title ?? `SpecialArt ${inputText} CellCanvas`,
    sourceStage: wrapper?.stage ?? 'W-art-P15',
    sourceFixture: options.sourceFixture ?? null,
    cellMap: result.cellMap,
  });
  const diagnosticCodes = Array.isArray(result.diagnostics)
    ? result.diagnostics.map((item) => item?.code).filter(Boolean)
    : [];

  draft.importRecords = [
    {
      id: `import-${draft.document.id}`,
      sourceSchema: result.schema,
      sourceStage: wrapper?.stage ?? null,
      sourceFixture: options.sourceFixture ?? null,
      sourceEngine: result.specialArt?.engineId ?? null,
      canonicalInput: 'SpecialArtRenderResult.cellMap',
      importKind: 'structured-special-art-result',
      plainTextPreviewUsed: false,
      plainTextPreviewPresent: typeof result.plainTextPreview === 'string',
      diagnosticCodes: ['UA_CELLCANVAS_SPECIAL_ART_IMPORTED', ...diagnosticCodes],
    },
  ];
  draft.diagnostics = [
    {
      code: 'UA_CELLCANVAS_SPECIAL_ART_IMPORTED',
      severity: 'info',
      message: 'SpecialArtRenderResult.cellMap was imported without using plainTextPreview as input.',
    },
    ...(Array.isArray(result.diagnostics) ? cloneJson(result.diagnostics) : []),
  ];

  return draft;
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

/**
 * 创建 CellCanvas 内部项目包络。
 *
 * 该包络只用于 Web Alpha 内部保存/加载候选，不声明 `.uart` 为公开稳定格式。
 * 真正进入公开格式前，还需要在后续周期补兼容矩阵、迁移策略和跨宿主审计。
 *
 * @param {object} draft CellCanvas 草稿。
 * @param {{
 *   appVersion?: string,
 *   surface?: string,
 *   createdAt?: string,
 *   updatedAt?: string,
 *   sourceResource?: object
 * }} [options] 包络元数据。
 * @returns {object} 内部项目包络。
 */
export function createCellCanvasProjectEnvelope(draft, options = {}) {
  const summary = validateCellCanvasDocumentDraft(draft);
  const now = new Date().toISOString();
  const createdAt = normalizeIsoTimestamp(options.createdAt, now);
  const updatedAt = normalizeIsoTimestamp(options.updatedAt, createdAt);
  const sourceResource = sanitizeProjectSourceResource(options.sourceResource);
  const appVersion = typeof options.appVersion === 'string' && options.appVersion.trim()
    ? options.appVersion.trim()
    : null;
  const surface = typeof options.surface === 'string' && options.surface.trim()
    ? options.surface.trim()
    : 'web';
  const envelope = {
    schema: CELL_CANVAS_PROJECT_SCHEMA,
    stability: CELL_CANVAS_DRAFT_STABILITY,
    version: 0,
    app: {
      id: 'unicodeartjs',
      surface,
      version: appVersion,
    },
    metadata: {
      createdAt,
      updatedAt,
      width: summary.width,
      height: summary.height,
      documents: 1,
    },
    activeDocumentId: draft.document.id,
    documents: [cloneJson(draft)],
  };

  if (sourceResource) envelope.sourceResource = sourceResource;
  return envelope;
}

/**
 * 从内部项目包络读取活动 CellCanvas 草稿。
 *
 * Alpha 阶段也允许 raw `CellCanvasDocumentDraft` 直接通过，便于手工调试和
 * 对旧下载文件的临时兼容。返回值始终是深拷贝，调用方可安全编辑。
 *
 * @param {object} input 项目包络或 raw 草稿。
 * @returns {object} 活动 CellCanvas 草稿。
 */
export function readCellCanvasDraftFromProjectEnvelope(input) {
  if (input?.schema === CELL_CANVAS_DRAFT_SCHEMA) {
    validateCellCanvasDocumentDraft(input);
    return cloneJson(input);
  }

  if (!input || input.schema !== CELL_CANVAS_PROJECT_SCHEMA) {
    throw new Error(`CellCanvas project schema must be ${CELL_CANVAS_PROJECT_SCHEMA}.`);
  }

  if (input.stability !== CELL_CANVAS_DRAFT_STABILITY) {
    throw new Error(`CellCanvas project stability must be ${CELL_CANVAS_DRAFT_STABILITY}.`);
  }

  if (input.version !== 0) {
    throw new Error('CellCanvas project version must be 0.');
  }

  if (!Array.isArray(input.documents) || input.documents.length === 0) {
    throw new Error('CellCanvas project must contain at least one document.');
  }

  const activeDocumentId = typeof input.activeDocumentId === 'string' ? input.activeDocumentId : '';
  const draft = input.documents.find((document) => document?.document?.id === activeDocumentId)
    ?? input.documents[0];
  validateCellCanvasDocumentDraft(draft);
  return cloneJson(draft);
}

// #endregion

// #region 导入投影与单格编辑

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
 * 将 CellCanvas 草稿投影为带元数据的纯文本结果。
 *
 * @param {object} draft CellCanvas 草稿。
 * @returns {{ schema: string, kind: string, source: string, canonical: boolean, rows: number, cols: number, content: string }} 投影结果。
 */
export function cellCanvasDraftToPlainTextProjection(draft) {
  validateCellCanvasDocumentDraft(draft);
  const cellMap = getActiveCellMap(draft);
  return {
    schema: CELL_CANVAS_PROJECTION_SCHEMA,
    kind: 'plain-text',
    source: 'CellCanvasDocumentDraft.document.layers[].cellMap',
    canonical: false,
    rows: cellMap.height,
    cols: cellMap.width,
    content: cellCanvasDraftToPlainText(draft),
  };
}

/**
 * 将 CellCanvas 草稿投影为 HTML 片段。
 *
 * HTML 投影直接遍历 CellMap，并为有前景/背景色的格子生成 span。
 * 该函数不从 plain text 反推模型，也不把投影结果写入历史。
 *
 * @param {object} draft CellCanvas 草稿。
 * @param {{ className?: string }} [options] HTML 选项。
 * @returns {{ schema: string, kind: string, source: string, canonical: boolean, rows: number, cols: number, content: string }} 投影结果。
 */
export function cellCanvasDraftToHtmlProjection(draft, options = {}) {
  validateCellCanvasDocumentDraft(draft);
  const cellMap = getActiveCellMap(draft);
  const className = options.className || 'unicode-art-cellcanvas';
  const cellIndex = new Map(cellMap.cells.map((cell) => [`${cell.x},${cell.y}`, cell]));
  const lines = [];

  for (let y = 0; y < cellMap.height; y += 1) {
    let line = '';
    for (let x = 0; x < cellMap.width; x += 1) {
      const cell = cellIndex.get(`${x},${y}`) ?? { char: ' ', role: 'empty' };
      const text = escapeHtml(cell.char ?? ' ');
      const styles = [];
      const fg = normalizeCssColorToken(cell.fg);
      const bg = normalizeCssColorToken(cell.bg);
      if (fg) styles.push(`color:${fg}`);
      if (bg) styles.push(`background-color:${bg}`);
      line += styles.length > 0
        ? `<span data-x="${x}" data-y="${y}" style="${styles.join(';')}">${text}</span>`
        : text;
    }
    lines.push(line);
  }

  return {
    schema: CELL_CANVAS_PROJECTION_SCHEMA,
    kind: 'html',
    source: 'CellCanvasDocumentDraft.document.layers[].cellMap',
    canonical: false,
    rows: cellMap.height,
    cols: cellMap.width,
    content: `<pre class="${escapeHtml(className)}" data-cellcanvas-projection="html" data-cols="${cellMap.width}" data-rows="${cellMap.height}">${lines.join('\n')}</pre>`,
  };
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
