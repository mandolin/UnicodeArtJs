/**
 * ============================================================================
 * 🟦 字素宽度计算器
 * ============================================================================
 *
 * 🔶 模块职责
 * 为裱框、语义布局、导出尺寸和宿主预览提供唯一的字素显示宽度事实来源。
 * 当前按严格混合等宽字体的 1/2 单元假设工作，不尝试修复非等宽字体的实际排版。
 *
 * 🔶 兼容策略
 * - `default` 保持历史 Unicode 参考宽度规则，避免改变既有默认输出。
 * - 已知字素字体 profile 仍标记为 experimental，可由用户用自定义规则覆盖。
 * - 自定义规则是完整的“宽字素集合”，而不是对默认规则的增量补丁。
 * ============================================================================
 */

import { normalizeLocale, t as translateCoreMessage, type SupportedLocale } from '../i18n';
import { ErrorCode, UnicodeArtError } from '../types/output';
import { isWideChar } from '../utils/wideCharDetector';

//#region 🟦 公共类型与 profile 目录

/** 内置字素宽度 profile 标识。 */
export const BUILT_IN_GLYPH_WIDTH_PROFILES = [
  'default',
  'reference',
  'nsimsun',
  'sarasa-mono-sc',
  'lxgw-wenkai-mono'
] as const;

/** 内置 profile 的联合类型。 */
export type BuiltInGlyphWidthProfile = (typeof BUILT_IN_GLYPH_WIDTH_PROFILES)[number];

/** 允许宿主传递 profile 名称；未知名称会在运行时被显式拒绝。 */
export type GlyphWidthProfile = string;

/** 创建字素宽度计算器时可使用的配置。 */
export interface GlyphWidthCalculatorOptions {
  /** 内置字素字体宽度 profile，缺省时保持 `default`。 */
  profile?: GlyphWidthProfile;
  /** 完整宽字素集合的字符类正则源；定义时优先于 profile。 */
  wideCharRegex?: string;
  /** 错误文本使用的 Core locale。 */
  locale?: string;
}

/** 供 UI、CLI 和文档展示的 profile 元数据。 */
export interface GlyphWidthProfileDefinition {
  id: BuiltInGlyphWidthProfile;
  label: string;
  description: string;
  experimental: boolean;
}

const PROFILE_DEFINITIONS: readonly GlyphWidthProfileDefinition[] = [
  {
    id: 'default',
    label: 'Unicode 参考宽度',
    description: '保持既有 East Asian Width 参考规则。',
    experimental: false
  },
  {
    id: 'reference',
    label: 'Unicode 参考宽度',
    description: '`default` 的显式别名，适合配置文件可读性。',
    experimental: false
  },
  {
    id: 'nsimsun',
    label: '新宋体',
    description: '以 Unicode 参考宽度为基线的新宋体 profile。',
    experimental: true
  },
  {
    id: 'sarasa-mono-sc',
    label: '等距更纱黑体 SC',
    description: '将 Box Drawing 字符按单单元处理的混合等宽 profile。',
    experimental: true
  },
  {
    id: 'lxgw-wenkai-mono',
    label: '霞鹜文楷等宽',
    description: '将 Box Drawing 字符按单单元处理的混合等宽 profile。',
    experimental: true
  }
];

//#endregion

//#region 🟦 计算器实现

/**
 * 🟢 字素宽度计算器
 *
 * 🔹 缓存单个 Unicode code point 的宽度，避免布局阶段重复执行正则和范围判断。
 * 🔹 当前输入以 `for...of` 迭代，覆盖 Unicode code point；复杂 emoji cluster 仍属于后续能力。
 */
export class GlyphWidthCalculator {
  private readonly cache = new Map<string, 1 | 2>();
  private readonly customWideGlyphPattern?: RegExp;

  /** 实际生效的内置 profile。自定义正则生效时仍保留该回退值。 */
  public readonly profile: BuiltInGlyphWidthProfile;

  /** 经规范化后实际生效的用户规则。 */
  public readonly wideCharRegex?: string;

  /**
   * 直接构造时应优先先通过 `createGlyphWidthCalculator` 校验外部输入。
   * 此构造器保持公开，避免导出的类在 TypeScript 声明中不可实例化。
   */
  constructor(profile: BuiltInGlyphWidthProfile, wideCharRegex?: string) {
    this.profile = profile;
    this.wideCharRegex = wideCharRegex;
    this.customWideGlyphPattern = wideCharRegex
      ? new RegExp(`^(?:${wideCharRegex})$`, 'u')
      : undefined;
  }

  /** 计算一个字素的显示宽度。 */
  getGlyphWidth(glyph: string): 1 | 2 {
    if (glyph.length === 0) {
      return 1;
    }

    const cached = this.cache.get(glyph);
    if (cached !== undefined) {
      return cached;
    }

    const width: 1 | 2 = this.isWideGlyph(glyph) ? 2 : 1;
    this.cache.set(glyph, width);
    return width;
  }

  /** 计算一段字素文本的显示宽度。 */
  getTextWidth(text: string): number {
    let width = 0;
    for (const glyph of text) {
      width += this.getGlyphWidth(glyph);
    }
    return width;
  }

  /** 清空单字素缓存，通常只在长期运行宿主的诊断场景使用。 */
  clearCache(): void {
    this.cache.clear();
  }

  /** 返回当前缓存条目数，供宿主调试和性能观测使用。 */
  getCacheSize(): number {
    return this.cache.size;
  }

  private isWideGlyph(glyph: string): boolean {
    if (this.customWideGlyphPattern) {
      return this.customWideGlyphPattern.test(glyph);
    }

    if (!isWideChar(glyph)) {
      return false;
    }

    if (this.profile === 'sarasa-mono-sc' || this.profile === 'lxgw-wenkai-mono') {
      const codePoint = glyph.codePointAt(0);
      return codePoint === undefined || codePoint < 0x2500 || codePoint > 0x257F;
    }

    return true;
  }
}

/** 创建并校验一个可复用的字素宽度计算器。 */
export function createGlyphWidthCalculator(options: GlyphWidthCalculatorOptions = {}): GlyphWidthCalculator {
  const locale = normalizeLocale(options.locale);
  const profile = normalizeGlyphWidthProfile(options.profile, locale);
  const wideCharRegex = normalizeWideCharRegex(options.wideCharRegex, locale);
  return new GlyphWidthCalculator(profile, wideCharRegex);
}

/** 返回内置 profile 的元数据副本。 */
export function getGlyphWidthProfiles(): GlyphWidthProfileDefinition[] {
  return PROFILE_DEFINITIONS.map((definition) => ({ ...definition }));
}

/** 判断一个 profile 名称是否可由当前 Core 识别。 */
export function isKnownGlyphWidthProfile(profile: string | undefined): profile is BuiltInGlyphWidthProfile {
  return profile !== undefined && (BUILT_IN_GLYPH_WIDTH_PROFILES as readonly string[]).includes(profile);
}

/**
 * 规范化 profile。未知 profile 不静默回退，避免用户误以为布局已按指定字体计算。
 */
export function normalizeGlyphWidthProfile(
  profile: GlyphWidthProfile | undefined,
  locale: SupportedLocale = 'zh-CN'
): BuiltInGlyphWidthProfile {
  const normalized = (profile || 'default').trim();
  if (isKnownGlyphWidthProfile(normalized)) {
    return normalized;
  }

  throw new UnicodeArtError(
    translateCoreMessage('glyph.profile.unsupported', { profile: normalized }, locale),
    ErrorCode.GLYPH_WIDTH_PROFILE_INVALID,
    {
      details: { profile: normalized, supported: BUILT_IN_GLYPH_WIDTH_PROFILES },
      messageKey: 'glyph.profile.unsupported',
      messageParams: { profile: normalized },
      locale
    }
  );
}

/**
 * 规范化用户宽字素字符类。
 *
 * 只接受单个 Unicode 字符类，例如 `[\\u4e00-\\u9fff]`。这避免将任意高复杂度正则放入
 * 字素布局热路径，也让 CLI / JSON / Web 的行为保持一致。
 */
export function normalizeWideCharRegex(
  source: string | undefined,
  locale: SupportedLocale = 'zh-CN'
): string | undefined {
  const normalized = source?.trim();
  if (!normalized) {
    return undefined;
  }

  const isSingleCharacterClass = /^\[(?:\\.|[^\]\\])+\]$/u.test(normalized);
  if (!isSingleCharacterClass || normalized.length > 512) {
    throw invalidWideCharRegex(normalized, locale);
  }

  try {
    void new RegExp(`^(?:${normalized})$`, 'u');
    return normalized;
  } catch {
    throw invalidWideCharRegex(normalized, locale);
  }
}

function invalidWideCharRegex(source: string, locale: SupportedLocale): UnicodeArtError {
  return new UnicodeArtError(
    translateCoreMessage('glyph.regex.invalid', { source }, locale),
    ErrorCode.GLYPH_WIDTH_REGEX_INVALID,
    {
      details: { source, rule: 'single-unicode-character-class', maxLength: 512 },
      messageKey: 'glyph.regex.invalid',
      messageParams: { source },
      locale
    }
  );
}

//#endregion
