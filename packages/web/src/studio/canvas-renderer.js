/**
 * Web Studio Canvas 2D 投影原型。
 *
 * 该模块把 CellMap 投影到 Canvas 2D，供 Web Studio preview、thumbnail
 * 和 PNG 导出复用。Canvas bitmap 只是展示结果，不是 source model。
 */

// #region 常量

/** @type {string} Canvas 2D 投影结构版本。 */
export const CANVAS_2D_PROJECTION_SCHEMA = 'unicodeartjs-canvas-2d-projection@0';

/** @type {string} Canvas 2D session patch 结构版本。 */
export const CANVAS_2D_SESSION_PATCH_SCHEMA = 'unicodeartjs-canvas-2d-session-patch@0';

// #endregion

// #region 工具函数

/**
 * 将值收窄为有限数字。
 *
 * @param {unknown} value 候选值。
 * @param {number} fallback 兜底值。
 * @returns {number} 有限数字。
 */
function toNumber(value, fallback) {
  const parsed = Number.parseFloat(String(value));
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
 * 判断值是否是可接受的 CSS 颜色 token。
 *
 * 这里不是完整 CSS 解析器，只保留常见颜色写法；浏览器端仍可在真实
 * canvas 上最终解析颜色。测试环境也能借此保持确定性。
 *
 * @param {unknown} value 候选颜色。
 * @returns {boolean} 是否可接受。
 */
function isSafeColorToken(value) {
  const color = String(value ?? '').trim();
  if (!color || color === 'transparent') return true;
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) return true;
  if (/^[a-zA-Z][a-zA-Z0-9 -]{0,31}$/.test(color)) return true;
  if (/^(rgb|rgba|hsl|hsla)\([\d\s,%.+-]+\)$/.test(color)) return true;
  return false;
}

/**
 * 规范化 Canvas 颜色。
 *
 * @param {unknown} value 候选颜色。
 * @param {string} fallback 兜底颜色。
 * @returns {string} 可写入 fillStyle 的颜色。
 */
function normalizeCanvasColor(value, fallback) {
  const color = String(value ?? '').trim();
  if (!color || color === 'transparent') return fallback;
  return isSafeColorToken(color) ? color : fallback;
}

/**
 * 创建 cell 坐标索引。
 *
 * @param {Array<object>} cells CellMap cells。
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
 * 创建空白 cell 兜底。
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
 * 创建不共享引用的绘制 cell。
 *
 * @param {object} cell 原始 cell。
 * @returns {object} cell 副本。
 */
function cloneRenderCell(cell) {
  return { ...cell };
}

// #endregion

// #region Render plan

/**
 * 校验 CellMap 并返回摘要。
 *
 * @param {object} cellMap 候选 CellMap。
 * @returns {{ width: number, height: number, totalCells: number }} CellMap 摘要。
 */
export function getCanvas2DCellMapSummary(cellMap) {
  if (!cellMap || !Number.isInteger(cellMap.width) || cellMap.width <= 0) {
    throw new Error('Canvas 2D cellMap.width must be a positive integer.');
  }
  if (!Number.isInteger(cellMap.height) || cellMap.height <= 0) {
    throw new Error('Canvas 2D cellMap.height must be a positive integer.');
  }
  if (!Array.isArray(cellMap.cells)) {
    throw new Error('Canvas 2D cellMap.cells must be an array.');
  }

  return {
    width: cellMap.width,
    height: cellMap.height,
    totalCells: cellMap.width * cellMap.height,
  };
}

/**
 * 规范化 Canvas 2D 渲染选项。
 *
 * @param {object} cellMap CellMap。
 * @param {{
 *   visibleRect?: { x?: number, y?: number, width?: number, height?: number },
 *   cellWidth?: number,
 *   cellHeight?: number,
 *   padding?: number,
 *   scale?: number,
 *   fontSize?: number,
 *   fontFamily?: string,
 *   background?: string,
 *   textColor?: string,
 *   effectColor?: string
 * }} [options] 渲染选项。
 * @returns {object} 规范化选项。
 */
export function normalizeCanvas2DRenderOptions(cellMap, options = {}) {
  const summary = getCanvas2DCellMapSummary(cellMap);
  const rectInput = options.visibleRect ?? {};
  const x = clamp(Math.trunc(toNumber(rectInput.x, 0)), 0, summary.width - 1);
  const y = clamp(Math.trunc(toNumber(rectInput.y, 0)), 0, summary.height - 1);
  const width = clamp(Math.trunc(toNumber(rectInput.width, summary.width)), 1, summary.width - x);
  const height = clamp(Math.trunc(toNumber(rectInput.height, summary.height)), 1, summary.height - y);
  const cellWidth = clamp(toNumber(options.cellWidth, 22), 1, 512);
  const cellHeight = clamp(toNumber(options.cellHeight, 24), 1, 512);
  const padding = clamp(toNumber(options.padding, 18), 0, 1024);
  const scale = clamp(toNumber(options.scale, 2), 0.1, 16);
  const fontSize = clamp(toNumber(options.fontSize, 18), 1, 512);
  const fontFamily = typeof options.fontFamily === 'string' && options.fontFamily.trim()
    ? options.fontFamily.trim()
    : 'monospace';
  const background = normalizeCanvasColor(options.background, '#ffffff') || '#ffffff';
  const textColor = normalizeCanvasColor(options.textColor, '#111827') || '#111827';
  const effectColor = normalizeCanvasColor(options.effectColor, '#4a90d9') || '#4a90d9';
  const logicalWidth = width * cellWidth + padding * 2;
  const logicalHeight = height * cellHeight + padding * 2;

  return {
    visibleRect: { x, y, width, height },
    cellWidth,
    cellHeight,
    padding,
    scale,
    fontSize,
    fontFamily,
    background,
    textColor,
    effectColor,
    logicalWidth,
    logicalHeight,
    pixelWidth: Math.ceil(logicalWidth * scale),
    pixelHeight: Math.ceil(logicalHeight * scale),
  };
}

/**
 * 创建 Canvas 2D 渲染计划。
 *
 * 计划本身仍是 projection 描述，不可保存为 canonical CellMap。
 *
 * @param {object} cellMap CellMap。
 * @param {object} [options] 渲染选项。
 * @returns {object} 渲染计划。
 */
export function createCanvas2DRenderPlan(cellMap, options = {}) {
  const summary = getCanvas2DCellMapSummary(cellMap);
  const normalized = normalizeCanvas2DRenderOptions(cellMap, options);
  const index = createCellIndex(cellMap.cells);
  const rect = normalized.visibleRect;
  const cells = [];
  const rows = [];

  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    const row = [];
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const cell = cloneRenderCell(index.get(`${x}:${y}`) ?? createEmptyCell(x, y));
      row.push(cell);
      cells.push(cell);
    }
    rows.push(row);
  }

  return {
    schema: CANVAS_2D_PROJECTION_SCHEMA,
    stability: 'internal-alpha',
    kind: 'canvas-2d-render-plan',
    sourceModel: 'CellMap',
    rendererIsSourceModel: false,
    visibleRect: rect,
    options: {
      cellWidth: normalized.cellWidth,
      cellHeight: normalized.cellHeight,
      padding: normalized.padding,
      scale: normalized.scale,
      fontSize: normalized.fontSize,
      fontFamily: normalized.fontFamily,
      background: normalized.background,
      textColor: normalized.textColor,
      effectColor: normalized.effectColor,
    },
    canvasSize: {
      logicalWidth: normalized.logicalWidth,
      logicalHeight: normalized.logicalHeight,
      pixelWidth: normalized.pixelWidth,
      pixelHeight: normalized.pixelHeight,
    },
    rows,
    cells,
    metrics: {
      totalCells: summary.totalCells,
      renderedCells: cells.length,
      sourceWidth: summary.width,
      sourceHeight: summary.height,
      glyphCacheEntries: new Set(cells.map((cell) => cell.char)).size,
      estimatedMemoryBytes: normalized.pixelWidth * normalized.pixelHeight * 4,
    },
  };
}

// #endregion

// #region Canvas 绘制

/**
 * 将 Canvas 2D 渲染计划绘制到 canvas。
 *
 * @param {object} plan `createCanvas2DRenderPlan` 返回值。
 * @param {HTMLCanvasElement | { getContext?: Function }} canvas Canvas 元素。
 * @returns {object} Canvas 2D 投影描述。
 */
export function renderCanvas2DPlanToCanvas(plan, canvas) {
  if (plan?.schema !== CANVAS_2D_PROJECTION_SCHEMA) {
    throw new Error(`Canvas 2D render plan schema must be ${CANVAS_2D_PROJECTION_SCHEMA}.`);
  }
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new Error('Canvas 2D renderer requires a canvas-like object.');
  }

  canvas.width = plan.canvasSize.pixelWidth;
  canvas.height = plan.canvasSize.pixelHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  if (typeof ctx.save === 'function') ctx.save();
  if (typeof ctx.scale === 'function') ctx.scale(plan.options.scale, plan.options.scale);
  ctx.fillStyle = plan.options.background;
  ctx.fillRect(0, 0, plan.canvasSize.logicalWidth, plan.canvasSize.logicalHeight);
  ctx.font = `${plan.options.fontSize}px ${plan.options.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const rect = plan.visibleRect;
  for (const cell of plan.cells) {
    const localX = cell.x - rect.x;
    const localY = cell.y - rect.y;
    const cellSpan = Math.max(1, Math.trunc(toNumber(cell.width, 1)));
    const left = plan.options.padding + localX * plan.options.cellWidth;
    const top = plan.options.padding + localY * plan.options.cellHeight;
    const drawWidth = plan.options.cellWidth * cellSpan;
    const bg = normalizeCanvasColor(cell.bg, '');

    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(left, top, drawWidth, plan.options.cellHeight);
    }

    if (cell.char !== ' ') {
      ctx.fillStyle = normalizeCanvasColor(
        cell.fg,
        cell.role === 'effect' ? plan.options.effectColor : plan.options.textColor,
      );
      ctx.fillText(cell.char, left + drawWidth / 2, top + plan.options.cellHeight / 2);
    }
  }

  if (typeof ctx.restore === 'function') ctx.restore();

  return {
    schema: CANVAS_2D_PROJECTION_SCHEMA,
    stability: plan.stability,
    kind: 'canvas-2d',
    sourceModel: plan.sourceModel,
    rendererIsSourceModel: false,
    visibleRect: { ...plan.visibleRect },
    canvasSize: { ...plan.canvasSize },
    metrics: { ...plan.metrics },
  };
}

/**
 * 直接从 CellMap 绘制 Canvas 2D 投影。
 *
 * @param {object} cellMap CellMap。
 * @param {HTMLCanvasElement | { getContext?: Function }} canvas Canvas 元素。
 * @param {object} [options] 渲染选项。
 * @returns {object} Canvas 2D 投影描述。
 */
export function renderCellMapToCanvas2D(cellMap, canvas, options = {}) {
  const plan = createCanvas2DRenderPlan(cellMap, options);
  return renderCanvas2DPlanToCanvas(plan, canvas);
}

/**
 * 创建 Canvas 2D renderer session patch。
 *
 * @param {object} projection Canvas 2D 投影。
 * @returns {object} editorSession patch。
 */
export function createCanvas2DSessionPatch(projection) {
  if (projection?.schema !== CANVAS_2D_PROJECTION_SCHEMA) {
    throw new Error(`Canvas 2D projection schema must be ${CANVAS_2D_PROJECTION_SCHEMA}.`);
  }

  return {
    schema: CANVAS_2D_SESSION_PATCH_SCHEMA,
    stability: 'internal-alpha',
    renderer: {
      kind: 'canvas-2d',
      projectionSchema: projection.schema,
      sourceModel: 'CellMap',
      rendererIsSourceModel: false,
      visibleRect: { ...projection.visibleRect },
      canvasSize: { ...projection.canvasSize },
      metrics: { ...projection.metrics },
    },
    diagnostics: [
      {
        code: 'UA_STUDIO_CANVAS_2D_PROJECTION',
        severity: 'info',
        message: `Canvas 2D projected ${projection.metrics.renderedCells} cells into ${projection.canvasSize.pixelWidth}x${projection.canvasSize.pixelHeight}.`,
      },
    ],
  };
}

// #endregion
