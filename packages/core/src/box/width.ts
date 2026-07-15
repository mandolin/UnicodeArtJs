/**
 * ============================================================================
 * Box glyph width helpers
 * ============================================================================
 *
 * Width is computed under the project's glyph-cell assumption: ASCII glyphs
 * occupy one cell, and reference-wide glyphs occupy two cells. Non monospaced
 * output fonts are intentionally out of scope for the first box phases.
 *
 * @module box/width
 * @since 1.0.0
 * ============================================================================
 */

import { createGlyphWidthCalculator, type GlyphWidthCalculator } from '../glyph/width';

const DEFAULT_GLYPH_WIDTH_CALCULATOR = createGlyphWidthCalculator();

//#region Width helpers

/**
 * 🟢 计算文本的字素显示宽度
 *
 * 🔹 使用指定字素宽度计算器统计文本占用的字符画列数。
 *
 * @param text - 待测量文本。
 * @param calculator - 字素宽度计算器，未传入时使用默认混合等宽规则。
 * @returns 文本显示宽度，单位为字符画列。
 */
export function getGlyphWidth(text: string, calculator: GlyphWidthCalculator = DEFAULT_GLYPH_WIDTH_CALCULATOR): number {
  return calculator.getTextWidth(text);
}

/**
 * 🟢 重复字素直到达到目标宽度
 *
 * 🔹 常用于绘制横向边框，并会按字素宽度裁剪到精确列数。
 *
 * @param glyph - 用于重复的边框字素。
 * @param width - 目标显示宽度。
 * @param calculator - 字素宽度计算器。
 * @returns 精确占用目标宽度的字符串。
 */
export function repeatToWidth(
  glyph: string,
  width: number,
  calculator: GlyphWidthCalculator = DEFAULT_GLYPH_WIDTH_CALCULATOR
): string {
  if (width <= 0 || glyph.length === 0) {
    return '';
  }

  const glyphWidth = Math.max(1, getGlyphWidth(glyph, calculator));
  const count = Math.ceil(width / glyphWidth);
  const repeated = glyph.repeat(count);
  return cropToWidth(repeated, width, calculator);
}

/**
 * 🟢 按目标宽度填充文本
 *
 * 🔹 在左、右或两侧补空格，使文本达到指定字符画列宽。
 *
 * @param text - 待填充文本。
 * @param width - 目标显示宽度。
 * @param align - 对齐方式。
 * @param calculator - 字素宽度计算器。
 * @returns 填充后的字符串。
 */
export function padToWidth(
  text: string,
  width: number,
  align: 'left' | 'center' | 'right' = 'left',
  calculator: GlyphWidthCalculator = DEFAULT_GLYPH_WIDTH_CALCULATOR
): string {
  const textWidth = getGlyphWidth(text, calculator);
  if (textWidth >= width) {
    return text;
  }

  const extra = width - textWidth;
  if (align === 'right') {
    return `${' '.repeat(extra)}${text}`;
  }

  if (align === 'center') {
    const left = Math.floor(extra / 2);
    const right = extra - left;
    return `${' '.repeat(left)}${text}${' '.repeat(right)}`;
  }

  return `${text}${' '.repeat(extra)}`;
}

/**
 * 🟢 按目标宽度裁剪文本
 *
 * 🔹 不会截断单个宽字素；若裁剪后不足目标宽度，会用空格补齐。
 *
 * @param text - 待裁剪文本。
 * @param width - 目标显示宽度。
 * @param calculator - 字素宽度计算器。
 * @returns 裁剪并补齐后的字符串。
 */
export function cropToWidth(
  text: string,
  width: number,
  calculator: GlyphWidthCalculator = DEFAULT_GLYPH_WIDTH_CALCULATOR
): string {
  if (width <= 0) {
    return '';
  }

  let result = '';
  let used = 0;

  for (const glyph of text) {
    const glyphWidth = getGlyphWidth(glyph, calculator);
    if (used + glyphWidth > width) {
      break;
    }

    result += glyph;
    used += glyphWidth;
  }

  return used < width ? `${result}${' '.repeat(width - used)}` : result;
}

//#endregion
