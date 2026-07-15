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
 * 🟢 文本渲染选项
 *
 * 🔹 描述把输入文本光栅化为灰度图像时所需的视觉字体、画布和行布局参数。
 * 🔹 该配置面向平台适配层，通常由高层 `ArtConfig` 标准化后生成。
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
 * 🟢 文本测量选项
 *
 * 🔹 用于平台适配层测量文本宽度，保证渲染前的布局估算与实际绘制字体一致。
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
 * 🟢 字素渲染选项
 *
 * 🔹 描述把单个输出字素渲染为矩阵模板时需要的字体、矩阵和插值参数。
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
 * 🟢 字符集预计算选项
 *
 * 🔹 描述批量生成字素矩阵模板时使用的字符集和字体渲染参数。
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
 * 🟢 UnicodeArtJs 平台适配器契约
 *
 * 🔹 把纯算法层与 Node、浏览器等宿主环境中的图像解码、文本绘制和字体加载隔离开。
 * 🔹 Core 高层入口只依赖该契约，从而在不同运行时复用同一套采样、匹配和输出逻辑。
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
