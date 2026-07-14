/**
 * ============================================================================
 * 🟦 Unicode 艺术字字体文档校验器
 * ============================================================================
 *
 * 🔶 模块职责
 * 解析与校验 UAF v1 JSON。这里故意不读取文件、不下载资产、不执行外部
 * FIGlet importer，确保 Node、Browser、pure entry 共享同一确定性规则。
 *
 * 🔶 许可证边界
 * SPDX expression 仅做受限语法检查；是否可作为官方随包资产由
 * `isPermissiveUnicodeArtFontLicense` 的明确政策判断，不能把它当法律意见。
 * ==========================================================================
 */

import { createGlyphWidthCalculator } from '../glyph/width';
import { normalizeLocale, t as translateCoreMessage } from '../i18n';
import type { MessageKey, MessageParams, SupportedLocale } from '../i18n';
import { ErrorCode, UnicodeArtError } from '../types/output';
import {
  UNICODE_ART_FONT_FORMAT,
  type UnicodeArtFont,
  type UnicodeArtFontCreation,
  type UnicodeArtFontExtensions,
  type UnicodeArtFontGlyph,
  type UnicodeArtFontLicense,
  type UnicodeArtFontMetadata,
  type UnicodeArtFontMetrics,
  type UnicodeArtFontParseOptions,
  type UnicodeArtFontV1
} from '../types/artFont';

//#region 🟦 常量与公共政策

const MAX_FONT_GLYPHS = 4096;
const MAX_GLYPH_HEIGHT = 128;
const MAX_ADVANCE = 512;
const MAX_GLYPH_LINE_CODE_POINTS = 512;
const MAX_AUTHORS = 16;
const ID_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{0,126}[a-z0-9])?$/;
const EXTENSION_NAMESPACE_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;
const SPDX_IDENTIFIER_PATTERN = /^(?:LicenseRef-)?[A-Za-z0-9][A-Za-z0-9.+-]*$/;

/** 官方随包艺术字允许使用的宽松 SPDX 标识符。 */
export const PERMISSIVE_UNICODE_ART_FONT_LICENSES = [
  '0BSD',
  'MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  'CC0-1.0',
  'Unlicense'
] as const;

const PERMISSIVE_LICENSE_SET = new Set<string>(PERMISSIVE_UNICODE_ART_FONT_LICENSES);

//#endregion

//#region 🟦 公开解析与校验入口

/**
 * 🟢 解析 UAF JSON
 *
 * 🔹 仅接受完整 JSON 文档；文件读取由 CLI、Web、VS Code 或桌面宿主负责。
 * 🔹 解析成功后返回规范化副本，不保留未知字段。
 */
export function parseUnicodeArtFontJson(
  source: string,
  options: UnicodeArtFontParseOptions = {}
): UnicodeArtFont {
  const locale = normalizeLocale(options.locale);
  if (typeof source !== 'string') {
    throw artFontError('artFont.json.invalid', ErrorCode.ART_FONT_PARSE_FAILED, locale, {
      message: 'source must be a string'
    });
  }

  try {
    return validateUnicodeArtFont(JSON.parse(source), options);
  } catch (error) {
    if (error instanceof UnicodeArtError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw artFontError('artFont.json.invalid', ErrorCode.ART_FONT_PARSE_FAILED, locale, { message });
  }
}

/**
 * 🟢 校验并规范化 UAF 文档
 *
 * 🔹 未知字段一律拒绝；新增能力必须通过 `extensions` namespace 或新的 format version。
 * 🔹 图案行宽和 advance 使用 P3.1 的字素宽度计算器验证。
 */
export function validateUnicodeArtFont(
  input: unknown,
  options: UnicodeArtFontParseOptions = {}
): UnicodeArtFontV1 {
  const locale = normalizeLocale(options.locale);
  const document = expectRecord(input, locale, 'artFont.document.object');
  rejectUnknownFields(document, ['format', 'version', 'meta', 'metrics', 'glyphs', 'extensions'], 'document', locale);

  if (document.format !== UNICODE_ART_FONT_FORMAT) {
    throw artFontError('artFont.document.format', ErrorCode.ART_FONT_INVALID, locale, {
      format: String(document.format)
    });
  }
  if (document.version !== 1) {
    throw artFontError('artFont.document.version', ErrorCode.ART_FONT_INVALID, locale, {
      version: String(document.version)
    });
  }

  const meta = normalizeMetadata(document.meta, locale);
  const metrics = normalizeMetrics(document.metrics, locale);
  const calculator = createGlyphWidthCalculator({
    profile: metrics.glyphWidthProfile,
    wideCharRegex: metrics.wideCharRegex,
    locale
  });
  const glyphs = normalizeGlyphs(document.glyphs, metrics, calculator, locale);

  if (metrics.fallbackGlyph && !glyphs[metrics.fallbackGlyph]) {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path: 'metrics.fallbackGlyph',
      message: 'must reference an existing glyph'
    });
  }

  const normalized: UnicodeArtFontV1 = {
    format: UNICODE_ART_FONT_FORMAT,
    version: 1,
    meta,
    metrics,
    glyphs
  };

  if (document.extensions !== undefined) {
    normalized.extensions = normalizeExtensions(document.extensions, locale);
  }

  return normalized;
}

/**
 * 🟢 判断 SPDX expression 是否符合官方随包艺术字的宽松许可政策
 *
 * 🔹 该函数只判断项目政策，不判断一个外部资产是否真的拥有对应权利。
 * 🔹 `WITH` exception 不进入首轮官方资产白名单。
 */
export function isPermissiveUnicodeArtFontLicense(expression: string): boolean {
  if (!isSpdxExpressionSyntax(expression) || /\bWITH\b/.test(expression)) {
    return false;
  }

  const identifiers = tokenizeSpdxExpression(expression).filter((token) => !isSpdxOperator(token));
  return identifiers.length > 0 && identifiers.every((identifier) => PERMISSIVE_LICENSE_SET.has(identifier));
}

/** 判断一个字符串是否是受限的 SPDX expression 语法。 */
export function isSpdxExpressionSyntax(expression: string): boolean {
  if (typeof expression !== 'string' || expression.length === 0 || expression.length > 256) {
    return false;
  }
  if (/\b(?:NOASSERTION|NONE)\b/.test(expression)) {
    return false;
  }

  const tokens = tokenizeSpdxExpression(expression);
  if (tokens.length === 0 || tokens.join('') !== expression.replace(/\s+/g, '')) {
    return false;
  }

  let cursor = 0;
  const parsePrimary = (): boolean => {
    const token = tokens[cursor];
    if (token === '(') {
      cursor += 1;
      const parsed = parseOr();
      if (!parsed || tokens[cursor] !== ')') return false;
      cursor += 1;
      return true;
    }
    if (!token || isSpdxOperator(token) || !SPDX_IDENTIFIER_PATTERN.test(token)) return false;
    cursor += 1;
    return true;
  };
  const parseWith = (): boolean => {
    if (!parsePrimary()) return false;
    if (tokens[cursor] === 'WITH') {
      cursor += 1;
      const exception = tokens[cursor];
      if (!exception || isSpdxOperator(exception) || !SPDX_IDENTIFIER_PATTERN.test(exception)) return false;
      cursor += 1;
    }
    return true;
  };
  const parseAnd = (): boolean => {
    if (!parseWith()) return false;
    while (tokens[cursor] === 'AND') {
      cursor += 1;
      if (!parseWith()) return false;
    }
    return true;
  };
  const parseOr = (): boolean => {
    if (!parseAnd()) return false;
    while (tokens[cursor] === 'OR') {
      cursor += 1;
      if (!parseAnd()) return false;
    }
    return true;
  };

  return parseOr() && cursor === tokens.length;
}

//#endregion

//#region 🟦 规范化实现

function normalizeMetadata(input: unknown, locale: SupportedLocale): UnicodeArtFontMetadata {
  const meta = expectRecord(input, locale, 'artFont.field.required', { path: 'meta' });
  rejectUnknownFields(meta, ['id', 'name', 'authors', 'description', 'license', 'creation'], 'meta', locale);

  const id = expectString(meta.id, 'meta.id', locale, 3, 128);
  if (!ID_PATTERN.test(id) || !id.includes('.')) {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path: 'meta.id',
      message: 'must be a reverse-DNS style identifier'
    });
  }

  const name = expectString(meta.name, 'meta.name', locale, 1, 128);
  const authors = normalizeAuthors(meta.authors, locale);
  const license = normalizeLicense(meta.license, locale);
  const normalized: UnicodeArtFontMetadata = { id, name, authors, license };

  if (meta.description !== undefined) {
    normalized.description = expectString(meta.description, 'meta.description', locale, 1, 512);
  }
  if (meta.creation !== undefined) {
    normalized.creation = normalizeCreation(meta.creation, locale);
  }
  return normalized;
}

function normalizeAuthors(input: unknown, locale: SupportedLocale): string[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_AUTHORS) {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path: 'meta.authors',
      message: `must contain 1-${MAX_AUTHORS} authors`
    });
  }
  return input.map((author, index) => expectString(author, `meta.authors[${index}]`, locale, 1, 128));
}

function normalizeLicense(input: unknown, locale: SupportedLocale): UnicodeArtFontLicense {
  const license = expectRecord(input, locale, 'artFont.field.required', { path: 'meta.license' });
  rejectUnknownFields(license, ['expression', 'origin', 'sourceUrl', 'attribution'], 'meta.license', locale);

  const expression = expectString(license.expression, 'meta.license.expression', locale, 1, 256);
  if (!isSpdxExpressionSyntax(expression)) {
    throw artFontError('artFont.license.expression', ErrorCode.ART_FONT_LICENSE_INVALID, locale, { expression });
  }

  const origin = license.origin;
  if (origin !== 'original' && origin !== 'derived' && origin !== 'imported') {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_LICENSE_INVALID, locale, {
      path: 'meta.license.origin',
      message: String(origin)
    });
  }

  const normalized: UnicodeArtFontLicense = { expression, origin };
  if (license.sourceUrl !== undefined) {
    normalized.sourceUrl = normalizeHttpUrl(license.sourceUrl, 'meta.license.sourceUrl', locale);
  }
  if (license.attribution !== undefined) {
    normalized.attribution = expectString(license.attribution, 'meta.license.attribution', locale, 1, 1024);
  }
  if (origin !== 'original' && (!normalized.sourceUrl || !normalized.attribution)) {
    throw artFontError('artFont.license.provenance', ErrorCode.ART_FONT_LICENSE_INVALID, locale, { origin });
  }
  return normalized;
}

function normalizeCreation(input: unknown, locale: SupportedLocale): UnicodeArtFontCreation {
  const creation = expectRecord(input, locale, 'artFont.field.invalid', {
    path: 'meta.creation',
    message: 'must be an object'
  });
  rejectUnknownFields(creation, ['method', 'tool'], 'meta.creation', locale);
  if (creation.method !== 'human' && creation.method !== 'ai-assisted' && creation.method !== 'other') {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path: 'meta.creation.method',
      message: String(creation.method)
    });
  }
  const normalized: UnicodeArtFontCreation = { method: creation.method };
  if (creation.tool !== undefined) {
    normalized.tool = expectString(creation.tool, 'meta.creation.tool', locale, 1, 128);
  }
  return normalized;
}

function normalizeMetrics(input: unknown, locale: SupportedLocale): UnicodeArtFontMetrics {
  const metrics = expectRecord(input, locale, 'artFont.field.required', { path: 'metrics' });
  rejectUnknownFields(
    metrics,
    ['height', 'defaultAdvance', 'letterSpacing', 'direction', 'fallbackGlyph', 'glyphWidthProfile', 'wideCharRegex'],
    'metrics',
    locale
  );

  const height = expectInteger(metrics.height, 'metrics.height', locale, 1, MAX_GLYPH_HEIGHT);
  const defaultAdvance = expectInteger(metrics.defaultAdvance, 'metrics.defaultAdvance', locale, 1, MAX_ADVANCE);
  const letterSpacing = metrics.letterSpacing === undefined
    ? 0
    : expectInteger(metrics.letterSpacing, 'metrics.letterSpacing', locale, 0, MAX_ADVANCE);
  const direction = metrics.direction === undefined ? 'ltr' : metrics.direction;
  if (direction !== 'ltr' && direction !== 'rtl') {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path: 'metrics.direction',
      message: String(direction)
    });
  }

  const normalized: UnicodeArtFontMetrics = { height, defaultAdvance, letterSpacing, direction };
  if (metrics.fallbackGlyph !== undefined) {
    normalized.fallbackGlyph = expectUnicodeScalar(metrics.fallbackGlyph, 'metrics.fallbackGlyph', locale);
  }
  if (metrics.glyphWidthProfile !== undefined) {
    normalized.glyphWidthProfile = expectString(metrics.glyphWidthProfile, 'metrics.glyphWidthProfile', locale, 1, 128);
  }
  if (metrics.wideCharRegex !== undefined) {
    normalized.wideCharRegex = expectString(metrics.wideCharRegex, 'metrics.wideCharRegex', locale, 1, 512);
  }
  return normalized;
}

function normalizeGlyphs(
  input: unknown,
  metrics: UnicodeArtFontMetrics,
  calculator: ReturnType<typeof createGlyphWidthCalculator>,
  locale: SupportedLocale
): Record<string, UnicodeArtFontGlyph> {
  const glyphs = expectRecord(input, locale, 'artFont.field.required', { path: 'glyphs' });
  const entries = Object.entries(glyphs);
  if (entries.length === 0 || entries.length > MAX_FONT_GLYPHS) {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path: 'glyphs',
      message: `must contain 1-${MAX_FONT_GLYPHS} glyphs`
    });
  }

  const normalized: Record<string, UnicodeArtFontGlyph> = {};
  for (const [key, rawGlyph] of entries) {
    const glyphKey = expectUnicodeScalar(key, `glyphs.${key}`, locale);
    const glyph = expectRecord(rawGlyph, locale, 'artFont.field.invalid', {
      path: `glyphs.${glyphKey}`,
      message: 'must be an object'
    });
    rejectUnknownFields(glyph, ['lines', 'advance'], `glyphs.${glyphKey}`, locale);
    if (!Array.isArray(glyph.lines) || glyph.lines.length !== metrics.height) {
      throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
        path: `glyphs.${glyphKey}.lines`,
        message: `must contain exactly ${metrics.height} lines`
      });
    }

    const lines = glyph.lines.map((line, lineIndex) => normalizeGlyphLine(line, glyphKey, lineIndex, locale));
    const advance = glyph.advance === undefined
      ? metrics.defaultAdvance
      : expectInteger(glyph.advance, `glyphs.${glyphKey}.advance`, locale, 1, MAX_ADVANCE);
    const maxLineWidth = Math.max(...lines.map((line) => calculator.getTextWidth(line)));
    if (advance < maxLineWidth) {
      throw artFontError('artFont.glyph.advance', ErrorCode.ART_FONT_INVALID, locale, {
        glyph: glyphKey,
        advance,
        width: maxLineWidth
      });
    }

    normalized[glyphKey] = glyph.advance === undefined ? { lines } : { lines, advance };
  }
  return normalized;
}

function normalizeGlyphLine(input: unknown, glyph: string, line: number, locale: SupportedLocale): string {
  if (typeof input !== 'string') {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path: `glyphs.${glyph}.lines[${line}]`,
      message: 'must be a string'
    });
  }
  if (input.includes('\n') || input.includes('\r') || input.includes('\t')) {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path: `glyphs.${glyph}.lines[${line}]`,
      message: 'must not contain line breaks or tabs'
    });
  }
  if (Array.from(input).length > MAX_GLYPH_LINE_CODE_POINTS) {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path: `glyphs.${glyph}.lines[${line}]`,
      message: `must contain at most ${MAX_GLYPH_LINE_CODE_POINTS} Unicode scalars`
    });
  }
  if (input !== input.trimEnd()) {
    throw artFontError('artFont.glyph.trailingWhitespace', ErrorCode.ART_FONT_INVALID, locale, {
      glyph,
      line: line + 1
    });
  }
  return input;
}

function normalizeExtensions(input: unknown, locale: SupportedLocale): UnicodeArtFontExtensions {
  const extensions = expectRecord(input, locale, 'artFont.field.invalid', {
    path: 'extensions',
    message: 'must be an object'
  });
  const normalized: UnicodeArtFontExtensions = {};
  for (const [namespace, value] of Object.entries(extensions)) {
    if (!EXTENSION_NAMESPACE_PATTERN.test(namespace)) {
      throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
        path: 'extensions',
        message: `invalid namespace: ${namespace}`
      });
    }
    normalized[namespace] = expectRecord(value, locale, 'artFont.field.invalid', {
      path: `extensions.${namespace}`,
      message: 'must be an object'
    });
  }
  return normalized;
}

//#endregion

//#region 🟦 基础校验工具

function expectRecord(
  input: unknown,
  locale: SupportedLocale,
  key: ArtFontMessageKey,
  params: MessageParams = {}
): Record<string, unknown> {
  if (!isRecord(input)) {
    throw artFontError(key, ErrorCode.ART_FONT_INVALID, locale, params);
  }
  return input;
}

function rejectUnknownFields(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  locale: SupportedLocale
): void {
  const unknown = Object.keys(record).find((field) => !allowed.includes(field));
  if (unknown) {
    throw artFontError('artFont.document.unknownField', ErrorCode.ART_FONT_INVALID, locale, {
      path,
      field: unknown
    });
  }
}

function expectString(
  input: unknown,
  path: string,
  locale: SupportedLocale,
  minLength: number,
  maxLength: number
): string {
  if (typeof input !== 'string' || input.trim().length < minLength) {
    throw artFontError('artFont.field.required', ErrorCode.ART_FONT_INVALID, locale, { path });
  }
  const value = input.trim();
  if (value.length > maxLength) {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path,
      message: `must be at most ${maxLength} characters`
    });
  }
  return value;
}

function expectInteger(
  input: unknown,
  path: string,
  locale: SupportedLocale,
  min: number,
  max: number
): number {
  if (!Number.isInteger(input) || (input as number) < min || (input as number) > max) {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path,
      message: `must be an integer from ${min} to ${max}`
    });
  }
  return input as number;
}

function expectUnicodeScalar(input: unknown, path: string, locale: SupportedLocale): string {
  if (typeof input !== 'string' || Array.from(input).length !== 1) {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path,
      message: 'must be exactly one Unicode scalar'
    });
  }
  const codePoint = input.codePointAt(0);
  if (codePoint === undefined || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_INVALID, locale, {
      path,
      message: 'must not be a surrogate code point'
    });
  }
  return input;
}

function normalizeHttpUrl(input: unknown, path: string, locale: SupportedLocale): string {
  const value = expectString(input, path, locale, 1, 2048);
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('unsupported protocol');
    return url.toString();
  } catch {
    throw artFontError('artFont.field.invalid', ErrorCode.ART_FONT_LICENSE_INVALID, locale, {
      path,
      message: 'must be an HTTP(S) URL'
    });
  }
}

function tokenizeSpdxExpression(expression: string): string[] {
  return expression.match(/\(|\)|AND|OR|WITH|[A-Za-z0-9.+-]+/g) ?? [];
}

function isSpdxOperator(token: string): boolean {
  return token === 'AND' || token === 'OR' || token === 'WITH' || token === '(' || token === ')';
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

type ArtFontMessageKey = Extract<MessageKey, `artFont.${string}`>;

function artFontError(
  key: ArtFontMessageKey,
  code: ErrorCode,
  locale: SupportedLocale,
  params: MessageParams
): UnicodeArtError {
  return new UnicodeArtError(
    translateCoreMessage(key, params, locale),
    code,
    {
      details: params,
      messageKey: key,
      messageParams: params,
      locale
    }
  );
}

//#endregion
