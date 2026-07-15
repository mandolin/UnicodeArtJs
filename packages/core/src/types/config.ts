/**
 * ============================================================================
 * 🟦 配置选项类型定义模块
 * ============================================================================
 * 
 * 🔶 模块职责
 * 定义字符画生成的所有配置选项，包括：
 * - 尺寸配置（height, width）
 * - 采样配置（matrixSize, ratio, interpolation）
 * - 字符集配置（charset）
 * - 字体配置（font, fontStyle, fontReduce）
 * - 文本布局配置（textAlign, lineSpacing, heightMode）
 * - 输出配置（invert, trimTrailingSpaces）
 * - 性能配置（enableEarlyTermination, maxParallelTasks）
 * 
 * 🔶 设计原则
 * - 所有配置项都有合理的默认值
 * - 支持部分配置覆盖（使用Partial<T>）
 * - 明确的参数验证规则
 * 
 * 🔶 关键参数说明
 * - ratio: 垂直水平比例，大多数字体高度≈2×宽度
 * - matrixSize: 采样矩阵大小，平衡质量和速度（默认6）
 * - enableEarlyTermination: 早期终止优化，大幅提升SAD匹配速度
 * 
 * @module types/config
 * @since 0.1.0
 * ============================================================================
 */

//#region 🟦 枚举类型定义

import type { CharsetConfig } from './charset';
import { PresetCharset } from './charset';
import { OutputFormat } from './output';
import type { BoxOptions } from '../box/types';
import { normalizeLocale, type SupportedLocale } from '../i18n';

/**
 * Image interpolation modes used while resizing sampling blocks.
 *
 * 图像缩放时使用的插值算法。不同算法在速度和质量之间有不同权衡。
 * 
 * @example
 * ```typescript
 * const config: ArtConfig = {
 *   interpolation: Interpolation.BICUBIC // 高质量
 * };
 * ```
 * 
 * @remarks
 * - NEAREST: 最快，质量最低（锯齿明显）
 * - BILINEAR: 速度快，质量中等
 * - BICUBIC: 速度中等，质量高（推荐）
 * - LANCZOS: 速度最慢，质量最高
 * 
 * **Performance / 性能：**速度从快到慢依次为 NEAREST、BILINEAR、BICUBIC、
 * LANCZOS；质量趋势相反。默认 BICUBIC 是速度与质量的平衡点。
 */
export enum Interpolation {
  /** 最近邻插值（最快，质量最低） */
  NEAREST = 'nearest',
  
  /** 双线性插值（速度快，质量中等） */
  BILINEAR = 'bilinear',
  
  /** 双三次插值（速度中等，质量高，推荐） */
  BICUBIC = 'bicubic',
  
  /** Lanczos插值（速度最慢，质量最高） */
  LANCZOS = 'lanczos'
}

/**
 * Font style variants for visual-font rendering.
 *
 * 指定视觉字体渲染时使用的样式变体。
 * 
 * @example
 * ```typescript
 * const config: ArtConfig = {
 *   font: 'Noto Sans SC',
 *   fontStyle: FontStyle.BOLD
 * };
 * ```
 * 
 * @remarks
 * - 需要字体文件支持对应的样式
 * - 如不支持会自动回退到regular
 */
export enum FontStyle {
  /** 常规体 */
  REGULAR = 'regular',
  
  /** 粗体 */
  BOLD = 'bold',
  
  /** 斜体 */
  ITALIC = 'italic',
  
  /** 粗斜体 */
  BOLD_ITALIC = 'bold-italic'
}

//#endregion

//#region 🟦 统一配置模型类型

/**
 * Output target environment.
 *
 * 用于描述字符画最终展示或消费的位置。该字段当前不直接改变核心采样算法，主要供多端
 * 配置、导出、提示和后续环境差异处理使用。
 */
export type OutputTarget =
  | 'plain'
  | 'terminal'
  | 'web'
  | 'vscode'
  | 'electron'
  | 'html'
  | 'ansi';

/**
 * Visual-font configuration for text-banner rasterization.
 *
 * 视觉字体指输入文字渲染成中间图像时使用的字体。旧字段 `font` / `fontStyle` /
 * `fontReduce` 会继续保留，并映射到这里。
 */
export interface VisualFontConfig {
  /** 字体名称或字体文件路径。 */
  family?: string;
  /** 字体样式。 */
  style?: FontStyle;
  /** 统一视觉字体渲染内边距/字号收缩量。 */
  reduce?: number;
  /** 后续用于视觉字体顶部手动纠偏，当前仅作为配置契约保留。 */
  reduceTop?: number;
  /** 后续用于视觉字体右侧手动纠偏，当前仅作为配置契约保留。 */
  reduceRight?: number;
  /** 后续用于视觉字体底部手动纠偏，当前仅作为配置契约保留。 */
  reduceBottom?: number;
  /** 后续用于视觉字体左侧手动纠偏，当前仅作为配置契约保留。 */
  reduceLeft?: number;
}

/**
 * Glyph-font configuration for rendered Unicode art.
 *
 * 字素字体指字符画生成后，输出字素在终端、Web、VS Code、桌面应用中实际显示的字体。
 * `widthProfile` / `wideCharRegex` 会参与裱框、语义布局和输出列数计算。profile 仍为
 * experimental；`wideCharRegex` 是完整宽字素集合，优先级更高。
 */
export interface GlyphFontConfig {
  /** 输出字素展示字体，例如 Sarasa Mono SC、LXGW WenKai Mono、Source Code Pro 等开源等宽字体。 */
  family?: string;
  /** 字素宽度 profile 名称，后续用于按字体选择宽字素规则。 */
  widthProfile?: string;
  /** 用户自定义宽字素正则字符串，后续优先级高于 widthProfile。 */
  wideCharRegex?: string;
}

/**
 * Alignment modes for multi-line visual-text rendering.
 *
 * 多行视觉文本渲染时的对齐方式。
 */
export enum TextAlign {
  /** 左对齐 */
  LEFT = 'left',
  
  /** 居中对齐 */
  CENTER = 'center',
  
  /** 右对齐 */
  RIGHT = 'right'
}

/**
 * Defines how the `height` configuration value is interpreted.
 *
 * 指定 `height` 配置值的含义。
 * 
 * @example
 * ```typescript
 * // line模式: height=10表示每行10像素高
 * const config1: ArtConfig = {
 *   height: 10,
 *   heightMode: HeightMode.LINE
 * };
 * 
 * // total模式: height=100表示总高度100像素
 * const config2: ArtConfig = {
 *   height: 100,
 *   heightMode: HeightMode.TOTAL
 * };
 * ```
 * 
 * @remarks
 * - LINE: height表示每行的高度（像素）
 * - TOTAL: height表示整个输出的总高度（像素）
 * - 默认使用LINE模式，更符合直觉
 */
export enum HeightMode {
  /** height表示每行的高度 */
  LINE = 'line',
  
  /** height表示总高度 */
  TOTAL = 'total'
}

//#endregion

//#region 🟦 核心配置接口

/**
 * Complete conversion configuration.
 *
 * 包含字符画生成的所有配置选项；未指定字段使用默认值。公开调用可传入
 * `Partial<ArtConfig>`，再交由 `validateConfig` 归一化。
 * 
 * @example
 * ```typescript
 * // 最小配置（使用所有默认值）
 * const minimalConfig: ArtConfig = {};
 * 
 * // 完整配置
 * const fullConfig: ArtConfig = {
 *   height: 20,
 *   matrixSize: 6,
 *   ratio: 2.0,
 *   charset: {
 *     type: PresetCharset.ASCII
 *   },
 *   font: 'Noto Sans SC',
 *   invert: false,
 *   enableEarlyTermination: true
 * };
 * 
 * // 图片转字符画
 * const imageArt = await imageToArt('photo.jpg', fullConfig);
 * 
 * // 文本转字符画
 * const textArt = await textToArt('Hello', {
 *   ...fullConfig,
 *   font: 'Noto Sans SC',
 *   height: 15
 * });
 * ```
 * 
 * @remarks
 * - 至少提供 `height` 或 `width` 之一；同时提供时以 `height` 为准，`width` 作为参考。
 * - `matrixSize` 越大，细节越丰富，但速度越慢；`ratio` 影响字素宽高比，常见值为 2。
 *
 * **Validation / 校验：**`height` 和 `width`（如提供）必须大于零；`matrixSize` 的范围
 * 为 2 至 20（推荐 4 至 8）；`ratio` 的范围为 1 至 3（推荐 2）；`fontReduce` 的范围为
 * 0 至 10。`charSpace` 是当前不改变主路径输出的 reserved 字段。
 */
export interface ArtConfig {
  //#region 🔶 尺寸配置
  
  /** 
   * 输出高度（行数/像素数）
   * - 与width二选一，或同时指定
   * - 含义取决于heightMode
   * - 默认值: 无（必须指定height或width之一）
   * 
   * @example
   * height: 20 // 输出20行字符
   */
  height?: number;
  
  /** 
   * 输出宽度（列数/像素数）
   * - 与height二选一，或同时指定
   * - 如同时指定，以height为准
   * - 默认值: 无
   * 
   * @example
   * width: 80 // 输出80列字符
   */
  width?: number;
  
  //#endregion
  
  //#region 🔶 采样配置
  
  /** 
   * 采样矩阵大小
   * - 每个采样块缩放的尺寸
   * - 范围: [2, 20]
   * - 推荐: [4, 8]
   * - 默认值: 6
   * 
   * @remarks
   * - 值越大，细节越丰富
   * - 但计算量呈平方增长 O(M²)
   * - 6是质量和速度的平衡点
   * 
   * @example
   * matrixSize: 6 // 每个块缩放为6×6像素
   */
  matrixSize: number;
  
  /** 
   * 垂直水平比例（字体高度/宽度）
   * - 范围: [1.0, 3.0]
   * - 推荐: 2.0
   * - 默认值: 2.0
   * 
   * @remarks
   * - 大多数字体的高度约为宽度的2倍
   * - 等宽字体可能接近1.5-1.8
   * - 特殊字体可能需要调整
   * 
   * @example
   * ratio: 2.0 // 字体高度是宽度的2倍
   */
  ratio: number;
  
  /** 
   * 插值算法
   * - 用于图像缩放
   * - 默认值: Interpolation.BICUBIC
   * 
   * @see {@link Interpolation} 可用的插值算法
   */
  interpolation: Interpolation;
  
  //#endregion
  
  //#region 🔶 字符集配置
  
  /** 
   * 字符集配置
   * - 决定使用哪些字符进行匹配
   * - 默认值: ASCII字符集
   * 
   * @example
   * charset: {
   *   type: PresetCharset.EXTENDED
   * }
   */
  charset: CharsetConfig;
  
  //#endregion
  
  //#region 🔶 字体配置（仅文本模式）

  /**
   * 视觉字体配置（推荐新字段）
   * - 用于输入文字渲染成中间图像
   * - 旧字段 font/fontStyle/fontReduce 会作为兼容别名映射到此对象
   *
   * @example
   * visualFont: {
   *   family: 'Noto Sans SC',
   *   style: FontStyle.REGULAR,
   *   reduce: 0
   * }
   */
  visualFont?: VisualFontConfig;
  
  /** 
   * 字体名称或路径（兼容旧字段，语义等同于 visualFont.family）
   * - 系统字体: 直接使用字体名称（建议优先使用开源字体，如 'Noto Sans SC'）
   * - 自定义字体: 提供字体文件路径（如'/path/to/font.ttf'）
   * - 默认值: 'Noto Sans SC'（开源字体优先）
   * 
   * @example
   * font: 'Noto Sans SC' // 使用开源中文字体
   * font: './fonts/custom.ttf' // 使用自定义字体文件
   */
  font?: string;
  
  /** 
   * 字体样式（兼容旧字段，语义等同于 visualFont.style）
   * - 需要字体文件支持对应样式
   * - 默认值: FontStyle.REGULAR
   * 
   * @see {@link FontStyle}
   */
  fontStyle?: FontStyle;
  
  /** 
   * 视觉字体渲染内边距/字号收缩量（像素，兼容旧字段，语义等同于 visualFont.reduce）
   * - 增加视觉字体渲染时的内边距
   * - 范围: [0, 10]
   * - 推荐: 0
   * - 默认值: 0
   * 
   * @remarks
   * - 值越小，字符间距越紧凑
   * - 过大会导致字符显小
   * - 一般保持0即可
   */
  fontReduce?: number;
  
  /** 
   * 字符间距（像素，保留字段）
   * - 当前 Core 主路径暂不按此字段改变文本渲染或采样结果
   * - 后续视觉字体排版增强时会作为字符间距入口
   * - 默认值: 1（仅用于配置兼容）
   * 
   * @remarks
   * - 调用方 UI 可展示为实验性/预留选项，不应承诺当前输出会变化。
   */
  charSpace?: number;

  /**
   * 字素字体配置（推荐新字段）
   * - 用于描述字符画输出后实际显示字素的字体
   * - 不参与输入文字渲染，不应与 visualFont 混用
   * - 会影响裱框、语义布局、导出和 ArtResult.cols 的字素显示宽度计算
   */
  glyphFont?: GlyphFontConfig;

  /**
   * 字素字体名称（兼容便捷字段，语义等同于 glyphFont.family）
   * - Web / VSCode / Electron 可用它控制预览区域字体
   * - Core 默认不猜测用户实际显示字体
   */
  glyphFontFamily?: string;

  /**
   * 字素宽度 profile 名称（兼容便捷字段，语义等同于 glyphFont.widthProfile）
   * - 会按内置字素字体 profile 参与宽字符判定
   */
  glyphWidthProfile?: string;

  /**
   * 用户自定义宽字素正则字符串（兼容便捷字段，语义等同于 glyphFont.wideCharRegex）
   * - 是完整宽字素字符类，优先级高于 glyphWidthProfile
   */
  wideCharRegex?: string;
  
  //#endregion
  
  //#region 🔶 文本布局配置
  
  /** 
   * 文本对齐方式
   * - 仅对多行文本有效
   * - 默认值: TextAlign.LEFT
   * 
   * @see {@link TextAlign}
   */
  textAlign?: TextAlign;
  
  /** 
   * 行间距（像素）
   * - 多行文本的行间空白
   * - 范围: [0, 20]
   * - 推荐: 0
   * - 默认值: 0
   * 
   * @example
   * lineSpacing: 5 // 增加行间距
   */
  lineSpacing?: number;
  
  /** 
   * 高度模式
   * - 决定height参数的含义
   * - 默认值: HeightMode.LINE
   * 
   * @see {@link HeightMode}
   */
  heightMode?: HeightMode;
  
  //#endregion
  
  //#region 🔶 输出配置
  
  
  /** 
   * 是否反转颜色（黑底白字）
   * - false: 白底黑字（默认）
   * - true: 黑底白字
   * - 默认值: false
   * 
   * @example
   * invert: true // 反转为黑底效果
   */
  invert: boolean;

  /**
   * 输出格式
   * - 默认值: OutputFormat.PLAIN_TEXT
   * - HTML和ANSI格式由assembler模块统一处理
   *
   * @see {@link OutputFormat}
   */
  outputFormat?: OutputFormat;

  /**
   * 输出目标环境
   * - plain: 普通文本
   * - terminal: 终端
   * - web: Web 页面
   * - vscode: VSCode 插件
   * - electron: Electron 客户端
   * - html/ansi: 与特定输出格式相关的环境
   *
   * @remarks
   * - 该字段主要用于多端配置统一和后续环境特化，不直接改变当前采样结果。
   */
  outputTarget?: OutputTarget;
  
  /** 
   * 是否去除行尾空格
   * - 减少输出文件的体积
   * - 可能影响对齐
   * - 默认值: false
   * 
   * @remarks
   * - 启用后，每行末尾的空格会被删除
   * - 对于固定宽度的终端显示可能不合适
   */
  trimTrailingSpaces?: boolean;

  /**
   * 裱框配置
   * - false: 关闭（默认）
   * - object: 对最终字符画文本执行外框后处理，或在文本模式中启用 layout-stage 行/格布局
   *
   * @remarks
   * - post/outer 裱框已作为稳定后处理能力使用。
   * - layout/lines、layout/grid 仍属于实验性布局能力，调用方应在 UI 中标注或隐藏高级选项。
   */
  box?: false | BoxOptions;
  
  //#endregion
  
  //#region 🔶 性能配置

  /**
   * 宽字符匹配比例阈值
   * - 当 wideSAD < normalSAD × wideCharRatio 时选择宽字符
   * - 默认值: 1.5
   *
   * @remarks
   * - 值越小越保守，越不容易选择宽字符
   * - 值越大越激进，越容易选择宽字符
   */
  wideCharRatio?: number;
  
  /** 
   * 是否启用早期终止优化
   * - 大幅提升SAD匹配速度
   * - 不影响结果准确性
   * - 默认值: true
   * 
   * @remarks
   * - 原理: 当累计SAD超过当前最优值时提前退出
   * - 加速比: 通常2-5倍
   * - 强烈建议保持启用
   * 
   * **性能：**启用后可在累计 SAD 超过当前最优值时提前结束，典型可提升 2 至 5 倍；
   * `N` 为字符集大小，`M` 为 `matrixSize`。
   */
  enableEarlyTermination?: boolean;
  
  /** 
   * 最大并行任务数（保留字段）
   * - 当前 Core 匹配路径仍为单进程/单线程实现
   * - 后续引入 worker_threads / Web Worker 时再接入该字段
   * - 默认值: 0（仅用于配置兼容）
   * 
   * @remarks
   * - 调用方 UI 可展示为实验性/预留选项，不应承诺当前输出或速度会变化。
   */
  maxParallelTasks?: number;
  
  //#endregion

  //#region 🔶 本地化配置

  /**
   * Core 消息语言
   * - 默认值: zh-CN
   * - 当前支持: zh-CN, en-US
   *
   * @remarks
   * - 该字段只影响 Core 层错误和提示消息，不改变转换算法结果。
   * - CLI / Web / VSCode / Electron 应把各自的语言设置同步到此字段。
   */
  locale?: SupportedLocale;

  //#endregion
}

//#endregion

//#region 🟦 默认配置

/**
 * 🟢 默认配置常量
 * 
 * 🔹 提供所有配置项的合理默认值。
 * 🔹 可作为用户配置的基准。
 * 
 * @constant {Partial<ArtConfig>} DEFAULT_CONFIG
 * 
 * @example
 * ```typescript
 * // 使用默认配置
 * const config: ArtConfig = {
 *   ...DEFAULT_CONFIG,
 *   height: 20, // 仅覆盖需要的项
 *   charset: {
 *     type: PresetCharset.EXTENDED
 *   }
 * };
 * ```
 * 
 * @remarks
 * - matrixSize=6: 平衡质量和速度
 * - ratio=2.0: 适合大多数字体
 * - enableEarlyTermination=true: 性能优化
 * - 其他项根据实际需要覆盖
 */
export const DEFAULT_CONFIG: Partial<ArtConfig> = {
  // 采样配置
  matrixSize: 6,
  ratio: 2.0,
  interpolation: Interpolation.BILINEAR,
  
  // 字符集配置
  charset: {
    type: PresetCharset.ASCII
  },
  
  // 字体配置
  visualFont: {
    family: 'Noto Sans SC',
    style: FontStyle.REGULAR,
    reduce: 0
  },
  glyphFont: {
    family: undefined,
    widthProfile: 'default',
    wideCharRegex: undefined
  },
  font: 'Noto Sans SC',
  fontStyle: FontStyle.REGULAR,
  fontReduce: 0,
  charSpace: 1,
  
  // 文本布局配置
  textAlign: TextAlign.LEFT,
  lineSpacing: 0,
  heightMode: HeightMode.LINE,
  
  // 输出配置
  outputFormat: OutputFormat.PLAIN_TEXT,
  outputTarget: 'plain',
  invert: false,
  trimTrailingSpaces: false,
  box: false,

  // 性能配置
  wideCharRatio: 2.0,
  enableEarlyTermination: true,
  maxParallelTasks: 0,

  // 本地化配置
  locale: 'zh-CN'
};

//#endregion

//#region 🟦 配置归一化工具

/**
 * 🟢 归一化统一配置模型别名
 *
 * 🔹 旧 API 仍然可以继续传 `font` / `fontStyle` / `fontReduce`。
 * 🔹 新 API 推荐传 `visualFont` / `glyphFont` / `outputTarget`。
 * 🔹 返回对象会同时补齐旧字段和新字段，方便当前算法与后续多端 UI 共用。
 */
export function normalizeArtConfigAliases(config: Partial<ArtConfig>): Partial<ArtConfig> {
  const visualFont = normalizeVisualFontConfig(config);
  const glyphFont = normalizeGlyphFontConfig(config);

  return {
    ...config,
    visualFont,
    glyphFont,
    font: visualFont.family,
    fontStyle: visualFont.style,
    fontReduce: visualFont.reduce,
    glyphFontFamily: glyphFont.family,
    glyphWidthProfile: glyphFont.widthProfile,
    wideCharRegex: glyphFont.wideCharRegex,
    outputTarget: config.outputTarget || inferOutputTarget(config.outputFormat),
    locale: normalizeLocale(config.locale)
  };
}

function normalizeVisualFontConfig(config: Partial<ArtConfig>): VisualFontConfig {
  const source = config.visualFont || {};
  return {
    ...source,
    family: source.family ?? config.font ?? DEFAULT_CONFIG.font,
    style: source.style ?? config.fontStyle ?? DEFAULT_CONFIG.fontStyle,
    reduce: source.reduce ?? config.fontReduce ?? DEFAULT_CONFIG.fontReduce
  };
}

function normalizeGlyphFontConfig(config: Partial<ArtConfig>): GlyphFontConfig {
  const source = config.glyphFont || {};
  const wideCharRegex = source.wideCharRegex ?? config.wideCharRegex;
  return {
    ...source,
    family: source.family ?? config.glyphFontFamily,
    widthProfile: source.widthProfile ?? config.glyphWidthProfile ?? 'default',
    // Web 表单的空值应等价于未设置规则，避免空规则意外改变 profile 行为。
    wideCharRegex: wideCharRegex?.trim() || undefined
  };
}

function inferOutputTarget(outputFormat: OutputFormat | undefined): OutputTarget {
  if (outputFormat === OutputFormat.HTML) {
    return 'html';
  }
  if (outputFormat === OutputFormat.ANSI) {
    return 'ansi';
  }
  return 'plain';
}

//#endregion
