/**
 * CellCanvas 固定网格编辑 Alpha。
 *
 * 这个模块只承载 Web 端 CellCanvas 编辑器的最小稳定内核：
 * - 将结构化 cellMap 包装成可保存的编辑草稿。
 * - 将草稿投影为普通字符画文本。
 * - 支持单个字素格的确定性更新。
 *
 * 真实的区域选择、图层叠加、撤销栈和插件式导入会在后续 W-art-P16.x
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

  const nextDraft = cloneJson(draft);
  const cellMap = getActiveCellMap(nextDraft);
  const cell = findCell(cellMap, x, y);
  if (!cell) {
    throw new Error(`CellCanvas cell (${x}, ${y}) does not exist.`);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'char')) {
    cell.char = normalizeCellChar(patch.char);
    cell.role = cell.char === ' ' ? 'empty' : cell.role === 'effect' ? 'effect' : 'text';
    cell.sourceGlyph = cell.char === ' ' ? null : cell.char;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'fg')) {
    if (patch.fg) {
      cell.fg = String(patch.fg);
    } else {
      delete cell.fg;
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'bg')) {
    if (patch.bg) {
      cell.bg = String(patch.bg);
    } else {
      delete cell.bg;
    }
  }

  nextDraft.editorSession.activeCell = { x, y };
  nextDraft.editorSession.selection = { kind: 'single-cell', x, y, width: 1, height: 1 };
  return nextDraft;
}

// #endregion
