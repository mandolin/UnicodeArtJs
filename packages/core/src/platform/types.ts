/**
 * ============================================================================
 * 🟦 Platform adapter contracts
 * ============================================================================
 *
 * 🔶 Module responsibility
 * Defines the boundary between pure UnicodeArt algorithms and host-specific
 * image/font/text rendering implementations.
 * ============================================================================
 */

import type { CharMatrix, CharsetConfig } from '../types/charset';
import type { Interpolation } from '../types/config';
import type { CoreImageData } from '../types/image';

//#region 🟦 Text Rendering

/**
 * Text rendering options for platform adapters.
 *
 * 描述把输入文本光栅化为灰度图像时所需的视觉字体、画布和行布局参数。该配置面向平台
 * 适配层，通常由高层 `ArtConfig` 标准化后生成。
 *
 * @remarks
 * The `font` here is the visual font used to rasterize source text, not the
 * glyph font used to render matching templates.
 *
 * 这里的 `font` 是输入文字渲染用的视觉字体，不是输出字素模板使用的字素字体。
 *
 * @public
 */
export interface TextRenderOptions {
  /** 视觉字体名称或字体文件路径。 */
  font: string;
  /** 视觉字体字号，单位为像素。 */
  fontSize: number;
  /** 目标画布宽度，单位为像素。 */
  width: number;
  /** 目标画布高度，单位为像素。 */
  height: number;
  /** 文本水平对齐方式。 */
  textAlign?: string;
  /** 逻辑行间距。 */
  lineSpacing?: number;
  /** 高度解释模式，决定 height 表示单行高度还是总高度。 */
  heightMode?: string;
  /** 视觉字体渲染收缩量，用于手动纠偏部分字体的裁切或偏移。 */
  fontReduce?: number;
  /** 已计算好的单行矩形高度。 */
  rectunit?: number;
  /** 已换算为像素的行间距。 */
  lineSpacingPixels?: number;
}

/**
 * Text measurement options for platform adapters.
 *
 * 用于平台适配层测量文本宽度，保证渲染前的布局估算与实际绘制字体一致。
 *
 * @public
 */
export interface TextMeasureOptions {
  /** 视觉字体名称或字体文件路径。 */
  font: string;
  /** 视觉字体字号，单位为像素。 */
  fontSize: number;
  /** 与文本渲染一致的视觉字体收缩量。 */
  fontReduce?: number;
}

//#endregion

//#region 🟦 Character Rendering

/**
 * Glyph-template rendering options for platform adapters.
 *
 * 描述把单个输出字素渲染为矩阵模板时需要的字体、矩阵和插值参数。
 *
 * @remarks
 * This path affects matching templates and therefore can change the generated
 * art. It should use the glyph font resolved from `glyphFont` / legacy
 * `glyphFontFamily`.
 *
 * 该路径影响匹配模板，因此可能改变生成结果；应使用由 `glyphFont` 或旧
 * `glyphFontFamily` 解析出的字素字体。
 *
 * @public
 */
export interface CharRenderOptions {
  /** 单个普通字素模板的矩阵边长。 */
  matrixSize: number;
  /** 字素字体名称或字体文件路径。 */
  font: string;
  /** 字素字体字号，单位为像素。 */
  fontSize: number;
  /** 字素模板渲染收缩量。 */
  fontReduce?: number;
  /** 缩放插值算法。 */
  interpolation?: Interpolation;
  /** 字符画宽高比。 */
  ratio?: number;
}

/**
 * Charset precomputation options.
 *
 * 描述批量生成字素矩阵模板时使用的字符集和字体渲染参数。
 *
 * @public
 */
export interface PrecomputeCharDataOptions {
  /** 预设或自定义字符集配置。 */
  charset: CharsetConfig;
  /** 单个普通字素模板的矩阵边长。 */
  matrixSize: number;
  /** 字素字体名称或字体文件路径。 */
  font: string;
  /** 字素字体字号，未指定时通常按矩阵尺寸推导。 */
  fontSize?: number;
  /** 字素模板渲染收缩量。 */
  fontReduce?: number;
  /** 缩放插值算法。 */
  interpolation?: Interpolation;
  /** 字符画宽高比。 */
  ratio?: number;
  /** 字体样式，例如 regular、bold 或 italic。 */
  fontStyle?: string;
}

//#endregion

//#region 🟦 Unified Adapter

/**
 * UnicodeArtJs platform adapter contract.
 *
 * 把纯算法层与 Node、浏览器等宿主环境中的图像解码、文本绘制和字体加载隔离开。Core
 * 高层入口只依赖该契约，从而在不同运行时复用同一套采样、匹配和输出逻辑。
 *
 * @remarks
 * Implementations may differ at pixel level across rendering engines. Public
 * Core contracts require stable option semantics and explainable output
 * dimensions, not cross-engine pixel identity.
 *
 * 不同渲染引擎可能存在像素级差异。Core 公共契约要求配置语义稳定、输出尺寸可解释，
 * 不要求跨引擎像素级完全一致。
 *
 * @public
 */
export interface UnicodeArtPlatformAdapter {
  /** 加载宿主支持的图片输入并返回 Core 灰度图像数据。 */
  loadImage(input: unknown): Promise<CoreImageData>;
  /** 可选的图片缩放能力，适配器不支持时由上层或调用方规避。 */
  resizeImage?(
    image: CoreImageData,
    targetWidth: number,
    targetHeight: number,
    interpolation?: string
  ): Promise<CoreImageData>;
  /** 将视觉文本渲染为 Core 灰度图像数据。 */
  renderTextToImage(text: string, options: TextRenderOptions): Promise<CoreImageData>;
  /** 测量文本在指定视觉字体下的实际绘制宽度。 */
  measureTextWidth(text: string, options: TextMeasureOptions): Promise<number>;
  /** 将单个字素渲染为归一化矩阵模板。 */
  renderCharToMatrix(char: string, options: CharRenderOptions): Promise<Float32Array>;
  /** 批量预计算字符集的字素矩阵模板。 */
  precomputeCharData(options: PrecomputeCharDataOptions): Promise<Map<string, CharMatrix>>;
  /** 加载字体并返回可用于当前宿主渲染 API 的字体标识。 */
  loadFont(font: string, fontStyle?: string): Promise<string>;
}

//#endregion
