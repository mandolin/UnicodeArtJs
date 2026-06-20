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

import { calculateDisplayWidth } from '../utils/wideCharDetector';

//#region Width helpers

export function getGlyphWidth(text: string): number {
  return calculateDisplayWidth(text);
}

export function repeatToWidth(glyph: string, width: number): string {
  if (width <= 0 || glyph.length === 0) {
    return '';
  }

  const glyphWidth = Math.max(1, getGlyphWidth(glyph));
  const count = Math.ceil(width / glyphWidth);
  const repeated = glyph.repeat(count);
  return cropToWidth(repeated, width);
}

export function padToWidth(text: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  const textWidth = getGlyphWidth(text);
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

export function cropToWidth(text: string, width: number): string {
  if (width <= 0) {
    return '';
  }

  let result = '';
  let used = 0;

  for (const glyph of text) {
    const glyphWidth = getGlyphWidth(glyph);
    if (used + glyphWidth > width) {
      break;
    }

    result += glyph;
    used += glyphWidth;
  }

  return used < width ? `${result}${' '.repeat(width - used)}` : result;
}

//#endregion
