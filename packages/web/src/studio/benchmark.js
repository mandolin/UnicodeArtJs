/**
 * Web Studio benchmark 与诊断工具。
 *
 * 该模块只用于 Web Studio Alpha 的内部诊断面板和测试门禁。它读取
 * CellMap / CellCanvas draft，测量 Virtual Grid 与 Canvas 2D projection
 * 路径，并输出可审计报告；不会修改 CellMap，也不会把 renderer 状态当成
 * source model 保存。
 */

import { createVirtualGridProjection } from './virtual-grid.js';
import {
  createCanvas2DRenderPlan,
  renderCanvas2DPlanToCanvas,
} from './canvas-renderer.js';

// #region 常量

/** @type {string} Studio benchmark 诊断报告结构版本。 */
export const STUDIO_BENCHMARK_DIAGNOSTICS_SCHEMA = 'unicodeartjs-studio-benchmark-diagnostics@0';

/** @type {string} Studio benchmark 内部稳定性标记。 */
export const STUDIO_BENCHMARK_DIAGNOSTICS_STABILITY = 'internal-alpha';

/** @type {Readonly<Record<string, number>>} P18.7 首轮诊断阈值。 */
export const STUDIO_BENCHMARK_DEFAULT_THRESHOLDS = Object.freeze({
  virtualGridMs: 16,
  canvasPlanMs: 16,
  canvasDrawMs: 60,
  estimatedMemoryBytes: 96 * 1024 * 1024,
});

/** @type {ReadonlyArray<string>} 合成大尺寸 CellMap 的确定性字符池。 */
const BENCHMARK_CHAR_PALETTE = Object.freeze([
  ' ',
  '.',
  ':',
  '-',
  '=',
  '+',
  '*',
  '#',
  '│',
  '─',
  '┼',
]);

// #endregion

// #region 工具函数

/**
 * 读取高精度时间。
 *
 * @returns {number} 毫秒时间戳。
 */
function nowMs() {
  if (globalThis.performance && typeof globalThis.performance.now === 'function') {
    return globalThis.performance.now();
  }
  return Date.now();
}

/**
 * 把值收窄为整数并限制到闭区间。
 *
 * @param {unknown} value 输入值。
 * @param {number} fallback 默认值。
 * @param {number} min 最小值。
 * @param {number} max 最大值。
 * @returns {number} 规范化整数。
 */
function toIntegerInRange(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value), 10);
  const number = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, number));
}

/**
 * 把值收窄为数字并限制到闭区间。
 *
 * @param {unknown} value 输入值。
 * @param {number} fallback 默认值。
 * @param {number} min 最小值。
 * @param {number} max 最大值。
 * @returns {number} 规范化数字。
 */
function toNumberInRange(value, fallback, min, max) {
  const parsed = Number.parseFloat(String(value));
  const number = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, number));
}

/**
 * 创建普通 JSON 深拷贝。
 *
 * @template T
 * @param {T} value 输入值。
 * @returns {T} 深拷贝。
 */
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 创建轻量指纹，用于证明 benchmark 未修改源 CellMap。
 *
 * @param {object} cellMap CellMap。
 * @returns {string} 可比较指纹。
 */
function createCellMapFingerprint(cellMap) {
  return JSON.stringify({
    width: cellMap.width,
    height: cellMap.height,
    cells: cellMap.cells.map((cell) => ({
      x: cell.x,
      y: cell.y,
      char: cell.char,
      width: cell.width,
      role: cell.role,
      fg: cell.fg ?? null,
      bg: cell.bg ?? null,
    })),
  });
}

/**
 * 校验并提取 CellMap 摘要。
 *
 * @param {object} cellMap 候选 CellMap。
 * @returns {{ width: number, height: number, totalCells: number }} 摘要。
 */
function getCellMapSummary(cellMap) {
  if (!cellMap || !Number.isInteger(cellMap.width) || cellMap.width <= 0) {
    throw new Error('Studio benchmark requires cellMap.width to be a positive integer.');
  }
  if (!Number.isInteger(cellMap.height) || cellMap.height <= 0) {
    throw new Error('Studio benchmark requires cellMap.height to be a positive integer.');
  }
  if (!Array.isArray(cellMap.cells)) {
    throw new Error('Studio benchmark requires cellMap.cells to be an array.');
  }
  return {
    width: cellMap.width,
    height: cellMap.height,
    totalCells: cellMap.width * cellMap.height,
  };
}

/**
 * 从 CellCanvas draft 中提取活动图层 CellMap 和图层 / 帧摘要。
 *
 * @param {object} draft CellCanvas draft。
 * @returns {{ cellMap: object, source: object }} 提取结果。
 */
function extractCellMapFromDraft(draft) {
  const layers = Array.isArray(draft?.document?.layers) ? draft.document.layers : [];
  if (layers.length === 0) {
    throw new Error('Studio benchmark draft must contain at least one layer.');
  }

  const activeLayerId = typeof draft?.editorSession?.activeLayerId === 'string'
    ? draft.editorSession.activeLayerId
    : '';
  const activeLayer = layers.find((layer) => layer?.id === activeLayerId) ?? layers[0];
  if (!activeLayer?.cellMap) {
    throw new Error('Studio benchmark active layer must contain a CellMap.');
  }

  const frameCount = layers.reduce((count, layer) => {
    if (Array.isArray(layer?.frames) && layer.frames.length > 0) {
      return Math.max(count, layer.frames.length);
    }
    return count;
  }, 1);

  return {
    cellMap: activeLayer.cellMap,
    source: {
      inputKind: 'cellcanvas-draft',
      documentId: draft?.document?.id ?? null,
      activeLayerId: activeLayer.id ?? null,
      activeFrameId: draft?.editorSession?.activeFrameId ?? null,
      layerCount: layers.length,
      frameCount,
    },
  };
}

/**
 * 统一读取 CellMap 或 CellCanvas draft 输入。
 *
 * @param {object} input CellMap 或 CellCanvas draft。
 * @param {{ layerCount?: number, frameCount?: number }} [options] 摘要覆盖项。
 * @returns {{ cellMap: object, source: object }} 标准输入。
 */
function normalizeBenchmarkInput(input, options = {}) {
  if (input?.document?.layers) {
    const extracted = extractCellMapFromDraft(input);
    return {
      cellMap: extracted.cellMap,
      source: {
        ...extracted.source,
        layerCount: toIntegerInRange(options.layerCount, extracted.source.layerCount, 1, 999),
        frameCount: toIntegerInRange(options.frameCount, extracted.source.frameCount, 1, 999),
      },
    };
  }

  const summary = getCellMapSummary(input);
  return {
    cellMap: input,
    source: {
      inputKind: 'cell-map',
      documentId: null,
      activeLayerId: null,
      activeFrameId: null,
      layerCount: toIntegerInRange(options.layerCount, 1, 1, 999),
      frameCount: toIntegerInRange(options.frameCount, 1, 1, 999),
      width: summary.width,
      height: summary.height,
      totalCells: summary.totalCells,
    },
  };
}

/**
 * 创建可计数的 canvas-like 对象，供 Node 单元测试使用。
 *
 * @returns {object} fake canvas。
 */
function createCountingCanvas() {
  const calls = [];
  const context = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    scale(x, y) { calls.push(['scale', x, y]); },
    fillRect(x, y, width, height) { calls.push(['fillRect', x, y, width, height, this.fillStyle]); },
    fillText(text, x, y) { calls.push(['fillText', text, x, y, this.fillStyle, this.font]); },
  };
  return {
    width: 0,
    height: 0,
    calls,
    getContext(type) {
      return type === '2d' ? context : null;
    },
  };
}

/**
 * 估算 Canvas 2D 绘制调用次数。
 *
 * @param {object} plan Canvas 2D render plan。
 * @returns {number} 估算绘制调用数。
 */
function estimateCanvasDrawCalls(plan) {
  const backgroundCalls = 1;
  const textCalls = plan.cells.filter((cell) => cell.char !== ' ').length;
  const cellBackgroundCalls = plan.cells.filter((cell) => Boolean(cell.bg)).length;
  return backgroundCalls + textCalls + cellBackgroundCalls;
}

/**
 * 创建 canvas 对象。
 *
 * @param {Function | undefined} canvasFactory 可选真实 canvas 工厂。
 * @returns {{ canvas: object, kind: string }} canvas 与来源。
 */
function createBenchmarkCanvas(canvasFactory) {
  if (typeof canvasFactory === 'function') {
    const canvas = canvasFactory();
    if (canvas && typeof canvas.getContext === 'function') {
      return { canvas, kind: 'provided-canvas' };
    }
  }
  return { canvas: createCountingCanvas(), kind: 'counting-fake-canvas' };
}

/**
 * 判定单项阈值状态。
 *
 * @param {number} value 实测值。
 * @param {number} limit 阈值。
 * @returns {'pass' | 'warn'} 状态。
 */
function classifyThreshold(value, limit) {
  return value <= limit ? 'pass' : 'warn';
}

/**
 * 计算所有阈值状态。
 *
 * @param {object} metrics 指标集合。
 * @param {object} thresholds 阈值。
 * @returns {object} 阈值状态。
 */
function createThresholdReport(metrics, thresholds) {
  const items = {
    virtualGridMs: classifyThreshold(metrics.virtualGrid.durationMs, thresholds.virtualGridMs),
    canvasPlanMs: classifyThreshold(metrics.canvas2d.planDurationMs, thresholds.canvasPlanMs),
    canvasDrawMs: classifyThreshold(metrics.canvas2d.drawDurationMs, thresholds.canvasDrawMs),
    estimatedMemoryBytes: classifyThreshold(
      metrics.canvas2d.estimatedMemoryBytes,
      thresholds.estimatedMemoryBytes,
    ),
  };
  return {
    overall: Object.values(items).every((status) => status === 'pass') ? 'pass' : 'warn',
    items,
  };
}

/**
 * 保留三位小数，避免报告中过多浮点噪音。
 *
 * @param {number} value 数值。
 * @returns {number} 格式化数值。
 */
function roundMs(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * 合并 benchmark 默认选项。
 *
 * @param {object} cellMap CellMap。
 * @param {object} options 原始选项。
 * @returns {object} 规范化选项。
 */
function normalizeBenchmarkOptions(cellMap, options = {}) {
  const summary = getCellMapSummary(cellMap);
  return {
    viewport: {
      x: toIntegerInRange(options.viewport?.x, 0, 0, Math.max(0, summary.width - 1)),
      y: toIntegerInRange(options.viewport?.y, 0, 0, Math.max(0, summary.height - 1)),
      cols: toIntegerInRange(options.viewport?.cols, Math.min(summary.width, 120), 1, summary.width),
      rows: toIntegerInRange(options.viewport?.rows, Math.min(summary.height, 40), 1, summary.height),
      overscanCols: toIntegerInRange(options.viewport?.overscanCols, 2, 0, summary.width),
      overscanRows: toIntegerInRange(options.viewport?.overscanRows, 2, 0, summary.height),
    },
    canvas: {
      cellWidth: toNumberInRange(options.canvas?.cellWidth, 14, 1, 512),
      cellHeight: toNumberInRange(options.canvas?.cellHeight, 18, 1, 512),
      padding: toNumberInRange(options.canvas?.padding, 8, 0, 1024),
      scale: toNumberInRange(options.canvas?.scale, 1, 0.1, 16),
      fontSize: toNumberInRange(options.canvas?.fontSize, 14, 1, 512),
      fontFamily: typeof options.canvas?.fontFamily === 'string' && options.canvas.fontFamily.trim()
        ? options.canvas.fontFamily.trim()
        : 'monospace',
    },
    thresholds: {
      ...STUDIO_BENCHMARK_DEFAULT_THRESHOLDS,
      ...(options.thresholds ?? {}),
    },
    canvasFactory: options.canvasFactory,
  };
}

// #endregion

// #region 合成基准 CellMap

/**
 * 创建 P18.7 使用的确定性大尺寸 CellMap。
 *
 * 该函数用于浏览器和测试中的本地 benchmark，不读取网络资源，也不依赖
 * DOM 预览结果。`layerCount` / `frameCount` 只进入诊断摘要，用于提前验证
 * 多图层 / 多帧规模指标展示，不声明完整动画格式。
 *
 * @param {{
 *   width?: number,
 *   height?: number,
 *   layerCount?: number,
 *   frameCount?: number
 * }} [options] 合成配置。
 * @returns {{ cellMap: object, layerCount: number, frameCount: number }} 合成结果。
 */
export function createStudioBenchmarkCellMap(options = {}) {
  const width = toIntegerInRange(options.width, 160, 1, 1200);
  const height = toIntegerInRange(options.height, 80, 1, 800);
  const cells = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const paletteIndex = (x * 13 + y * 7 + (x % 5) * (y % 3)) % BENCHMARK_CHAR_PALETTE.length;
      const char = BENCHMARK_CHAR_PALETTE[paletteIndex];
      cells.push({
        x,
        y,
        char,
        width: 1,
        role: char === ' ' ? 'empty' : char === '.' || char === ':' ? 'effect' : 'text',
        sourceGlyph: char === ' ' ? null : `benchmark:${char}`,
      });
    }
  }

  return {
    cellMap: { width, height, cells },
    layerCount: toIntegerInRange(options.layerCount, 3, 1, 999),
    frameCount: toIntegerInRange(options.frameCount, 6, 1, 999),
  };
}

// #endregion

// #region Benchmark 主流程

/**
 * 运行 Studio benchmark 诊断。
 *
 * @param {object} input CellMap 或 CellCanvas draft。
 * @param {object} [options] benchmark 选项。
 * @returns {object} 诊断报告。
 */
export function runStudioBenchmarkDiagnostics(input, options = {}) {
  const { cellMap, source } = normalizeBenchmarkInput(input, options);
  const summary = getCellMapSummary(cellMap);
  const normalized = normalizeBenchmarkOptions(cellMap, options);
  const beforeFingerprint = createCellMapFingerprint(cellMap);

  const virtualGridStart = nowMs();
  const virtualGrid = createVirtualGridProjection(cellMap, normalized.viewport);
  const virtualGridDurationMs = roundMs(nowMs() - virtualGridStart);

  const canvasPlanStart = nowMs();
  const canvasPlan = createCanvas2DRenderPlan(cellMap, {
    visibleRect: virtualGrid.visibleRect,
    ...normalized.canvas,
  });
  const canvasPlanDurationMs = roundMs(nowMs() - canvasPlanStart);

  const { canvas, kind: canvasKind } = createBenchmarkCanvas(normalized.canvasFactory);
  const canvasDrawStart = nowMs();
  const canvasProjection = renderCanvas2DPlanToCanvas(canvasPlan, canvas);
  const canvasDrawDurationMs = roundMs(nowMs() - canvasDrawStart);
  const afterFingerprint = createCellMapFingerprint(cellMap);

  const metrics = {
    virtualGrid: {
      durationMs: virtualGridDurationMs,
      visibleCells: virtualGrid.metrics.visibleCells,
      skippedCells: virtualGrid.metrics.skippedCells,
      visibleRect: { ...virtualGrid.visibleRect },
      rendererIsSourceModel: virtualGrid.rendererIsSourceModel,
    },
    canvas2d: {
      planDurationMs: canvasPlanDurationMs,
      drawDurationMs: canvasDrawDurationMs,
      renderedCells: canvasPlan.metrics.renderedCells,
      glyphCacheEntries: canvasPlan.metrics.glyphCacheEntries,
      estimatedDrawCalls: estimateCanvasDrawCalls(canvasPlan),
      estimatedMemoryBytes: canvasPlan.metrics.estimatedMemoryBytes,
      canvasSize: { ...canvasPlan.canvasSize },
      canvasKind,
      rendererIsSourceModel: canvasProjection.rendererIsSourceModel,
    },
  };

  const thresholdReport = createThresholdReport(metrics, normalized.thresholds);
  return {
    schema: STUDIO_BENCHMARK_DIAGNOSTICS_SCHEMA,
    stability: STUDIO_BENCHMARK_DIAGNOSTICS_STABILITY,
    kind: 'web-studio-benchmark-diagnostics',
    sourceModel: 'CellMap',
    rendererIsSourceModel: false,
    generatedAt: new Date().toISOString(),
    source: {
      ...source,
      width: summary.width,
      height: summary.height,
      totalCells: summary.totalCells,
    },
    viewport: { ...virtualGrid.viewport },
    metrics,
    thresholds: {
      limits: cloneJson(normalized.thresholds),
      status: thresholdReport,
    },
    sourceMutation: {
      unchanged: beforeFingerprint === afterFingerprint,
      fingerprintCompared: true,
    },
    diagnostics: [
      {
        code: 'UA_STUDIO_BENCHMARK_RENDERER_PROJECTION_ONLY',
        severity: 'info',
        message: 'Virtual Grid and Canvas 2D are projection layers; CellMap remains the canonical source model.',
      },
      {
        code: thresholdReport.overall === 'pass'
          ? 'UA_STUDIO_BENCHMARK_THRESHOLDS_PASS'
          : 'UA_STUDIO_BENCHMARK_THRESHOLDS_WARN',
        severity: thresholdReport.overall === 'pass' ? 'info' : 'warning',
        message: `Studio benchmark threshold status: ${thresholdReport.overall}.`,
      },
    ],
  };
}

/**
 * 将 benchmark 报告格式化为 UI 可读文本。
 *
 * @param {object} report `runStudioBenchmarkDiagnostics` 返回值。
 * @returns {string} 多行摘要。
 */
export function formatStudioBenchmarkDiagnosticsReport(report) {
  if (report?.schema !== STUDIO_BENCHMARK_DIAGNOSTICS_SCHEMA) {
    throw new Error(`Studio benchmark diagnostics schema must be ${STUDIO_BENCHMARK_DIAGNOSTICS_SCHEMA}.`);
  }

  return [
    `schema: ${report.schema}`,
    `stability: ${report.stability}`,
    `sourceModel: ${report.sourceModel}`,
    `rendererIsSourceModel: ${report.rendererIsSourceModel}`,
    '',
    'source:',
    `  inputKind: ${report.source.inputKind}`,
    `  size: ${report.source.width} x ${report.source.height}`,
    `  cells: ${report.source.totalCells}`,
    `  layers: ${report.source.layerCount}`,
    `  frames: ${report.source.frameCount}`,
    '',
    'virtualGrid:',
    `  durationMs: ${report.metrics.virtualGrid.durationMs}`,
    `  visibleCells: ${report.metrics.virtualGrid.visibleCells}`,
    `  skippedCells: ${report.metrics.virtualGrid.skippedCells}`,
    `  rendererIsSourceModel: ${report.metrics.virtualGrid.rendererIsSourceModel}`,
    '',
    'canvas2d:',
    `  planDurationMs: ${report.metrics.canvas2d.planDurationMs}`,
    `  drawDurationMs: ${report.metrics.canvas2d.drawDurationMs}`,
    `  renderedCells: ${report.metrics.canvas2d.renderedCells}`,
    `  estimatedDrawCalls: ${report.metrics.canvas2d.estimatedDrawCalls}`,
    `  estimatedMemoryBytes: ${report.metrics.canvas2d.estimatedMemoryBytes}`,
    `  rendererIsSourceModel: ${report.metrics.canvas2d.rendererIsSourceModel}`,
    '',
    'thresholdStatus:',
    `  overall: ${report.thresholds.status.overall}`,
    `  virtualGridMs: ${report.thresholds.status.items.virtualGridMs}`,
    `  canvasPlanMs: ${report.thresholds.status.items.canvasPlanMs}`,
    `  canvasDrawMs: ${report.thresholds.status.items.canvasDrawMs}`,
    `  estimatedMemoryBytes: ${report.thresholds.status.items.estimatedMemoryBytes}`,
    '',
    'sourceMutation:',
    `  unchanged: ${report.sourceMutation.unchanged}`,
  ].join('\n');
}

// #endregion
