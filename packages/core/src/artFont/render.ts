/**
 * ============================================================================
 * 🟦 Unicode 艺术字字体渲染器
 * ============================================================================
 *
 * 🔶 模块职责
 * 将已校验的 UAF 字体和输入文本展开成确定性的多行字素内容。该层只处理
 * 字形拼接、advance、字距、换行和缺字回退；Box、表格、ANSI/HTML 格式化由
 * 上层组合器负责。
 *
 * 🔶 设计边界
 * - 调用方可传入共享 GlyphWidthCalculator，以和 semantic / Box 共用列单位。
 * - v1 不对 RTL、kerning、smushing 或 grapheme cluster 做猜测性处理。
 * - 行尾空格为 glyph advance 的组成部分，不能在此层提前裁剪。
 *
 * @module artFont/render
 * ============================================================================
 */

import { padToWidth } from '../box/width';
import { createGlyphWidthCalculator, type GlyphWidthCalculator } from '../glyph/width';
import { normalizeLocale, t as translateCoreMessage, type SupportedLocale } from '../i18n';
import { ErrorCode, UnicodeArtError } from '../types/output';
import type {
  UnicodeArtFont,
  UnicodeArtFontRenderOptions,
  UnicodeArtFontRenderResult
} from '../types/artFont';
import { validateUnicodeArtFont } from './document';
import { measureUnicodeArtFontText, resolveUnicodeArtFontGlyph } from './metrics';

//#region 🟦 公共渲染入口

/**
 * 🟢 将 UAF 字体文本展开为多行 Unicode 艺术字。
 *
 * @param input - 已解析字体或待校验的 UAF JSON 对象。
 * @param text - 待拼接的普通文本；换行会生成独立的艺术字行。
 * @param options - 宽度 profile、共享计算器与语言选项。
 * @returns 保留字形 advance 的多行输出与对应度量信息。
 */
export function renderUnicodeArtFontText(
  input: UnicodeArtFont | unknown,
  text: string,
  options: UnicodeArtFontRenderOptions = {}
): UnicodeArtFontRenderResult {
  const locale = normalizeLocale(options.locale);
  const font = validateUnicodeArtFont(input, { locale });
  const direction = font.metrics.direction ?? 'ltr';
  if (direction !== 'ltr') {
    throw artFontRenderError('artFont.render.direction', locale, { direction });
  }

  const calculator = options.calculator ?? createGlyphWidthCalculator({
    profile: options.glyphWidthProfile ?? font.metrics.glyphWidthProfile,
    wideCharRegex: options.wideCharRegex ?? font.metrics.wideCharRegex,
    locale
  });
  const measurement = measureUnicodeArtFontText(font, text, { ...options, calculator, locale });
  const outputLines = text
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .flatMap((line) => renderInputLine(font, line, calculator));

  return {
    ...measurement,
    content: outputLines.join('\n'),
    outputLines
  };
}

//#endregion

//#region 🟦 字形拼接

/** 渲染一行输入文本对应的固定高度字形矩阵。 */
function renderInputLine(
  font: UnicodeArtFont,
  inputLine: string,
  calculator: GlyphWidthCalculator
): string[] {
  const outputLines = Array.from({ length: font.metrics.height }, () => '');
  const glyphKeys = Array.from(inputLine);
  const letterSpacing = font.metrics.letterSpacing ?? 0;

  glyphKeys.forEach((glyphKey, glyphIndex) => {
    const resolved = resolveUnicodeArtFontGlyph(font, glyphKey);
    const glyphLines = resolved.glyph?.lines ?? Array.from({ length: font.metrics.height }, () => '');
    const visualWidth = Math.max(0, ...glyphLines.map((line) => calculator.getTextWidth(line)));
    const advance = Math.max(resolved.advance, visualWidth);

    for (let row = 0; row < font.metrics.height; row++) {
      outputLines[row] += padToWidth(glyphLines[row] ?? '', advance, 'left', calculator);
      if (glyphIndex < glyphKeys.length - 1 && letterSpacing > 0) {
        outputLines[row] += ' '.repeat(letterSpacing);
      }
    }
  });

  return outputLines;
}

//#endregion

//#region 🟦 错误工具

/** 构造艺术字渲染阶段的可本地化结构化错误。 */
function artFontRenderError(
  key: 'artFont.render.direction',
  locale: SupportedLocale,
  params: Record<string, string | number>
): UnicodeArtError {
  return new UnicodeArtError(
    translateCoreMessage(key, params, locale),
    ErrorCode.ART_FONT_RENDER_FAILED,
    { details: params, messageKey: key, messageParams: params, locale }
  );
}

//#endregion
