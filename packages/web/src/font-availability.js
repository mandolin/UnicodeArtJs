/**
 * ============================================================================
 * 🟦 Web 字体可用性检测工具
 * ============================================================================
 *
 * 🔶 模块职责
 * 为工具站提供轻量字体栈解析和本机字体可用性提示。检测结果只用于提示，
 * 不作为生成流程的硬性门禁。
 *
 * @module font-availability
 * @since 0.1.0-alpha
 * ============================================================================
 */

//#region 🟩 字体栈解析

/** CSS 通用字体族；它们不能代表某个可安装字体。 */
export const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
]);

/**
 * 解析 CSS font-family 字符串。
 *
 * 中文说明：这里不尝试实现完整 CSS parser，只覆盖页面下拉框和用户常见输入：
 * 逗号分隔、单/双引号包裹、反斜杠转义。
 *
 * @param {string} fontFamily CSS font-family 字符串。
 * @returns {string[]} 字体族名称列表，已移除外围引号和多余空白。
 */
export function parseFontFamilyList(fontFamily) {
  const value = String(fontFamily || '');
  const families = [];
  let current = '';
  let quote = '';
  let escaping = false;

  for (const char of value) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = '';
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === ',') {
      pushFontFamily(families, current);
      current = '';
      continue;
    }

    current += char;
  }

  pushFontFamily(families, current);
  return families;
}

/** 判断是否为 CSS 通用字体族。 */
export function isGenericFontFamily(fontFamily) {
  return GENERIC_FONT_FAMILIES.has(String(fontFamily || '').trim().toLowerCase());
}

function pushFontFamily(families, value) {
  const normalized = value.trim();
  if (normalized) families.push(normalized);
}

//#endregion

//#region 🟩 可用性汇总

/**
 * 从字体栈中找出浏览器可确认的第一个具体字体。
 *
 * @param {string} fontFamily CSS font-family 字符串。
 * @param {(fontFamily: string) => boolean} checkFontAvailable 单字体可用性检查函数。
 * @returns {{ state: 'available'|'unavailable'|'generic'|'empty', primaryFont: string, availableFont: string, fallbackFont: string }}
 */
export function getFontAvailabilitySummary(fontFamily, checkFontAvailable) {
  const families = parseFontFamilyList(fontFamily);
  const concreteFonts = families.filter((font) => !isGenericFontFamily(font));
  const fallbackFont = families.find(isGenericFontFamily) || '';

  if (families.length === 0) {
    return { state: 'empty', primaryFont: '', availableFont: '', fallbackFont };
  }

  if (concreteFonts.length === 0) {
    return {
      state: 'generic',
      primaryFont: fallbackFont || families[0],
      availableFont: '',
      fallbackFont,
    };
  }

  const availableFont = concreteFonts.find((font) => checkFontAvailable(font)) || '';
  return {
    state: availableFont ? 'available' : 'unavailable',
    primaryFont: concreteFonts[0],
    availableFont,
    fallbackFont,
  };
}

/**
 * 创建基于 Canvas 量测的本机字体检测函数。
 *
 * 中文说明：浏览器没有稳定 API 能枚举全部本机字体；这里用目标字体与多个通用
 * fallback 的文本宽度差异做提示级判断。若隐私保护限制字体指纹，结果可能偏保守。
 *
 * @param {Document} documentRef 浏览器 document。
 * @returns {(fontFamily: string) => boolean} 单字体检测函数。
 */
export function createCanvasFontAvailabilityChecker(documentRef) {
  const canvas = documentRef?.createElement?.('canvas');
  const ctx = canvas?.getContext?.('2d');
  if (!ctx) return () => false;

  const sample = 'mmmmmmmmmmiiiiiiiiii汉字測試UnicodeArtJs';
  const fallbackFamilies = ['monospace', 'serif', 'sans-serif'];

  return (fontFamily) => {
    const target = quoteFontFamilyForCanvas(fontFamily);
    return fallbackFamilies.some((fallback) => {
      ctx.font = `72px ${fallback}`;
      const fallbackWidth = ctx.measureText(sample).width;
      ctx.font = `72px ${target}, ${fallback}`;
      const targetWidth = ctx.measureText(sample).width;
      return Math.abs(targetWidth - fallbackWidth) > 0.5;
    });
  };
}

function quoteFontFamilyForCanvas(fontFamily) {
  const name = String(fontFamily || '').trim();
  if (!name || isGenericFontFamily(name)) return name;
  return `"${name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

//#endregion
