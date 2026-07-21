/**
 * Web Studio Virtual Grid 视口原型。
 *
 * 该模块只负责把完整 CellMap 投影成可见窗口、命中测试结果和
 * editorSession patch。它不修改 CellMap，不保存 DOM 或 Canvas 状态，
 * 也不声明公开稳定 renderer API。
 */

// #region 常量

/** @type {string} Virtual Grid 投影结构版本。 */
export const VIRTUAL_GRID_PROJECTION_SCHEMA = 'unicodeartjs-virtual-grid-projection@0';

/** @type {string} Virtual Grid session patch 结构版本。 */
export const VIRTUAL_GRID_SESSION_PATCH_SCHEMA = 'unicodeartjs-virtual-grid-session-patch@0';

// #endregion

// #region 工具函数

/**
 * 把输入值收窄为整数。
 *
 * @param {unknown} value 待解析值。
 * @param {number} fallback 无法解析时的兜底值。
 * @returns {number} 整数。
 */
function toInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * 把数字限制在闭区间内。
 *
 * @param {number} value 原始值。
 * @param {number} min 最小值。
 * @param {number} max 最大值。
 * @returns {number} 限制后的值。
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * 创建可快速按坐标读取的 cell 索引。
 *
 * @param {Array<object>} cells CellMap 中的 cell 列表。
 * @returns {Map<string, object>} 坐标索引。
 */
function createCellIndex(cells) {
  const index = new Map();
  for (const cell of cells) {
    if (Number.isInteger(cell?.x) && Number.isInteger(cell?.y)) {
      index.set(`${cell.x}:${cell.y}`, cell);
    }
  }
  return index;
}

/**
 * 创建空白兜底 cell。
 *
 * CellMap 草稿通常是满矩阵；这里保留兜底是为了让未来 sparse layer
 * 也能被 Virtual Grid 以确定性方式投影。
 *
 * @param {number} x 横坐标。
 * @param {number} y 纵坐标。
 * @returns {object} 空白 cell。
 */
function createEmptyCell(x, y) {
  return {
    x,
    y,
    char: ' ',
    width: 1,
    role: 'empty',
    sourceGlyph: null,
  };
}

/**
 * 创建不共享引用的可见 cell。
 *
 * @param {object} cell 原始 cell。
 * @returns {object} 可见 cell 副本。
 */
function cloneVisibleCell(cell) {
  return { ...cell };
}

// #endregion

// #region 视口规范化

/**
 * 校验并读取 CellMap 摘要。
 *
 * @param {object} cellMap 候选 CellMap。
 * @returns {{ width: number, height: number, totalCells: number }} 摘要。
 */
export function getVirtualGridCellMapSummary(cellMap) {
  if (!cellMap || !Number.isInteger(cellMap.width) || cellMap.width <= 0) {
    throw new Error('Virtual Grid cellMap.width must be a positive integer.');
  }
  if (!Number.isInteger(cellMap.height) || cellMap.height <= 0) {
    throw new Error('Virtual Grid cellMap.height must be a positive integer.');
  }
  if (!Array.isArray(cellMap.cells)) {
    throw new Error('Virtual Grid cellMap.cells must be an array.');
  }

  return {
    width: cellMap.width,
    height: cellMap.height,
    totalCells: cellMap.width * cellMap.height,
  };
}

/**
 * 规范化 Virtual Grid 视口。
 *
 * @param {object} cellMap CellMap。
 * @param {{
 *   x?: number,
 *   y?: number,
 *   cols?: number,
 *   rows?: number,
 *   zoom?: number,
 *   overscanCols?: number,
 *   overscanRows?: number
 * }} [viewport] 视口配置。
 * @returns {{
 *   x: number,
 *   y: number,
 *   cols: number,
 *   rows: number,
 *   zoom: number,
 *   overscanCols: number,
 *   overscanRows: number,
 *   visibleRect: { x: number, y: number, width: number, height: number }
 * }} 规范化视口。
 */
export function normalizeVirtualGridViewport(cellMap, viewport = {}) {
  const summary = getVirtualGridCellMapSummary(cellMap);
  const cols = clamp(toInteger(viewport.cols, 80), 1, summary.width);
  const rows = clamp(toInteger(viewport.rows, 24), 1, summary.height);
  const maxX = Math.max(0, summary.width - cols);
  const maxY = Math.max(0, summary.height - rows);
  const x = clamp(toInteger(viewport.x, 0), 0, maxX);
  const y = clamp(toInteger(viewport.y, 0), 0, maxY);
  const zoomCandidate = Number.parseFloat(String(viewport.zoom ?? 1));
  const zoom = Number.isFinite(zoomCandidate) && zoomCandidate > 0 ? zoomCandidate : 1;
  const overscanCols = clamp(toInteger(viewport.overscanCols, 0), 0, summary.width);
  const overscanRows = clamp(toInteger(viewport.overscanRows, 0), 0, summary.height);
  const visibleX = clamp(x - overscanCols, 0, summary.width - 1);
  const visibleY = clamp(y - overscanRows, 0, summary.height - 1);
  const right = clamp(x + cols + overscanCols, 1, summary.width);
  const bottom = clamp(y + rows + overscanRows, 1, summary.height);

  return {
    x,
    y,
    cols,
    rows,
    zoom,
    overscanCols,
    overscanRows,
    visibleRect: {
      x: visibleX,
      y: visibleY,
      width: Math.max(1, right - visibleX),
      height: Math.max(1, bottom - visibleY),
    },
  };
}

// #endregion

// #region 投影与命中测试

/**
 * 从 CellMap 创建 Virtual Grid 可见窗口投影。
 *
 * 返回值只包含可见 cell 副本和诊断指标，不能反向作为 canonical
 * CellMap 保存。
 *
 * @param {object} cellMap CellMap。
 * @param {object} [viewport] 视口配置。
 * @returns {object} Virtual Grid 投影。
 */
export function createVirtualGridProjection(cellMap, viewport = {}) {
  const summary = getVirtualGridCellMapSummary(cellMap);
  const normalized = normalizeVirtualGridViewport(cellMap, viewport);
  const index = createCellIndex(cellMap.cells);
  const rows = [];
  const visibleCells = [];
  const rect = normalized.visibleRect;

  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    const row = [];
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const cell = cloneVisibleCell(index.get(`${x}:${y}`) ?? createEmptyCell(x, y));
      row.push(cell);
      visibleCells.push(cell);
    }
    rows.push(row);
  }

  return {
    schema: VIRTUAL_GRID_PROJECTION_SCHEMA,
    stability: 'internal-alpha',
    kind: 'virtual-grid',
    sourceModel: 'CellMap',
    rendererIsSourceModel: false,
    viewport: {
      x: normalized.x,
      y: normalized.y,
      cols: normalized.cols,
      rows: normalized.rows,
      zoom: normalized.zoom,
      overscanCols: normalized.overscanCols,
      overscanRows: normalized.overscanRows,
    },
    visibleRect: rect,
    rows,
    cells: visibleCells,
    metrics: {
      totalCells: summary.totalCells,
      visibleCells: visibleCells.length,
      skippedCells: Math.max(0, summary.totalCells - visibleCells.length),
      sourceWidth: summary.width,
      sourceHeight: summary.height,
    },
  };
}

/**
 * 在 Virtual Grid 投影上执行基础命中测试。
 *
 * @param {object} projection `createVirtualGridProjection` 的返回值。
 * @param {{
 *   clientX?: number,
 *   clientY?: number,
 *   originX?: number,
 *   originY?: number,
 *   cellWidth?: number,
 *   cellHeight?: number
 * }} point 命中测试输入。
 * @returns {{ hit: boolean, x?: number, y?: number, cell?: object }} 命中结果。
 */
export function hitTestVirtualGrid(projection, point = {}) {
  if (projection?.schema !== VIRTUAL_GRID_PROJECTION_SCHEMA) {
    throw new Error(`Virtual Grid projection schema must be ${VIRTUAL_GRID_PROJECTION_SCHEMA}.`);
  }

  const cellWidth = Number.parseFloat(String(point.cellWidth ?? 1));
  const cellHeight = Number.parseFloat(String(point.cellHeight ?? 1));
  if (!Number.isFinite(cellWidth) || cellWidth <= 0 || !Number.isFinite(cellHeight) || cellHeight <= 0) {
    throw new Error('Virtual Grid hit test cell size must be positive.');
  }

  const originX = Number.parseFloat(String(point.originX ?? 0));
  const originY = Number.parseFloat(String(point.originY ?? 0));
  const clientX = Number.parseFloat(String(point.clientX ?? 0));
  const clientY = Number.parseFloat(String(point.clientY ?? 0));
  const localX = clientX - (Number.isFinite(originX) ? originX : 0);
  const localY = clientY - (Number.isFinite(originY) ? originY : 0);
  const offsetX = Math.floor(localX / cellWidth);
  const offsetY = Math.floor(localY / cellHeight);
  const rect = projection.visibleRect;

  if (offsetX < 0 || offsetY < 0 || offsetX >= rect.width || offsetY >= rect.height) {
    return { hit: false };
  }

  const x = rect.x + offsetX;
  const y = rect.y + offsetY;
  const cell = projection.rows[offsetY]?.[offsetX];
  return { hit: true, x, y, cell };
}

/**
 * 创建可写入 editorSession 的 Virtual Grid patch。
 *
 * 该 patch 只描述 viewport、renderer 和诊断状态；真正修改 CellMap
 * 仍应走工具层 patch / host-owned checked apply。
 *
 * @param {object} projection Virtual Grid 投影。
 * @returns {object} editorSession patch。
 */
export function createVirtualGridSessionPatch(projection) {
  if (projection?.schema !== VIRTUAL_GRID_PROJECTION_SCHEMA) {
    throw new Error(`Virtual Grid projection schema must be ${VIRTUAL_GRID_PROJECTION_SCHEMA}.`);
  }

  return {
    schema: VIRTUAL_GRID_SESSION_PATCH_SCHEMA,
    stability: 'internal-alpha',
    viewport: { ...projection.viewport },
    renderer: {
      kind: 'virtual-grid',
      projectionSchema: projection.schema,
      sourceModel: 'CellMap',
      rendererIsSourceModel: false,
      visibleRect: { ...projection.visibleRect },
      metrics: { ...projection.metrics },
    },
    diagnostics: [
      {
        code: 'UA_STUDIO_VIRTUAL_GRID_VISIBLE_WINDOW',
        severity: 'info',
        message: `Virtual Grid projected ${projection.metrics.visibleCells} visible cells from ${projection.metrics.totalCells} total cells.`,
      },
    ],
  };
}

// #endregion
