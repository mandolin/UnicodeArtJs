/**
 * ============================================================================
 * 🟦 Unicode 艺术字字体度量工具
 * ============================================================================
 *
 * 🔶 模块职责
 * 为 P3.2 提供字形查找与确定性列宽度量。这里不生成最终多行画面，避免
 * 提前把 P3.3 的组合/渲染职责耦合进字体格式层。
 * ==========================================================================
 */

import { createGlyphWidthCalculator } from '../glyph/width';
import {
  type ResolvedUnicodeArtFontGlyph,
  type UnicodeArtFont,
  type UnicodeArtFontMeasureOptions,
  type UnicodeArtFontTextMeasurement
} from '../types/artFont';

//#region 🟦 字形查找

/**
 * 🟢 解析一个输入字素对应的艺术字字形
 *
 * 🔹 未命中时优先使用字体声明的 fallback；没有 fallback 时保留空白 advance。
 * 🔹 调用方可利用 `missing` 区分直接命中和回退命中。
 */
export function resolveUnicodeArtFontGlyph(
  font: UnicodeArtFont,
  glyphKey: string
): ResolvedUnicodeArtFontGlyph {
  const direct = font.glyphs[glyphKey];
  if (direct) {
    return {
      key: glyphKey,
      glyph: direct,
      missing: false,
      usedFallback: false,
      advance: direct.advance ?? font.metrics.defaultAdvance
    };
  }

  const fallbackKey = font.metrics.fallbackGlyph;
  const fallback = fallbackKey ? font.glyphs[fallbackKey] : undefined;
  if (fallback && fallbackKey) {
    return {
      key: fallbackKey,
      glyph: fallback,
      missing: true,
      usedFallback: true,
      advance: fallback.advance ?? font.metrics.defaultAdvance
    };
  }

  return {
    missing: true,
    usedFallback: false,
    advance: font.metrics.defaultAdvance
  };
}

//#endregion

//#region 🟦 文本度量

/**
 * 🟢 度量文本渲染为艺术字后占用的字素网格尺寸
 *
 * 🔹 使用和 Box / semantic layout 完全相同的字素宽度计算器。
 * 🔹 文本换行会生成独立艺术字行；实际多行拼接由 P3.3 渲染引擎负责。
 */
export function measureUnicodeArtFontText(
  font: UnicodeArtFont,
  text: string,
  options: UnicodeArtFontMeasureOptions = {}
): UnicodeArtFontTextMeasurement {
  const calculator = options.calculator ?? createGlyphWidthCalculator({
    profile: options.glyphWidthProfile ?? font.metrics.glyphWidthProfile,
    wideCharRegex: options.wideCharRegex ?? font.metrics.wideCharRegex,
    locale: options.locale
  });
  const inputLines = text.replace(/\r\n?/g, '\n').split('\n');
  const missingGlyphs: string[] = [];
  const missingSet = new Set<string>();
  const lines = inputLines.map((inputLine) => {
    const glyphs = Array.from(inputLine);
    let cols = 0;
    glyphs.forEach((glyphKey, index) => {
      const resolved = resolveUnicodeArtFontGlyph(font, glyphKey);
      // 宿主覆盖宽度 profile 时，图案视觉宽度可能大于字体原始 advance。
      const visualWidth = resolved.glyph
        ? Math.max(0, ...resolved.glyph.lines.map((line) => calculator.getTextWidth(line)))
        : 0;
      cols += Math.max(resolved.advance, visualWidth);
      if (index > 0) cols += font.metrics.letterSpacing ?? 0;
      if (resolved.missing && !missingSet.has(glyphKey)) {
        missingSet.add(glyphKey);
        missingGlyphs.push(glyphKey);
      }
    });
    return { text: inputLine, cols, glyphCount: glyphs.length };
  });

  return {
    rows: lines.length * font.metrics.height,
    cols: Math.max(0, ...lines.map((line) => line.cols)),
    lines,
    missingGlyphs
  };
}

/** 获取字形图案的最大视觉宽度，用于编辑器与 future renderer 预检。 */
export function getUnicodeArtFontGlyphDisplayWidth(
  font: UnicodeArtFont,
  glyphKey: string,
  options: UnicodeArtFontMeasureOptions = {}
): number {
  const resolved = resolveUnicodeArtFontGlyph(font, glyphKey);
  if (!resolved.glyph) return 0;
  const calculator = options.calculator ?? createGlyphWidthCalculator({
    profile: options.glyphWidthProfile ?? font.metrics.glyphWidthProfile,
    wideCharRegex: options.wideCharRegex ?? font.metrics.wideCharRegex,
    locale: options.locale
  });
  return Math.max(...resolved.glyph.lines.map((line) => calculator.getTextWidth(line)));
}

//#endregion
