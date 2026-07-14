/**
 * ============================================================================
 * 🟦 语义文档布局渲染器
 * ============================================================================
 *
 * 🔶 模块职责
 * 将版本化语义文档组装为字符画文本。它不依赖 Node 或浏览器运行时，而是接收宿主提供的
 * `SemanticArtTextRenderer` 回调，因此所有宿主共享同一份跨度、字素宽度和表格边界算法。
 * ============================================================================
 */

import { assembleTextOutput } from '../assembler';
import { boxText, normalizeBoxOptions } from '../box/box';
import { normalizeSpacing, ZERO_SPACING } from '../box/spacing';
import type { BoxChars, BoxOptions, BoxSpacing } from '../box/types';
import { getGlyphWidth, padToWidth, repeatToWidth } from '../box/width';
import { createGlyphWidthCalculator, type GlyphWidthCalculator } from '../glyph/width';
import { normalizeLocale, t as translateCoreMessage, type SupportedLocale } from '../i18n';
import type { ArtConfig } from '../types/config';
import { ErrorCode, OutputFormat, UnicodeArtError, type ArtResult } from '../types/output';
import type {
  SemanticArtTextRenderer,
  SemanticBlock,
  SemanticCell,
  SemanticDocument,
  SemanticRenderOptions
} from '../types/semantic';
import { renderUnicodeArtFontText } from '../artFont/render';
import { validateSemanticDocument } from './document';

//#region 🟦 公共渲染入口

/**
 * 🟢 使用宿主文本渲染器生成语义文档字符画。
 *
 * `config.box` 为对象时决定外框、cell padding 与分隔线风格；为 `false` 时只输出表格主体。
 * 该 API 当前属于 experimental，JSON AST 是稳定候选，渲染细节仍可在 V1 范围内修正。
 */
export async function renderSemanticDocumentWithAdapter(
  input: SemanticDocument | unknown,
  config: ArtConfig,
  renderArtText: SemanticArtTextRenderer,
  options: SemanticRenderOptions = {}
): Promise<ArtResult> {
  const startTime = Date.now();
  const locale = normalizeLocale(config.locale);

  try {
    const document = validateSemanticDocument(input, { locale });
    const documentConfig = mergeDocumentConfig(config, document);
    const calculator = createGlyphWidthCalculator({
      profile: documentConfig.glyphWidthProfile,
      wideCharRegex: documentConfig.wideCharRegex,
      locale
    });
    const grid = placeDocumentCells(document, locale);
    const renderedCells = await renderCells(grid.cells, documentConfig, renderArtText, calculator, locale);
    const layoutOptions = resolveLayoutOptions(documentConfig.box, options, calculator);
    const table = renderTable(grid, renderedCells, layoutOptions, calculator);
    const content = layoutOptions.frame
      ? boxText(table, layoutOptions.outerBox, calculator)
      : table;
    const duration = Date.now() - startTime;

    return assembleTextOutput(
      content,
      { ...documentConfig, box: false },
      documentConfig.outputFormat || OutputFormat.PLAIN_TEXT,
      {
        sourceWidth: 0,
        sourceHeight: 0,
        charset: documentConfig.charset?.type || 'custom',
        matrixSize: documentConfig.matrixSize ?? 0,
        font: documentConfig.font,
        charsetSize: 0,
        semanticDocumentVersion: document.version,
        semanticRows: grid.rowCount,
        semanticColumns: grid.columnCount,
        duration
      }
    );
  } catch (error) {
    if (error instanceof UnicodeArtError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new UnicodeArtError(
      translateCoreMessage('semantic.layout.failed', { message }, locale),
      ErrorCode.SEMANTIC_LAYOUT_FAILED,
      {
        details: { originalError: error },
        messageKey: 'semantic.layout.failed',
        messageParams: { message },
        locale
      }
    );
  }
}

//#endregion

//#region 🟦 文档网格与内容块

interface PlacedCell {
  readonly cell: SemanticCell;
  readonly row: number;
  readonly col: number;
  readonly rowSpan: number;
  readonly colSpan: number;
  readonly implicit: boolean;
}

interface SemanticGrid {
  readonly rowCount: number;
  readonly columnCount: number;
  readonly slots: PlacedCell[][];
  readonly cells: PlacedCell[];
}

interface RenderedCell {
  readonly lines: string[];
  readonly width: number;
  readonly height: number;
}

function placeDocumentCells(document: SemanticDocument, locale: SupportedLocale): SemanticGrid {
  const rowCount = document.rows.length;
  const slots: Array<Array<PlacedCell | undefined>> = Array.from({ length: rowCount }, () => []);
  const cells: PlacedCell[] = [];

  document.rows.forEach((row, rowIndex) => {
    let column = 0;
    row.cells.forEach((cell, cellIndex) => {
      while (slots[rowIndex][column] !== undefined) {
        column += 1;
      }

      const rowSpan = cell.rowSpan ?? 1;
      const colSpan = cell.colSpan ?? 1;
      if (rowIndex + rowSpan > rowCount) {
        throw semanticLayoutError('semantic.layout.spanOutOfBounds', locale, {
          row: rowIndex + 1,
          cell: cellIndex + 1
        });
      }

      const placed: PlacedCell = { cell, row: rowIndex, col: column, rowSpan, colSpan, implicit: false };
      for (let targetRow = rowIndex; targetRow < rowIndex + rowSpan; targetRow++) {
        for (let targetColumn = column; targetColumn < column + colSpan; targetColumn++) {
          if (slots[targetRow][targetColumn] !== undefined) {
            throw semanticLayoutError('semantic.layout.spanConflict', locale, {
              row: rowIndex + 1,
              cell: cellIndex + 1
            });
          }
          slots[targetRow][targetColumn] = placed;
        }
      }
      cells.push(placed);
      column += colSpan;
    });
  });

  const columnCount = Math.max(1, ...slots.map((row) => row.length));
  for (let row = 0; row < rowCount; row++) {
    for (let column = 0; column < columnCount; column++) {
      if (slots[row][column] !== undefined) {
        continue;
      }
      const placed: PlacedCell = {
        cell: { blocks: [{ kind: 'raw-text', text: '' }] },
        row,
        col: column,
        rowSpan: 1,
        colSpan: 1,
        implicit: true
      };
      slots[row][column] = placed;
      cells.push(placed);
    }
  }

  return { rowCount, columnCount, slots: slots as PlacedCell[][], cells };
}

async function renderCells(
  cells: readonly PlacedCell[],
  config: ArtConfig,
  renderArtText: SemanticArtTextRenderer,
  calculator: GlyphWidthCalculator,
  locale: SupportedLocale
): Promise<Map<PlacedCell, RenderedCell>> {
  const results = await Promise.all(cells.map(async (placed) => [
    placed,
    await renderCell(placed.cell, config, renderArtText, calculator, locale)
  ] as const));
  return new Map(results);
}

async function renderCell(
  cell: SemanticCell,
  config: ArtConfig,
  renderArtText: SemanticArtTextRenderer,
  calculator: GlyphWidthCalculator,
  locale: SupportedLocale
): Promise<RenderedCell> {
  const lines: string[] = [];
  let inlineBlocks: string[][] = [];

  const flushInlineBlocks = (): void => {
    if (inlineBlocks.length > 0) {
      lines.push(...combineInlineBlocks(inlineBlocks, calculator));
      inlineBlocks = [];
    }
  };

  for (const block of cell.blocks) {
    const blockLines = await renderBlock(block, config, renderArtText, calculator, locale);
    if (block.display === 'block') {
      flushInlineBlocks();
      lines.push(...blockLines);
    } else {
      inlineBlocks.push(blockLines);
    }
  }
  flushInlineBlocks();

  const normalizedLines = lines.length > 0 ? lines : [''];
  return {
    lines: normalizedLines,
    width: normalizedLines.reduce((max, line) => Math.max(max, getGlyphWidth(line, calculator)), 0),
    height: normalizedLines.length
  };
}

async function renderBlock(
  block: SemanticBlock,
  config: ArtConfig,
  renderArtText: SemanticArtTextRenderer,
  calculator: GlyphWidthCalculator,
  locale: SupportedLocale
): Promise<string[]> {
  if (block.kind === 'raw-text') {
    return block.text.replace(/\r\n|\r/gu, '\n').split('\n');
  }

  if (block.kind === 'art-font-text') {
    return renderUnicodeArtFontText(block.font, block.text, { calculator, locale }).outputLines;
  }

  const result = await renderArtText(
    block.text.length === 0 ? ' ' : block.text,
    {
      ...config,
      ...block.options,
      glyphFont: {
        ...config.glyphFont,
        ...block.options?.glyphFont
      },
      box: false,
      outputFormat: OutputFormat.PLAIN_TEXT
    }
  );
  return result.content.split('\n');
}

function combineInlineBlocks(blocks: readonly string[][], calculator: GlyphWidthCalculator): string[] {
  const widths = blocks.map((block) => block.reduce((max, line) => Math.max(max, getGlyphWidth(line, calculator)), 0));
  const height = Math.max(1, ...blocks.map((block) => block.length));
  const lines: string[] = [];

  for (let row = 0; row < height; row++) {
    lines.push(blocks.map((block, index) =>
      padToWidth(block[row] ?? '', widths[index], 'left', calculator)
    ).join(''));
  }
  return lines;
}

function mergeDocumentConfig(config: ArtConfig, document: SemanticDocument): ArtConfig {
  const glyphWidthProfile = document.options?.glyphWidthProfile ?? config.glyphWidthProfile;
  const wideCharRegex = document.options?.wideCharRegex ?? config.wideCharRegex;
  return {
    ...config,
    glyphFont: {
      ...config.glyphFont,
      widthProfile: glyphWidthProfile,
      wideCharRegex
    },
    glyphWidthProfile,
    wideCharRegex
  };
}

//#endregion

//#region 🟦 表格布局与边框

interface LayoutOptions {
  readonly frame: boolean;
  readonly outerBox: false | BoxOptions;
  readonly chars: BoxChars;
  readonly cellPadding: BoxSpacing;
  readonly minCellWidth: number;
  readonly minCellHeight: number;
  readonly drawColumns: boolean;
  readonly shouldDrawRowSeparator: (afterRow: number) => boolean;
  readonly borderWidth: number;
}

function resolveLayoutOptions(
  box: ArtConfig['box'],
  options: SemanticRenderOptions,
  calculator: GlyphWidthCalculator
): LayoutOptions {
  const rawBox = box === false || box === undefined ? false : box;
  const boxOptions = rawBox === false ? undefined : rawBox;
  const outerBox = boxOptions === undefined ? false : toOuterBoxOptions(boxOptions);
  const normalized = normalizeBoxOptions(outerBox === false ? {} : outerBox);
  const gridEnabled = options.grid ?? true;
  const separators = boxOptions?.separators;
  const rowSetting = separators?.rows;
  const drawColumns = gridEnabled && (separators?.columns === undefined || separators.columns === true);
  const borderWidth = Math.max(
    1,
    ...Object.values(normalized.chars).map((glyph) => getGlyphWidth(glyph || ' ', calculator))
  );

  return {
    frame: rawBox !== false && rawBox.enabled !== false,
    outerBox,
    chars: normalized.chars,
    cellPadding: boxOptions ? normalizeSpacing(boxOptions.cell?.padding, 0) : ZERO_SPACING,
    minCellWidth: boxOptions?.cell?.minWidth ?? 0,
    minCellHeight: boxOptions?.cell?.minHeight ?? 0,
    drawColumns,
    shouldDrawRowSeparator: (afterRow) => {
      if (!gridEnabled) {
        return false;
      }
      if (Array.isArray(rowSetting)) {
        return rowSetting.includes(afterRow + 1);
      }
      return rowSetting === undefined || rowSetting === true;
    },
    borderWidth
  };
}

function toOuterBoxOptions(box: BoxOptions): BoxOptions {
  const { mode, renderStage, separators, cell, ...outer } = box;
  void mode;
  void renderStage;
  void separators;
  void cell;
  return { ...outer, mode: 'outer', renderStage: 'post' };
}

function renderTable(
  grid: SemanticGrid,
  rendered: ReadonlyMap<PlacedCell, RenderedCell>,
  options: LayoutOptions,
  calculator: GlyphWidthCalculator
): string {
  const columnWidths = calculateColumnWidths(grid, rendered, options, calculator);
  const rowHeights = calculateRowHeights(grid, rendered, options);
  const lines: string[] = [];

  for (let row = 0; row < grid.rowCount; row++) {
    for (let line = 0; line < rowHeights[row]; line++) {
      lines.push(renderBodyLine(grid, rendered, row, line, columnWidths, rowHeights, options, calculator));
    }
    if (row < grid.rowCount - 1 && options.shouldDrawRowSeparator(row)) {
      lines.push(renderInnerBoundary(grid, rendered, row + 1, columnWidths, rowHeights, options, calculator));
    }
  }

  return lines.join('\n');
}

function calculateColumnWidths(
  grid: SemanticGrid,
  rendered: ReadonlyMap<PlacedCell, RenderedCell>,
  options: LayoutOptions,
  calculator: GlyphWidthCalculator
): number[] {
  const widths = Array.from({ length: grid.columnCount }, () => options.minCellWidth);
  const cells = [...grid.cells].sort((left, right) => left.colSpan - right.colSpan);

  for (const placed of cells) {
    const renderedCell = rendered.get(placed);
    if (!renderedCell) {
      continue;
    }
    const required = renderedCell.width + options.cellPadding.left + options.cellPadding.right;
    const available = getSpanWidth(widths, placed.col, placed.colSpan, options);
    distributeDeficit(widths, placed.col, placed.colSpan, required - available);
  }

  // 触发一次读取，确保未来替换为惰性 profile 时不会遗漏计算器边界。
  void calculator.getCacheSize();
  return widths;
}

function calculateRowHeights(
  grid: SemanticGrid,
  rendered: ReadonlyMap<PlacedCell, RenderedCell>,
  options: LayoutOptions
): number[] {
  const heights = Array.from({ length: grid.rowCount }, () => options.minCellHeight);
  const cells = [...grid.cells].sort((left, right) => left.rowSpan - right.rowSpan);

  for (const placed of cells) {
    const renderedCell = rendered.get(placed);
    if (!renderedCell) {
      continue;
    }
    const required = renderedCell.height + options.cellPadding.top + options.cellPadding.bottom;
    const available = getSpanHeight(heights, placed.row, placed.rowSpan, options);
    distributeDeficit(heights, placed.row, placed.rowSpan, required - available);
  }
  return heights;
}

function renderBodyLine(
  grid: SemanticGrid,
  rendered: ReadonlyMap<PlacedCell, RenderedCell>,
  row: number,
  line: number,
  columnWidths: readonly number[],
  rowHeights: readonly number[],
  options: LayoutOptions,
  calculator: GlyphWidthCalculator
): string {
  const segments: string[] = [];
  let column = 0;
  while (column < grid.columnCount) {
    const placed = grid.slots[row][column];
    const renderedCell = rendered.get(placed);
    if (!renderedCell || placed.col !== column) {
      throw new Error('Semantic grid placement is inconsistent');
    }
    const width = getSpanWidth(columnWidths, placed.col, placed.colSpan, options);
    const height = getSpanHeight(rowHeights, placed.row, placed.rowSpan, options);
    const contentLine = getCellLine(
      renderedCell,
      getBodyLineOffset(placed, row, line, rowHeights, options),
      width,
      height,
      placed.cell,
      options,
      calculator
    );
    segments.push(contentLine);
    column += placed.colSpan;
  }

  return options.drawColumns
    ? segments.join(borderGlyph(options.chars.vertical, options.borderWidth, calculator))
    : segments.join('');
}

function renderInnerBoundary(
  grid: SemanticGrid,
  rendered: ReadonlyMap<PlacedCell, RenderedCell>,
  boundary: number,
  columnWidths: readonly number[],
  rowHeights: readonly number[],
  options: LayoutOptions,
  calculator: GlyphWidthCalculator
): string {
  const parts: string[] = [];
  let column = 0;
  while (column < grid.columnCount) {
    if (column > 0 && options.drawColumns) {
      parts.push(renderJunction(grid, boundary, column, options, calculator));
    }

    const above = grid.slots[boundary - 1][column];
    const below = grid.slots[boundary][column];
    if (above === below && above.col === column) {
      const renderedCell = rendered.get(above);
      if (!renderedCell) {
        throw new Error('Missing semantic cell rendering');
      }
      parts.push(getCellLine(
        renderedCell,
        getBoundaryLineOffset(above, boundary, rowHeights, options),
        getSpanWidth(columnWidths, above.col, above.colSpan, options),
        getSpanHeight(rowHeights, above.row, above.rowSpan, options),
        above.cell,
        options,
        calculator
      ));
      column += above.colSpan;
      continue;
    }

    parts.push(repeatToWidth(options.chars.horizontal || '-', columnWidths[column], calculator));
    column += 1;
  }
  return parts.join('');
}

function renderJunction(
  grid: SemanticGrid,
  boundary: number,
  column: number,
  options: LayoutOptions,
  calculator: GlyphWidthCalculator
): string {
  const left = hasHorizontalEdge(grid, boundary, column - 1);
  const right = hasHorizontalEdge(grid, boundary, column);
  const up = hasVerticalEdge(grid, boundary - 1, column);
  const down = hasVerticalEdge(grid, boundary, column);
  const chars = options.chars;
  let glyph: string;

  if (left && right && up && down) glyph = chars.cross;
  else if (left && right && down) glyph = chars.topJoin;
  else if (left && right && up) glyph = chars.bottomJoin;
  else if (up && down && right) glyph = chars.leftJoin;
  else if (up && down && left) glyph = chars.rightJoin;
  else if (right && down) glyph = chars.topLeft;
  else if (left && down) glyph = chars.topRight;
  else if (right && up) glyph = chars.bottomLeft;
  else if (left && up) glyph = chars.bottomRight;
  else if (up || down) glyph = chars.vertical;
  else if (left || right) glyph = chars.horizontal;
  else glyph = ' ';

  return borderGlyph(glyph, options.borderWidth, calculator);
}

function hasHorizontalEdge(grid: SemanticGrid, boundary: number, column: number): boolean {
  return grid.slots[boundary - 1][column] !== grid.slots[boundary][column];
}

function hasVerticalEdge(grid: SemanticGrid, row: number, column: number): boolean {
  if (row < 0 || row >= grid.rowCount || column <= 0 || column >= grid.columnCount) {
    return false;
  }
  return grid.slots[row][column - 1] !== grid.slots[row][column];
}

function getCellLine(
  rendered: RenderedCell,
  line: number,
  width: number,
  height: number,
  cell: SemanticCell,
  options: LayoutOptions,
  calculator: GlyphWidthCalculator
): string {
  const contentWidth = Math.max(0, width - options.cellPadding.left - options.cellPadding.right);
  const contentHeight = Math.max(0, height - options.cellPadding.top - options.cellPadding.bottom);
  if (line < options.cellPadding.top || line >= options.cellPadding.top + contentHeight) {
    return ' '.repeat(width);
  }

  const contentLine = line - options.cellPadding.top;
  const extra = Math.max(0, contentHeight - rendered.height);
  const verticalAlign = cell.verticalAlign ?? 'top';
  const before = verticalAlign === 'bottom' ? extra : verticalAlign === 'middle' ? Math.floor(extra / 2) : 0;
  const sourceLine = contentLine - before;
  const source = sourceLine >= 0 && sourceLine < rendered.lines.length ? rendered.lines[sourceLine] : '';
  const aligned = padToWidth(source, contentWidth, cell.align ?? 'left', calculator);
  return `${' '.repeat(options.cellPadding.left)}${aligned}${' '.repeat(options.cellPadding.right)}`;
}

function getBodyLineOffset(
  placed: PlacedCell,
  row: number,
  line: number,
  rowHeights: readonly number[],
  options: LayoutOptions
): number {
  let offset = 0;
  for (let current = placed.row; current < row; current++) {
    offset += rowHeights[current];
    if (options.shouldDrawRowSeparator(current)) {
      offset += 1;
    }
  }
  return offset + line;
}

function getBoundaryLineOffset(
  placed: PlacedCell,
  boundary: number,
  rowHeights: readonly number[],
  options: LayoutOptions
): number {
  let offset = 0;
  for (let current = placed.row; current < boundary; current++) {
    offset += rowHeights[current];
    if (current < boundary - 1 && options.shouldDrawRowSeparator(current)) {
      offset += 1;
    }
  }
  return offset;
}

function getSpanWidth(
  widths: readonly number[],
  start: number,
  span: number,
  options: LayoutOptions
): number {
  let width = 0;
  for (let index = start; index < start + span; index++) {
    width += widths[index];
  }
  return width + (options.drawColumns ? Math.max(0, span - 1) * options.borderWidth : 0);
}

function getSpanHeight(
  heights: readonly number[],
  start: number,
  span: number,
  options: LayoutOptions
): number {
  let height = 0;
  for (let index = start; index < start + span; index++) {
    height += heights[index];
    if (index < start + span - 1 && options.shouldDrawRowSeparator(index)) {
      height += 1;
    }
  }
  return height;
}

function distributeDeficit(widths: number[], start: number, span: number, deficit: number): void {
  for (let index = 0; index < deficit; index++) {
    widths[start + (index % span)] += 1;
  }
}

function borderGlyph(glyph: string, width: number, calculator: GlyphWidthCalculator): string {
  return padToWidth(glyph || ' ', width, 'left', calculator);
}

//#endregion

//#region 🟦 错误工具

function semanticLayoutError(
  key: 'semantic.layout.spanConflict' | 'semantic.layout.spanOutOfBounds',
  locale: SupportedLocale,
  params: Record<string, string | number>
): UnicodeArtError {
  return new UnicodeArtError(
    translateCoreMessage(key, params, locale),
    ErrorCode.SEMANTIC_DOCUMENT_INVALID,
    { details: params, messageKey: key, messageParams: params, locale }
  );
}

//#endregion
