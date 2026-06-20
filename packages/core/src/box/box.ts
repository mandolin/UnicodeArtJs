/**
 * ============================================================================
 * UnicodeArtJs box renderer
 * ============================================================================
 *
 * Renders an outer text box around unicode art content. This first box phase is
 * intentionally a pure post-processing step and does not affect image/text
 * sampling or matching.
 *
 * @module box/box
 * @since 1.0.0
 * ============================================================================
 */

import { normalizeSpacing, ZERO_SPACING } from './spacing';
import { isBoxStyleName, resolveBoxChars } from './styles';
import type {
  BoxAlign,
  BoxOptions,
  BoxOverflow,
  BoxShadowOptions,
  BoxStyleDefinition,
  BoxStyleName,
  BoxTitleOptions,
  BoxVerticalAlign,
  NormalizedBoxOptions,
  NormalizedBoxShadowOptions,
  NormalizedBoxTitleOptions
} from './types';
import { cropToWidth, getGlyphWidth, padToWidth, repeatToWidth } from './width';

//#region Public API

export function boxText(content: string, options: false | BoxOptions = {}): string {
  const normalized = normalizeBoxOptions(options);
  const lines = splitContentLines(content);

  if (!normalized.enabled) {
    return content;
  }

  if (normalized.renderStage !== 'post' || normalized.mode !== 'outer') {
    throw new Error('Layout box options require textToArt layout rendering');
  }

  const contentWidth = getContentWidth(lines);
  const requestedInnerWidth = normalized.width === 'auto'
    ? contentWidth
    : normalized.overflow === 'expand'
      ? Math.max(contentWidth, normalized.width)
      : normalized.width;
  const alignedInnerWidth = alignInnerWidthToFrame(requestedInnerWidth, normalized);
  const contentLines = prepareContentLines(lines, normalized, alignedInnerWidth);
  const paddedWidth = alignedInnerWidth + normalized.padding.left + normalized.padding.right;
  const bodyLines = buildBodyLines(contentLines, alignedInnerWidth, normalized);
  const topPadding = buildEmptyLines(normalized.padding.top, paddedWidth, normalized);
  const bottomPadding = buildEmptyLines(normalized.padding.bottom, paddedWidth, normalized);
  const framedLines = [
    buildTopBorder(paddedWidth, normalized),
    ...topPadding,
    ...bodyLines,
    ...bottomPadding,
    buildBottomBorder(paddedWidth, normalized)
  ];
  const withShadow = applyShadow(framedLines, normalized.shadow);
  const withMargin = applyMargin(withShadow, normalized.margin);

  return withMargin.join('\n');
}

export function previewBoxStyle(style: BoxOptions['style'], sample: string = 'Aa'): string {
  return boxText(sample, {
    style,
    padding: { left: 1, right: 1 }
  });
}

export function normalizeBoxOptions(options: false | BoxOptions = {}): NormalizedBoxOptions {
  if (options === false || options.enabled === false) {
    return {
      enabled: false,
      mode: 'outer',
      renderStage: 'post',
      chars: resolveBoxChars('single').chars,
      padding: ZERO_SPACING,
      margin: ZERO_SPACING,
      align: 'left',
      verticalAlign: 'top',
      width: 'auto',
      height: 'auto',
      overflow: 'expand',
      shadow: false
    };
  }

  assertSupportedPhase(options);

  const style = normalizeStyle(options.style);
  const resolved = resolveBoxChars(style);
  const mode = normalizeMode(options.mode);
  const renderStage = normalizeRenderStage(options.renderStage);

  if (renderStage === 'post' && mode !== 'outer') {
    throw new Error(`Unsupported box mode for post renderStage: ${mode}`);
  }

  return {
    enabled: options.enabled ?? true,
    mode,
    renderStage,
    styleName: resolved.styleName,
    chars: resolved.chars,
    padding: normalizeSpacing(options.padding, 0),
    margin: normalizeSpacing(options.margin, 0),
    align: normalizeAlign(options.align),
    verticalAlign: normalizeVerticalAlign(options.verticalAlign),
    width: normalizeWidth(options.width),
    height: normalizeHeight(options.height),
    overflow: normalizeOverflow(options.overflow),
    title: normalizeTitle(options.title),
    shadow: normalizeShadow(options.shadow)
  };
}

//#endregion

//#region Rendering helpers

function splitContentLines(content: string): string[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized.split('\n');
}

function getContentWidth(lines: string[]): number {
  return lines.reduce((max, line) => Math.max(max, getGlyphWidth(line)), 0);
}

function prepareContentLines(
  lines: string[],
  options: NormalizedBoxOptions,
  width: number = resolveContentWidth(lines, options)
): string[] {
  const widthAdjusted = adjustLineWidths(lines, width, options.overflow);
  return adjustLineHeight(widthAdjusted, width, options);
}

function resolveContentWidth(lines: string[], options: NormalizedBoxOptions): number {
  const contentWidth = getContentWidth(lines);
  if (options.width === 'auto') {
    return contentWidth;
  }

  return options.overflow === 'expand'
    ? Math.max(contentWidth, options.width)
    : options.width;
}

function alignInnerWidthToFrame(width: number, options: NormalizedBoxOptions): number {
  const horizontalWidth = Math.max(
    1,
    getGlyphWidth(options.chars.top),
    getGlyphWidth(options.chars.bottom)
  );
  const paddedWidth = width + options.padding.left + options.padding.right;
  const remainder = paddedWidth % horizontalWidth;

  return remainder === 0 ? width : width + horizontalWidth - remainder;
}

function adjustLineWidths(lines: string[], width: number, overflow: BoxOverflow): string[] {
  if (overflow === 'wrap') {
    return lines.flatMap((line) => wrapLineToWidth(line, width));
  }

  if (overflow === 'truncate') {
    return lines.map((line) => cropToWidth(line, width));
  }

  return lines;
}

function wrapLineToWidth(line: string, width: number): string[] {
  if (width <= 0) {
    return [line.length === 0 ? '' : cropToWidth(line, 0)];
  }

  if (line.length === 0) {
    return [''];
  }

  const result: string[] = [];
  let current = '';
  let currentWidth = 0;

  for (const glyph of line) {
    const glyphWidth = getGlyphWidth(glyph);
    if (currentWidth > 0 && currentWidth + glyphWidth > width) {
      result.push(padToWidth(current, width));
      current = '';
      currentWidth = 0;
    }

    if (glyphWidth > width) {
      result.push(cropToWidth(glyph, width));
      continue;
    }

    current += glyph;
    currentWidth += glyphWidth;
  }

  result.push(padToWidth(current, width));
  return result;
}

function adjustLineHeight(lines: string[], width: number, options: NormalizedBoxOptions): string[] {
  if (options.height === 'auto') {
    return lines;
  }

  const requestedHeight = options.overflow === 'expand'
    ? Math.max(lines.length, options.height)
    : options.height;
  const contentLines = options.overflow === 'truncate'
    ? lines.slice(0, requestedHeight)
    : lines;

  if (contentLines.length >= requestedHeight) {
    return contentLines;
  }

  const emptyCount = requestedHeight - contentLines.length;
  const before = getVerticalPaddingBefore(emptyCount, options.verticalAlign);
  const after = emptyCount - before;
  const emptyLine = ' '.repeat(width);

  return [
    ...Array.from({ length: before }, () => emptyLine),
    ...contentLines,
    ...Array.from({ length: after }, () => emptyLine)
  ];
}

function getVerticalPaddingBefore(extra: number, align: BoxVerticalAlign): number {
  if (align === 'bottom') {
    return extra;
  }

  if (align === 'middle') {
    return Math.floor(extra / 2);
  }

  return 0;
}

function buildBodyLines(lines: string[], innerWidth: number, options: NormalizedBoxOptions): string[] {
  return lines.map((line) => {
    const aligned = padToWidth(line, innerWidth, options.align);
    const padded = `${' '.repeat(options.padding.left)}${aligned}${' '.repeat(options.padding.right)}`;
    return wrapContentLine(padded, options);
  });
}

function buildEmptyLines(count: number, width: number, options: NormalizedBoxOptions): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(wrapContentLine(' '.repeat(width), options));
  }

  return result;
}

function wrapContentLine(line: string, options: NormalizedBoxOptions): string {
  return `${options.chars.left}${line}${options.chars.right}`;
}

function buildTopBorder(width: number, options: NormalizedBoxOptions): string {
  const body = options.title?.position === 'top'
    ? renderTitleBorder(width, options.title, options)
    : repeatToWidth(options.chars.top, width);

  return `${options.chars.topLeft}${body}${options.chars.topRight}`;
}

function buildBottomBorder(width: number, options: NormalizedBoxOptions): string {
  const body = options.title?.position === 'bottom'
    ? renderTitleBorder(width, options.title, options)
    : repeatToWidth(options.chars.bottom, width);

  return `${options.chars.bottomLeft}${body}${options.chars.bottomRight}`;
}

function renderTitleBorder(
  width: number,
  title: NormalizedBoxTitleOptions,
  options: NormalizedBoxOptions
): string {
  const titleText = title.text;
  const titleWidth = getGlyphWidth(titleText);
  const titleSpace = titleWidth + title.padding * 2;

  if (titleSpace > width) {
    return repeatToWidth(options.chars.top, width);
  }

  const extra = width - titleSpace;
  let left: number;
  let right: number;

  if (title.align === 'right') {
    left = extra;
    right = 0;
  } else if (title.align === 'center') {
    left = Math.floor(extra / 2);
    right = extra - left;
  } else {
    left = 0;
    right = extra;
  }

  return [
    repeatToWidth(options.chars.top, left),
    ' '.repeat(title.padding),
    titleText,
    ' '.repeat(title.padding),
    repeatToWidth(options.chars.top, right)
  ].join('');
}

function applyMargin(lines: string[], margin: NormalizedBoxOptions['margin']): string[] {
  const lineWidth = lines.reduce((max, line) => Math.max(max, getGlyphWidth(line)), 0);
  const horizontalPrefix = ' '.repeat(margin.left);
  const horizontalSuffix = ' '.repeat(margin.right);
  const topBottomLine = ' '.repeat(margin.left + lineWidth + margin.right);
  const result: string[] = [];

  for (let i = 0; i < margin.top; i++) {
    result.push(topBottomLine);
  }

  for (const line of lines) {
    result.push(`${horizontalPrefix}${line}${horizontalSuffix}`);
  }

  for (let i = 0; i < margin.bottom; i++) {
    result.push(topBottomLine);
  }

  return result;
}

function applyShadow(lines: string[], shadow: NormalizedBoxOptions['shadow']): string[] {
  if (!shadow || (shadow.offsetX === 0 && shadow.offsetY === 0)) {
    return lines;
  }

  const lineWidth = lines.reduce((max, line) => Math.max(max, getGlyphWidth(line)), 0);
  const rightShadow = shadow.char.repeat(shadow.offsetX);
  const result = lines.map((line) => `${padToWidth(line, lineWidth)}${rightShadow}`);

  for (let i = 0; i < shadow.offsetY; i++) {
    result.push(`${' '.repeat(shadow.offsetX)}${shadow.char.repeat(lineWidth)}`);
  }

  return result;
}

//#endregion

//#region Normalization helpers

function assertSupportedPhase(options: BoxOptions): void {
  if (
    (options.separators !== undefined || options.cell !== undefined) &&
    options.renderStage !== 'layout'
  ) {
    throw new Error('Box separators and cells are reserved for a later box phase');
  }
}

function normalizeMode(mode: BoxOptions['mode']): NormalizedBoxOptions['mode'] {
  if (mode === undefined) {
    return 'outer';
  }

  if (mode !== 'outer' && mode !== 'lines' && mode !== 'cells' && mode !== 'grid') {
    throw new Error(`Invalid box mode: ${mode}`);
  }

  return mode;
}

function normalizeRenderStage(stage: BoxOptions['renderStage']): NormalizedBoxOptions['renderStage'] {
  if (stage === undefined) {
    return 'post';
  }

  if (stage !== 'post' && stage !== 'layout') {
    throw new Error(`Invalid box renderStage: ${stage}`);
  }

  return stage;
}

function normalizeStyle(style: BoxOptions['style']): BoxStyleName | BoxStyleDefinition | undefined {
  if (style === undefined || typeof style !== 'string') {
    return style;
  }

  if (!isBoxStyleName(style)) {
    throw new Error(`Unknown box style: ${style}`);
  }

  return style;
}

function normalizeAlign(align: BoxAlign | undefined): BoxAlign {
  if (align === undefined) {
    return 'left';
  }

  if (align !== 'left' && align !== 'center' && align !== 'right') {
    throw new Error(`Invalid box align: ${align}`);
  }

  return align;
}

function normalizeVerticalAlign(align: BoxVerticalAlign | undefined): BoxVerticalAlign {
  if (align === undefined) {
    return 'top';
  }

  if (align !== 'top' && align !== 'middle' && align !== 'bottom') {
    throw new Error(`Invalid box verticalAlign: ${align}`);
  }

  return align;
}

function normalizeWidth(width: BoxOptions['width']): number | 'auto' {
  if (width === undefined || width === 'auto') {
    return 'auto';
  }

  if (!Number.isInteger(width) || width < 0) {
    throw new Error('Invalid box width: expected a non-negative integer or "auto"');
  }

  return width;
}

function normalizeHeight(height: BoxOptions['height']): number | 'auto' {
  if (height === undefined || height === 'auto') {
    return 'auto';
  }

  if (!Number.isInteger(height) || height < 0) {
    throw new Error('Invalid box height: expected a non-negative integer or "auto"');
  }

  return height;
}

function normalizeOverflow(overflow: BoxOverflow | undefined): BoxOverflow {
  if (overflow === undefined) {
    return 'expand';
  }

  if (overflow !== 'expand' && overflow !== 'truncate' && overflow !== 'wrap') {
    throw new Error(`Invalid box overflow: ${overflow}`);
  }

  return overflow;
}

function normalizeTitle(title: BoxOptions['title']): NormalizedBoxTitleOptions | undefined {
  if (title === undefined) {
    return undefined;
  }

  const options = typeof title === 'string' ? { text: title } : title;
  if (options.text.length === 0) {
    return undefined;
  }

  return {
    text: options.text,
    align: normalizeAlign(options.align),
    position: normalizeTitlePosition(options.position),
    padding: normalizeTitlePadding(options)
  };
}

function normalizeTitlePosition(position: BoxTitleOptions['position'] | undefined): 'top' | 'bottom' {
  if (position === undefined) {
    return 'top';
  }

  if (position !== 'top' && position !== 'bottom') {
    throw new Error(`Invalid box title position: ${position}`);
  }

  return position;
}

function normalizeTitlePadding(title: string | BoxTitleOptions): number {
  if (typeof title === 'string' || title.padding === undefined) {
    return 1;
  }

  if (!Number.isInteger(title.padding) || title.padding < 0) {
    throw new Error('Invalid box title padding: expected a non-negative integer');
  }

  return title.padding;
}

function normalizeShadow(shadow: BoxOptions['shadow']): false | NormalizedBoxShadowOptions {
  if (shadow === undefined || shadow === false) {
    return false;
  }

  const options: BoxShadowOptions = shadow === true ? {} : shadow;
  const style = normalizeShadowStyle(options.style);
  const offsetX = normalizeShadowOffset(options.offsetX, 2, 'offsetX');
  const offsetY = normalizeShadowOffset(options.offsetY, 1, 'offsetY');

  return {
    style,
    offsetX,
    offsetY,
    char: getShadowChar(style)
  };
}

function normalizeShadowStyle(style: BoxShadowOptions['style'] | undefined): NormalizedBoxShadowOptions['style'] {
  if (style === undefined) {
    return 'light';
  }

  if (style !== 'light' && style !== 'heavy' && style !== 'block') {
    throw new Error(`Invalid box shadow style: ${style}`);
  }

  return style;
}

function normalizeShadowOffset(value: number | undefined, fallback: number, name: string): number {
  const candidate = value ?? fallback;
  if (!Number.isInteger(candidate) || candidate < 0) {
    throw new Error(`Invalid box shadow ${name}: expected a non-negative integer`);
  }

  return candidate;
}

function getShadowChar(style: NormalizedBoxShadowOptions['style']): string {
  if (style === 'heavy') {
    return '▓';
  }

  if (style === 'block') {
    return '█';
  }

  return '░';
}

//#endregion
