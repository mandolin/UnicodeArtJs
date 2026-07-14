/**
 * ============================================================================
 * 🟦 Unicode 艺术字字体类型
 * ============================================================================
 *
 * 🔶 模块职责
 * 定义实验性 Unicode Art Font（UAF）v1 的平台无关数据模型。该模型描述
 * 艺术字资产本身，不等同于视觉字体或用于显示字符画的字素字体。
 *
 * 🔶 演进边界
 * - `format + version` 是解析与迁移的唯一依据。
 * - v1 只接受一个 Unicode 标量作为字形键，不隐式处理 grapheme cluster。
 * - kerning、smushing、双向排版与外部字体导入均后置。
 *
 * @module types/artFont
 * ============================================================================
 */

import type { GlyphWidthCalculator, GlyphWidthProfile } from '../glyph/width';

//#region 🟦 格式常量与基础类型

/** UAF v1 的固定文档格式标识。 */
export const UNICODE_ART_FONT_FORMAT = 'unicode-art-font' as const;

/** 当前 UAF 文档格式标识。 */
export type UnicodeArtFontFormat = typeof UNICODE_ART_FONT_FORMAT;

/** 当前支持的 UAF 文档版本。 */
export type UnicodeArtFontVersion = 1;

/** 艺术字书写方向。v1 只度量方向，不执行 RTL 重排。 */
export type UnicodeArtFontDirection = 'ltr' | 'rtl';

/** 字体字形来源类别。 */
export type UnicodeArtFontOrigin = 'original' | 'derived' | 'imported';

/** 创作方式说明。 */
export type UnicodeArtFontCreationMethod = 'human' | 'ai-assisted' | 'other';

//#endregion

//#region 🟦 元数据与许可证

/** 字体许可与来源记录。 */
export interface UnicodeArtFontLicense {
  /** SPDX license expression，例如 `MIT` 或 `MIT OR Apache-2.0`。 */
  expression: string;
  /** 字形的原创、派生或导入状态。 */
  origin: UnicodeArtFontOrigin;
  /** 派生或导入资产的原始来源链接。 */
  sourceUrl?: string;
  /** 派生或导入资产必须保留的归属文本。 */
  attribution?: string;
}

/** 可选的创作方式说明，不取代作者和许可记录。 */
export interface UnicodeArtFontCreation {
  /** 创作方式。 */
  method: UnicodeArtFontCreationMethod;
  /** 使用的工具或流程名称，例如 `manual-grid-editor`。 */
  tool?: string;
}

/** 字体可读元数据。 */
export interface UnicodeArtFontMetadata {
  /** 稳定、反向 DNS 风格的字体 ID，例如 `org.example.line-banner`。 */
  id: string;
  /** 面向用户的字体名。 */
  name: string;
  /** 作者或维护者列表。 */
  authors: string[];
  /** 可选的简短说明。 */
  description?: string;
  /** 许可证、来源与归属信息。 */
  license: UnicodeArtFontLicense;
  /** 可选的创作方式说明。 */
  creation?: UnicodeArtFontCreation;
}

//#endregion

//#region 🟦 字形与度量

/** 单个 Unicode 标量对应的多行艺术字字形。 */
export interface UnicodeArtFontGlyph {
  /** 恰好等于字体 `metrics.height` 的图案行；行尾空格在 v1 中不允许存储。 */
  lines: string[];
  /** 本字形前进的字素列数；缺省时使用 `metrics.defaultAdvance`。 */
  advance?: number;
}

/** 字体级布局和字素宽度规则。 */
export interface UnicodeArtFontMetrics {
  /** 每个字形的固定图案行数。 */
  height: number;
  /** 未声明字形 advance 时使用的列数。 */
  defaultAdvance: number;
  /** 相邻字形之间追加的列数。v1 只能为非负整数。 */
  letterSpacing?: number;
  /** 书写方向元数据；渲染重排后置。 */
  direction?: UnicodeArtFontDirection;
  /** 缺失字形时使用的单 Unicode 标量键；缺省则保留空白 advance。 */
  fallbackGlyph?: string;
  /** 用于校验图案行视觉宽度的 P3.1 字素宽度 profile。 */
  glyphWidthProfile?: GlyphWidthProfile;
  /** 覆盖 profile 的受限宽字素字符类。 */
  wideCharRegex?: string;
}

/** UAF 扩展字段；键必须是反向 DNS 风格 namespace。 */
export type UnicodeArtFontExtensions = Record<string, Record<string, unknown>>;

/** UAF v1 canonical 文档。 */
export interface UnicodeArtFontV1 {
  /** 固定为 `unicode-art-font`。 */
  format: UnicodeArtFontFormat;
  /** 固定为 `1`。 */
  version: UnicodeArtFontVersion;
  /** 字体元数据。 */
  meta: UnicodeArtFontMetadata;
  /** 字体级度量。 */
  metrics: UnicodeArtFontMetrics;
  /** 单 Unicode 标量到字形的映射。 */
  glyphs: Record<string, UnicodeArtFontGlyph>;
  /** 明确的第三方扩展命名空间。 */
  extensions?: UnicodeArtFontExtensions;
}

/** 当前支持的 Unicode 艺术字文档联合类型。 */
export type UnicodeArtFont = UnicodeArtFontV1;

//#endregion

//#region 🟦 解析、查找与度量 API

/** JSON 解析或结构校验选项。 */
export interface UnicodeArtFontParseOptions {
  /** 结构化错误消息的语言。 */
  locale?: string;
}

/** 艺术字字形查找结果。 */
export interface ResolvedUnicodeArtFontGlyph {
  /** 最终使用的字形键；没有可用字形时为 `undefined`。 */
  key?: string;
  /** 最终使用的字形；没有可用字形时为 `undefined`。 */
  glyph?: UnicodeArtFontGlyph;
  /** 输入字形是否不存在于字体内。 */
  missing: boolean;
  /** 是否改用 `fallbackGlyph`。 */
  usedFallback: boolean;
  /** 本次拼接占用的 advance。 */
  advance: number;
}

/** 单个输入文本行的度量结果。 */
export interface UnicodeArtFontLineMeasurement {
  /** 原始输入行。 */
  text: string;
  /** 该行输出占用的字素列数。 */
  cols: number;
  /** 该行输入的 Unicode 标量数量。 */
  glyphCount: number;
}

/** 文本在指定艺术字下的确定性度量。 */
export interface UnicodeArtFontTextMeasurement {
  /** 多行艺术字输出所占行数。 */
  rows: number;
  /** 所有输入行中的最大字素列数。 */
  cols: number;
  /** 每个输入行的列数和字形数量。 */
  lines: UnicodeArtFontLineMeasurement[];
  /** 文本中没有直接命中字形的键，按首次出现顺序去重。 */
  missingGlyphs: string[];
}

/** 艺术字度量时可覆盖的宽度计算器选项。 */
export interface UnicodeArtFontMeasureOptions {
  /** 由宿主传入的共享计算器；优先级最高。 */
  calculator?: GlyphWidthCalculator;
  /** 覆盖字体声明的字素宽度 profile。 */
  glyphWidthProfile?: GlyphWidthProfile;
  /** 覆盖字体声明的宽字素字符类。 */
  wideCharRegex?: string;
  /** 错误消息语言。 */
  locale?: string;
}

/**
 * 🟢 Unicode 艺术字渲染选项
 *
 * 🔹 与度量使用同一套字素宽度规则，确保渲染结果可直接交给 Box、表格和其它布局器。
 * 🔹 `rtl` 的正确重排算法尚未纳入 v1；声明 RTL 的字体会返回结构化错误，而不会被静默倒置。
 */
export interface UnicodeArtFontRenderOptions extends UnicodeArtFontMeasureOptions {}

/** Unicode 艺术字的已展开多行输出。 */
export interface UnicodeArtFontRenderResult extends UnicodeArtFontTextMeasurement {
  /** 未格式化的多行字符画内容，保留为了 advance 而存在的行尾空格。 */
  content: string;
  /** 与 `content` 一一对应的输出行，便于语义布局直接组合。 */
  outputLines: string[];
}

//#endregion
