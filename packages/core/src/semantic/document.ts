/**
 * ============================================================================
 * 🟦 语义文档验证与 DSL 解析
 * ============================================================================
 *
 * 🔶 模块职责
 * 验证 canonical JSON AST，并将受限轻量 DSL 解析为同一份 AST。
 * DSL 不承担完整模板语言职责：首版只支持转义、行/列边界、角色、跨度与原字块。
 * ============================================================================
 */

import { normalizeLocale, t as translateCoreMessage, type SupportedLocale } from '../i18n';
import { ErrorCode, UnicodeArtError } from '../types/output';
import type {
  SemanticBlock,
  SemanticCell,
  SemanticDocumentV1,
  SemanticDslParseOptions,
  SemanticJsonParseOptions,
  SemanticRow,
  SemanticRowRole,
  SemanticRowSeparatorMode
} from '../types/semantic';

//#region 🟦 Public API

/** 解析 canonical JSON 字符串并验证为 V1 语义文档。 */
export function parseSemanticDocumentJson(
  source: string,
  options: SemanticJsonParseOptions = {}
): SemanticDocumentV1 {
  const locale = normalizeLocale(options.locale);
  try {
    return validateSemanticDocument(JSON.parse(source), { locale });
  } catch (error) {
    if (error instanceof UnicodeArtError) {
      throw error;
    }

    const position = extractJsonPosition(error);
    throw semanticError(
      'semantic.json.invalid',
      ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED,
      locale,
      { message: error instanceof Error ? error.message : String(error) },
      position
    );
  }
}

/**
 * 验证 unknown 输入并返回可安全消费的 V1 文档。
 *
 * 只接受当前版本已知字段及明确的 `extensions` 命名空间，避免拼写错误被静默吞掉。
 */
export function validateSemanticDocument(
  input: unknown,
  options: { locale?: string } = {}
): SemanticDocumentV1 {
  const locale = normalizeLocale(options.locale);
  const document = expectRecord(input, locale, 'semantic.document.object');
  assertOnlyKeys(document, ['version', 'rows', 'options', 'extensions'], locale, 'document');

  if (document.version !== 1) {
    throw semanticError('semantic.document.version', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {
      version: String(document.version ?? '')
    });
  }

  if (!Array.isArray(document.rows) || document.rows.length === 0) {
    throw semanticError('semantic.document.rows', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {});
  }

  const rows = document.rows.map((row, rowIndex) => validateRow(row, rowIndex, locale));
  const normalized: SemanticDocumentV1 = { version: 1, rows };

  if (document.options !== undefined) {
    normalized.options = validateDocumentOptions(document.options, locale);
  }
  if (document.extensions !== undefined) {
    normalized.extensions = expectRecord(document.extensions, locale, 'semantic.document.object');
  }

  return normalized;
}

/**
 * 解析受限 DSL。
 *
 * DSL 规则：
 * - `{h}` / `{f}` 仅可位于行首，分别代表表头与页脚。
 * - `{rowspan:n}` / `{colspan:n}` 为推荐跨度标签；`{c:n}` / `{r:n}` 为兼容别名。
 * - `{t:...}` 为原字块，不能嵌套其它标签。
 * - `\\`、`\{`、`\}`、`\|` 或自定义分隔符首字符可用于字面量转义。
 */
export function parseSemanticDsl(
  source: string,
  options: SemanticDslParseOptions = {}
): SemanticDocumentV1 {
  const locale = normalizeLocale(options.locale);
  const rowSeparator = options.rowSeparator ?? 'lineBreak';
  const columnSeparator = normalizeColumnSeparator(options.columnSeparator, locale);
  const rows = splitDslRows(source, rowSeparator, locale);

  if (rows.length === 0) {
    throw semanticError('semantic.document.rows', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, {});
  }

  return {
    version: 1,
    rows: rows.map((rowSource, rowIndex) => parseDslRow(rowSource, rowIndex, columnSeparator, locale))
  };
}

//#endregion

//#region 🟦 AST 验证

function validateRow(input: unknown, rowIndex: number, locale: SupportedLocale): SemanticRow {
  const row = expectRecord(input, locale, 'semantic.row.cells', { row: rowIndex + 1 });
  assertOnlyKeys(row, ['role', 'cells', 'extensions'], locale, `rows[${rowIndex}]`);

  if (row.role !== undefined && row.role !== 'header' && row.role !== 'body' && row.role !== 'footer') {
    throw semanticError('semantic.row.role', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {
      row: rowIndex + 1,
      role: String(row.role)
    });
  }
  if (!Array.isArray(row.cells) || row.cells.length === 0) {
    throw semanticError('semantic.row.cells', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, { row: rowIndex + 1 });
  }

  const normalized: SemanticRow = {
    ...(row.role !== undefined ? { role: row.role as SemanticRowRole } : {}),
    cells: row.cells.map((cell, cellIndex) => validateCell(cell, rowIndex, cellIndex, locale))
  };
  if (row.extensions !== undefined) {
    normalized.extensions = expectRecord(row.extensions, locale, 'semantic.row.cells', { row: rowIndex + 1 });
  }
  return normalized;
}

function validateCell(input: unknown, rowIndex: number, cellIndex: number, locale: SupportedLocale): SemanticCell {
  const cell = expectRecord(input, locale, 'semantic.cell.blocks', { row: rowIndex + 1, cell: cellIndex + 1 });
  assertOnlyKeys(
    cell,
    ['rowSpan', 'colSpan', 'blocks', 'align', 'verticalAlign', 'role', 'extensions'],
    locale,
    `rows[${rowIndex}].cells[${cellIndex}]`
  );

  const rowSpan = validateSpan(cell.rowSpan, 'rowSpan', rowIndex, cellIndex, locale);
  const colSpan = validateSpan(cell.colSpan, 'colSpan', rowIndex, cellIndex, locale);
  if (!Array.isArray(cell.blocks) || cell.blocks.length === 0) {
    throw semanticError('semantic.cell.blocks', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {
      row: rowIndex + 1,
      cell: cellIndex + 1
    });
  }

  const normalized: SemanticCell = {
    ...(rowSpan !== 1 ? { rowSpan } : {}),
    ...(colSpan !== 1 ? { colSpan } : {}),
    blocks: cell.blocks.map((block, blockIndex) => validateBlock(block, rowIndex, cellIndex, blockIndex, locale))
  };

  if (cell.align !== undefined) {
    if (cell.align !== 'left' && cell.align !== 'center' && cell.align !== 'right') {
      throw semanticError('semantic.cell.align', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {
        row: rowIndex + 1,
        cell: cellIndex + 1,
        value: String(cell.align)
      });
    }
    normalized.align = cell.align;
  }
  if (cell.verticalAlign !== undefined) {
    if (cell.verticalAlign !== 'top' && cell.verticalAlign !== 'middle' && cell.verticalAlign !== 'bottom') {
      throw semanticError('semantic.cell.verticalAlign', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {
        row: rowIndex + 1,
        cell: cellIndex + 1,
        value: String(cell.verticalAlign)
      });
    }
    normalized.verticalAlign = cell.verticalAlign;
  }
  if (cell.role !== undefined) {
    const validRoles = ['corner', 'row-header', 'column-header', 'body', 'footer'];
    if (!validRoles.includes(String(cell.role))) {
      throw semanticError('semantic.cell.role', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {
        row: rowIndex + 1,
        cell: cellIndex + 1,
        value: String(cell.role)
      });
    }
    normalized.role = cell.role as SemanticCell['role'];
  }
  if (cell.extensions !== undefined) {
    normalized.extensions = expectRecord(cell.extensions, locale, 'semantic.cell.blocks', {
      row: rowIndex + 1,
      cell: cellIndex + 1
    });
  }

  return normalized;
}

function validateBlock(
  input: unknown,
  rowIndex: number,
  cellIndex: number,
  blockIndex: number,
  locale: SupportedLocale
): SemanticBlock {
  const block = expectRecord(input, locale, 'semantic.block.kind', {
    row: rowIndex + 1,
    cell: cellIndex + 1,
    block: blockIndex + 1
  });
  assertOnlyKeys(block, ['kind', 'text', 'options', 'display'], locale, `block[${blockIndex}]`);

  if (block.kind !== 'art-text' && block.kind !== 'raw-text') {
    throw semanticError('semantic.block.kind', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {
      row: rowIndex + 1,
      cell: cellIndex + 1,
      block: blockIndex + 1,
      kind: String(block.kind)
    });
  }
  if (typeof block.text !== 'string') {
    throw semanticError('semantic.block.text', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {
      row: rowIndex + 1,
      cell: cellIndex + 1,
      block: blockIndex + 1
    });
  }
  if (block.display !== undefined && block.display !== 'inline' && block.display !== 'block') {
    throw semanticError('semantic.block.display', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {
      row: rowIndex + 1,
      cell: cellIndex + 1,
      block: blockIndex + 1,
      value: String(block.display)
    });
  }

  if (block.kind === 'raw-text') {
    return {
      kind: 'raw-text',
      text: block.text,
      ...(block.display !== undefined ? { display: block.display as 'inline' | 'block' } : {})
    };
  }

  if (block.options !== undefined && !isRecord(block.options)) {
    throw semanticError('semantic.block.options', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {
      row: rowIndex + 1,
      cell: cellIndex + 1,
      block: blockIndex + 1
    });
  }
  return {
    kind: 'art-text',
    text: block.text,
    ...(block.options !== undefined ? { options: block.options } : {}),
    ...(block.display !== undefined ? { display: block.display as 'inline' | 'block' } : {})
  };
}

function validateDocumentOptions(input: unknown, locale: SupportedLocale): SemanticDocumentV1['options'] {
  const options = expectRecord(input, locale, 'semantic.document.object');
  assertOnlyKeys(options, ['glyphWidthProfile', 'wideCharRegex', 'extensions'], locale, 'options');
  if (options.glyphWidthProfile !== undefined && typeof options.glyphWidthProfile !== 'string') {
    throw semanticError('semantic.document.options', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {});
  }
  if (options.wideCharRegex !== undefined && typeof options.wideCharRegex !== 'string') {
    throw semanticError('semantic.document.options', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {});
  }
  return {
    ...(options.glyphWidthProfile !== undefined ? { glyphWidthProfile: options.glyphWidthProfile } : {}),
    ...(options.wideCharRegex !== undefined ? { wideCharRegex: options.wideCharRegex } : {}),
    ...(options.extensions !== undefined
      ? { extensions: expectRecord(options.extensions, locale, 'semantic.document.object') }
      : {})
  };
}

function validateSpan(
  value: unknown,
  name: 'rowSpan' | 'colSpan',
  rowIndex: number,
  cellIndex: number,
  locale: SupportedLocale
): number {
  if (value === undefined) {
    return 1;
  }
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 1000) {
    throw semanticError('semantic.cell.span', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, {
      row: rowIndex + 1,
      cell: cellIndex + 1,
      name,
      value: String(value)
    });
  }
  return value as number;
}

//#endregion

//#region 🟦 DSL 解析

function parseDslRow(source: string, rowIndex: number, separator: string, locale: SupportedLocale): SemanticRow {
  let rest = source;
  let role: SemanticRowRole | undefined;
  if (rest.startsWith('{h}')) {
    role = 'header';
    rest = rest.slice(3);
  } else if (rest.startsWith('{f}')) {
    role = 'footer';
    rest = rest.slice(3);
  }

  const cells = splitTopLevel(rest, separator, rowIndex, locale).map((cellSource, cellIndex) =>
    parseDslCell(cellSource, rowIndex, cellIndex, locale)
  );

  return { ...(role ? { role } : {}), cells };
}

function parseDslCell(source: string, rowIndex: number, cellIndex: number, locale: SupportedLocale): SemanticCell {
  let offset = 0;
  let rowSpan: number | undefined;
  let colSpan: number | undefined;

  while (source[offset] === '{') {
    const match = /^\{(rowspan|colspan|c|r):(\d+)\}/u.exec(source.slice(offset));
    if (!match) {
      break;
    }
    const span = Number(match[2]);
    if (!Number.isInteger(span) || span < 1 || span > 1000) {
      throw semanticError('semantic.cell.span', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, {
        row: rowIndex + 1,
        cell: cellIndex + 1,
        value: match[2]
      });
    }
    const target = match[1] === 'rowspan' || match[1] === 'c' ? 'row' : 'column';
    if (target === 'row') {
      if (rowSpan !== undefined) {
        throw semanticError('semantic.dsl.duplicateSpan', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, {
          row: rowIndex + 1,
          cell: cellIndex + 1,
          name: 'rowSpan'
        });
      }
      rowSpan = span;
    } else {
      if (colSpan !== undefined) {
        throw semanticError('semantic.dsl.duplicateSpan', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, {
          row: rowIndex + 1,
          cell: cellIndex + 1,
          name: 'colSpan'
        });
      }
      colSpan = span;
    }
    offset += match[0].length;
  }

  const blocks = parseDslBlocks(source.slice(offset), rowIndex, cellIndex, locale);
  return {
    ...(rowSpan !== undefined ? { rowSpan } : {}),
    ...(colSpan !== undefined ? { colSpan } : {}),
    blocks
  };
}

function parseDslBlocks(source: string, rowIndex: number, cellIndex: number, locale: SupportedLocale): SemanticBlock[] {
  const blocks: SemanticBlock[] = [];
  let artText = '';
  let index = 0;

  const flushArtText = (): void => {
    if (artText.length > 0) {
      blocks.push({ kind: 'art-text', text: artText });
      artText = '';
    }
  };

  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      const escaped = source[index + 1];
      if (!escaped || !['\\', '{', '}', '|'].includes(escaped)) {
        throw semanticError('semantic.dsl.escape', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, {
          row: rowIndex + 1,
          cell: cellIndex + 1,
          column: index + 1
        });
      }
      artText += escaped;
      index += 2;
      continue;
    }

    if (source.startsWith('{t:', index)) {
      const end = findDslTagEnd(source, index + 3);
      if (end === -1) {
        throw semanticError('semantic.dsl.syntax', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, {
          row: rowIndex + 1,
          cell: cellIndex + 1,
          column: index + 1
        });
      }
      flushArtText();
      blocks.push({ kind: 'raw-text', text: decodeDslLiteral(source.slice(index + 3, end), rowIndex, cellIndex, locale) });
      index = end + 1;
      continue;
    }

    if (char === '{' || char === '}') {
      throw semanticError('semantic.dsl.syntax', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, {
        row: rowIndex + 1,
        cell: cellIndex + 1,
        column: index + 1
      });
    }

    artText += char;
    index += 1;
  }

  flushArtText();
  return blocks.length > 0 ? blocks : [{ kind: 'raw-text', text: '' }];
}

function splitDslRows(source: string, mode: SemanticRowSeparatorMode, locale: SupportedLocale): string[] {
  if (mode === 'lineBreak') {
    return source.split(/\r\n|\n|\r/u);
  }
  if (mode === 'semantic') {
    return splitTopLevel(source, '{n}', 0, locale);
  }
  if (mode !== 'both') {
    throw semanticError('semantic.dsl.rowSeparator', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, { mode });
  }

  const rows: string[] = [];
  let start = 0;
  let index = 0;
  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2;
      continue;
    }
    if (source.startsWith('{t:', index)) {
      const end = findDslTagEnd(source, index + 3);
      if (end === -1) {
        throw semanticError('semantic.dsl.syntax', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, { column: index + 1 });
      }
      index = end + 1;
      continue;
    }
    const semanticThenLineBreak = /^\{n\}(?:\r\n|\n|\r)/u.exec(source.slice(index));
    const lineBreakThenSemantic = /^(?:\r\n|\n|\r)\{n\}/u.exec(source.slice(index));
    const separator = semanticThenLineBreak || lineBreakThenSemantic;
    if (separator) {
      rows.push(source.slice(start, index));
      index += separator[0].length;
      start = index;
      continue;
    }
    if (source.startsWith('{n}', index) || source[index] === '\n' || source[index] === '\r') {
      throw semanticError('semantic.dsl.rowBoundary', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, {
        column: index + 1
      });
    }
    index += 1;
  }
  rows.push(source.slice(start));
  return rows;
}

function splitTopLevel(source: string, separator: string, rowIndex: number, locale: SupportedLocale): string[] {
  const result: string[] = [];
  let start = 0;
  let index = 0;

  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2;
      continue;
    }
    if (source.startsWith('{t:', index)) {
      const end = findDslTagEnd(source, index + 3);
      if (end === -1) {
        throw semanticError('semantic.dsl.syntax', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, {
          row: rowIndex + 1,
          column: index + 1
        });
      }
      index = end + 1;
      continue;
    }
    if (source.startsWith(separator, index)) {
      result.push(source.slice(start, index));
      index += separator.length;
      start = index;
      continue;
    }
    index += 1;
  }
  result.push(source.slice(start));
  return result;
}

function decodeDslLiteral(source: string, rowIndex: number, cellIndex: number, locale: SupportedLocale): string {
  let result = '';
  for (let index = 0; index < source.length; index++) {
    if (source[index] !== '\\') {
      result += source[index];
      continue;
    }
    const escaped = source[index + 1];
    if (!escaped || !['\\', '{', '}', '|'].includes(escaped)) {
      throw semanticError('semantic.dsl.escape', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, {
        row: rowIndex + 1,
        cell: cellIndex + 1,
        column: index + 1
      });
    }
    result += escaped;
    index += 1;
  }
  return result;
}

function findDslTagEnd(source: string, start: number): number {
  for (let index = start; index < source.length; index++) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] === '}') {
      return index;
    }
    if (source[index] === '{') {
      return -1;
    }
  }
  return -1;
}

function normalizeColumnSeparator(separator: string | undefined, locale: SupportedLocale): string {
  const normalized = separator ?? '|';
  if (!normalized || normalized.length > 8 || /[\r\n\\]/u.test(normalized)) {
    throw semanticError('semantic.dsl.columnSeparator', ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED, locale, {
      separator: normalized
    });
  }
  return normalized;
}

//#endregion

//#region 🟦 通用错误与类型工具

function expectRecord(
  value: unknown,
  locale: SupportedLocale,
  key: 'semantic.document.object' | 'semantic.row.cells' | 'semantic.cell.blocks' | 'semantic.block.kind',
  params: Record<string, string | number> = {}
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw semanticError(key, ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, params);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  locale: SupportedLocale,
  path: string
): void {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) {
    throw semanticError('semantic.document.unknownField', ErrorCode.SEMANTIC_DOCUMENT_INVALID, locale, { path, field: unknown });
  }
}

function extractJsonPosition(error: unknown): { line: number; column: number } {
  const message = error instanceof Error ? error.message : '';
  const match = /position (\d+)/u.exec(message);
  if (!match) {
    return { line: 1, column: 1 };
  }
  return { line: 1, column: Number(match[1]) + 1 };
}

function semanticError(
  key: Parameters<typeof translateCoreMessage>[0],
  code: ErrorCode,
  locale: SupportedLocale,
  params: Record<string, string | number> = {},
  position: Record<string, number> = {}
): UnicodeArtError {
  return new UnicodeArtError(
    translateCoreMessage(key, params, locale),
    code,
    {
      details: { ...params, ...position },
      messageKey: key,
      messageParams: params,
      locale
    }
  );
}

//#endregion
