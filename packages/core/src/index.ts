/**
 * ============================================================================
 * 🟦 UnicodeArtJs 核心库主入口
 * ============================================================================
 * 
 * 🔶 模块职责
 * 导出所有公共API，包括：
 * - 类型定义（Types）
 * - 常量（Constants）
 * - 核心函数（已实现）
 * - 工具函数（Utils）
 * 
 * 🔶 使用方式
 * 
 * **CommonJS**:
 * ```javascript
 * const UnicodeArt = require('unicode-art-js');
 * const { imageToArt, textToArt } = UnicodeArt;
 * ```
 * 
 * **ES Module**:
 * ```typescript
 * import { imageToArt, textToArt } from 'unicode-art-js';
 * ```
 * 
 * **UMD (Browser)**:
 * ```html
 * <script src="unicode-art-js.umd.js"></script>
 * <script>
 *   const result = await UnicodeArt.imageToArt('photo.jpg', config);
 * </script>
 * ```
 * 
 * 🔶 API概览
 * 
 * **主要函数**:
 * - `textToArt(text, config)` - 文本转字符画 ✅
 * - `imageToArt(imagePath, config)` - 图片转字符画 ✅
 * - `validateConfig(config)` - 验证配置参数 ✅
 * 
 * **工具函数**:
 * - `isWideChar(char)` - 判断是否为宽字符 ✅
 * - `getPresetChars(type)` - 获取预定义字符集 ✅
 * - `calculateDisplayWidth(text)` - 计算显示宽度 ✅
 * 
 * **底层模块**（高级用户）:
 * - `preprocessor` - 图像预处理
 * - `sampler` - 采样数组生成
 * - `charRenderer` - 字符矩阵渲染
 * - `matcher` - SAD匹配算法
 * - `assembler` - 输出组装
 * 
 * **类型导出**:
 * - ImageData, SamplingBlock, CharMatrix
 * - ArtConfig, ArtResult, UnicodeArtError
 * - 所有枚举类型
 * 
 * @module unicode-art-js
 * @author Qoder
 * @since 1.0.0
 * @license MIT
 * @see {@link https://github.com/mandolin/UnicodeArtJs}
 * ============================================================================
 */

//#region 🟦 类型导出

// 图像数据类型
export type {
  CoreImageData,
  ImageData,
  SamplingBlock,
  SamplingArray,
  PixelCoord,
  Rect
} from './types/image';

// 字符集类型
export type {
  CharMatrix,
  CharsetConfig
} from './types/charset';

export {
  CharType,
  PresetCharset
} from './types/charset';

// 配置类型
export type {
  ArtConfig
} from './types/config';

export type {
  BoxAlign,
  BoxCellOptions,
  BoxChars,
  BoxMode,
  BoxOptions,
  BoxOverflow,
  BoxRenderStage,
  BoxSeparatorOptions,
  BoxShadowOptions,
  BoxSpacing,
  BoxStyleMetadata,
  BoxStyleDefinition,
  BoxStyleName,
  BoxTitleOptions,
  BoxVerticalAlign,
  NormalizedBoxOptions,
  NormalizedBoxShadowOptions,
  NormalizedBoxTitleOptions,
  SpacingValue
} from './box/types';
import type {
  BoxOptions,
  BoxSeparatorOptions,
  NormalizedBoxOptions as RuntimeBoxOptions,
  SpacingValue
} from './box/types';

export {
  Interpolation,
  FontStyle,
  TextAlign,
  HeightMode,
  DEFAULT_CONFIG
} from './types/config';

// 输出和错误类型
export type {
  ArtResult,
  ArtMetadata
} from './types/output';

export {
  OutputFormat,
  ErrorCode,
  UnicodeArtError
} from './types/output';

//#endregion

//#region 🟦 常量导出

export {
  // 默认参数
  DEFAULT_MATRIX_SIZE,
  DEFAULT_VERTICAL_HORIZONTAL_RATIO,
  DEFAULT_FONT_REDUCE,
  DEFAULT_CHAR_SPACE,
  DEFAULT_WIDE_CHAR_RATIO,
  
  // 插值映射
  INTERPOLATION_MAP,
  
  // 验证范围
  MIN_MATRIX_SIZE,
  MAX_MATRIX_SIZE,
  MIN_RATIO,
  MAX_RATIO,
  MAX_FONT_REDUCE,
  MAX_CHAR_SPACE,
  MAX_LINE_SPACING,
  
  // 性能常量
  MAX_PARALLEL_TASKS,
  EARLY_TERMINATION_MIN_CHARSET_SIZE,
  LARGE_IMAGE_THRESHOLD,
  
  // 字体样式
  FONT_STYLE_SUFFIX,
  
  // 系统路径
  WINDOWS_FONT_DIR,
  MACOS_FONT_DIR,
  LINUX_FONT_DIRS,
  
  // 默认字符集
  DEFAULT_ASCII_CHARS,
  EXTENDED_CHARS,
  CHINESE_SIMPLE_CHARS
} from './constants';

//#endregion

//#region 🟦 核心函数导出

import type { ArtConfig } from './types/config';
import type { ArtResult } from './types/output';
import { UnicodeArtError, ErrorCode, OutputFormat } from './types/output';
import { PresetCharset } from './types/charset';
import { DEFAULT_ASCII_CHARS, EXTENDED_CHARS, CHINESE_SIMPLE_CHARS } from './constants';
import { Interpolation, TextAlign, HeightMode } from './types/config';
import { invertPixels } from './preprocessor';
import { generateSamplingArray } from './sampler';
import { batchMatch } from './matcher';
import { assembleOutput, assembleTextOutput } from './assembler';
import { isWideChar as detectWideChar, calculateDisplayWidth } from './utils/wideCharDetector';
import { boxText, normalizeBoxOptions as normalizeBoxConfig } from './box/box';
import { getGlyphWidth, padToWidth, repeatToWidth } from './box/width';
import { nodePlatformAdapter } from './platform/node/nodePlatformAdapter';

export {
  loadImage,
  renderTextToImage,
  rgbToGrayscale,
  rgbaToGrayscale,
  resizeImage,
  normalizePixels,
  invertPixels
} from './preprocessor';

export type {
  CharRenderOptions,
  PrecomputeCharDataOptions,
  TextMeasureOptions,
  TextRenderOptions,
  UnicodeArtPlatformAdapter
} from './platform/types';

export {
  nodePlatformAdapter
} from './platform/node/nodePlatformAdapter';

export type {
  ImageDataToArtOptions
} from './pure/imageDataToArt';

export {
  imageDataToArt
} from './pure/imageDataToArt';

export {
  calculateOutputSize,
  calculateBlockSize,
  extractBlock,
  resizeAndNormalizeBlock,
  bilinearInterpolate,
  generateSamplingArray
} from './sampler';

export {
  renderCharToMatrix,
  precomputeCharData,
  loadFont
} from './charRenderer';

export {
  calculateSAD,
  findBestMatchForBlock,
  batchMatch,
  batchMatchParallel
} from './matcher';

export {
  assemblePlainText,
  trimTrailingSpaces,
  assembleHTML,
  escapeHTML,
  assembleANSI,
  assembleOutput,
  assembleTextOutput
} from './assembler';

export {
  calculateDisplayWidth,
  detectWideCharsInText
} from './utils/wideCharDetector';

export {
  boxText,
  normalizeBoxOptions,
  previewBoxStyle
} from './box/box';

export {
  BOX_STYLES,
  BOX_STYLE_METADATA,
  getBoxStyleNames,
  getBoxStyleMetadata,
  isBoxStyleName,
  resolveBoxChars
} from './box/styles';

export {
  getGlyphWidth,
  repeatToWidth,
  padToWidth,
  cropToWidth
} from './box/width';

export {
  ZERO_SPACING,
  normalizeSpacing
} from './box/spacing';

/**
 * ============================================================================
 * 🟦 文本转字符画
 * ============================================================================
 * 
 * 🔶 核心思路（参考Python实现）
 * 文本转字符画的正确流程是：**先渲染为图像，再进行SAD匹配**，而非逐字符匹配。
 * 
 * ✅ 正确流程
 * 1. 使用canvas/Pillow将文本渲染为位图（支持多行、对齐、行间距）
 * 2. 对渲染后的图像进行采样（与imageToArt相同）
 * 3. 预计算字符集数据
 * 4. 批量SAD匹配
 * 5. 组装输出
 * 
 * ❌ 错误做法
 * - 逐个字符渲染并匹配（会导致宽字符/窄字符尺寸不匹配问题）
 * - 忽略height参数（应该用于控制字体大小）
 * 
 * @param text - 输入文本字符串
 * @param config - 配置对象
 * @returns ArtResult 字符画结果
 */
export async function textToArt(
  text: string,
  config: Partial<ArtConfig>
): Promise<ArtResult> {
  const startTime = Date.now();
  
  try {
    // 🔹 验证输入
    if (!text || text.length === 0) {
      throw new UnicodeArtError(
        '文本不能为空',
        ErrorCode.INVALID_INPUT,
        { text }
      );
    }
    
    //  合并配置
    const fullConfig = validateConfig(config);

    if (isLayoutBoxConfig(fullConfig)) {
      return await textToLayoutArt(text, fullConfig, startTime);
    }
    
    // 🔹 处理多行文本
    const lines = text.split('\n');
    const lineCount = lines.length;
    const resolvedFont = await nodePlatformAdapter.loadFont(fullConfig.font || 'Arial', fullConfig.fontStyle);
    
    //  渲染文本为图像
    // Python的字体大小计算: afont = ImageFont.truetype(font, rectunit - fontreduce*2)
    // 其中rectunit在line模式下等于height（字符画行数）
    // 实际像素高度 = rectunit * matrixSize
    // 所以字体大小 = height * matrixSize - fontReduce * 2
    const heightInRows = fullConfig.height || lineCount;
    const fontReduce = fullConfig.fontReduce || 0;
    const lineSpacingPixels = (fullConfig.lineSpacing || 0) * fullConfig.matrixSize;
    let canvasHeight: number;
    let rectunit: number;

    if (fullConfig.heightMode === HeightMode.TOTAL) {
      canvasHeight = heightInRows * fullConfig.matrixSize;
      const totalSpacingPixels = lineSpacingPixels * Math.max(0, lineCount - 1);
      const drawingHeight = canvasHeight - totalSpacingPixels;
      rectunit = Math.max(2, Math.floor(drawingHeight / lineCount));
    } else {
      rectunit = Math.max(2, heightInRows * fullConfig.matrixSize);
      const textHeight = rectunit * lineCount;
      const spacingHeight = lineSpacingPixels * Math.max(0, lineCount - 1);
      canvasHeight = textHeight + spacingHeight;
    }

    const fontSize = Math.max(1, rectunit - fontReduce * 2);
    
    // 🔹 计算画布宽度 - 需要实际测量文本的像素宽度
    // 不能简单用calculateDisplayWidth * matrixSize，因为那只是字符画列数
    // 正确做法：先创建一个临时canvas测量文本宽度
    let canvasWidth: number;
    try {
      // 找出最宽的一行
      let maxWidth = 0;
      for (const line of lines) {
        const lineWidth = await nodePlatformAdapter.measureTextWidth(line, {
          font: resolvedFont,
          fontSize,
          fontReduce
        });
        if (lineWidth > maxWidth) {
          maxWidth = lineWidth;
        }
      }
      
      canvasWidth = Math.ceil(maxWidth);
    } catch (e) {
      // fallback: 使用estimate方法
      canvasWidth = lineCount > 0 ? 
        Math.max(...lines.map(line => calculateDisplayWidth(line))) * fullConfig.matrixSize * 10 : 
        fullConfig.matrixSize * 10;
    }
    
    
    let imageData = await nodePlatformAdapter.renderTextToImage(
      text,
      {
        font: resolvedFont,
        fontSize,
        width: canvasWidth,
        height: canvasHeight,
        textAlign: fullConfig.textAlign,
        lineSpacing: fullConfig.lineSpacing,
        heightMode: fullConfig.heightMode,
        fontReduce,
        rectunit,
        lineSpacingPixels
      }
    );
    

    // 🔹 反转像素（如果启用）
    if (fullConfig.invert) {
      imageData = {
        ...imageData,
        data: invertPixels(imageData.data)
      };
    }
    
    // 🔹 生成采样数组
    const samplingArray = generateSamplingArray(imageData, {
      ...fullConfig,
      height: canvasHeight / fullConfig.matrixSize // 转换为字符画行数
    });
    
    // 🔹 预计算字符数据
    // Python参考: font = ImageFont.truetype(char_font_file, matrix_size)
    // 字符渲染时使用matrixSize作为字体大小，不是fontSize
    const charDataMap = await nodePlatformAdapter.precomputeCharData({
      charset: fullConfig.charset,
      matrixSize: fullConfig.matrixSize,
      font: resolvedFont,
      fontSize: fullConfig.matrixSize, // ← 修正：使用matrixSize而不是fontSize
      fontReduce: 0, // Python get_char_data does not apply fontreduce to character templates
      interpolation: fullConfig.interpolation,
      ratio: fullConfig.ratio,
      fontStyle: fullConfig.fontStyle
    });

    // 🔹 批量匹配
    const charMatrix = await batchMatch(samplingArray, charDataMap, fullConfig);
    
    // 🔹 组装输出
    const duration = Date.now() - startTime;
    const result = assembleOutput(
      charMatrix,
      fullConfig,
      fullConfig.outputFormat || OutputFormat.PLAIN_TEXT,
      {
        sourceWidth: 0,
        sourceHeight: 0,
        charset: fullConfig.charset.type || 'custom',
        matrixSize: fullConfig.matrixSize,
        font: fullConfig.font,
        charsetSize: charDataMap.size,
        duration
      }
    );
    
    return result;
  } catch (error) {
    if (error instanceof UnicodeArtError) {
      throw error;
    }
    
    throw new UnicodeArtError(
      `文本转字符画失败: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.INTERNAL_ERROR,
      { originalError: error }
    );
  }
}

//#region 🔶 Layout-stage box rendering

function isLayoutBoxConfig(config: ArtConfig): config is ArtConfig & { box: BoxOptions } {
  return config.box !== undefined &&
    config.box !== false &&
    config.box.enabled !== false &&
    config.box.renderStage === 'layout';
}

async function textToLayoutArt(
  text: string,
  config: ArtConfig & { box: BoxOptions },
  startTime: number
): Promise<ArtResult> {
  const normalized = normalizeBoxConfig(config.box);
  const plainConfig: ArtConfig = {
    ...config,
    box: false,
    outputFormat: OutputFormat.PLAIN_TEXT
  };

  const blocks = await buildLayoutBlocks(text, plainConfig, normalized);
  const layoutText = renderLayoutBlocks(blocks, normalized, config.box);
  const duration = Date.now() - startTime;

  return assembleTextOutput(
    layoutText,
    {
      ...config,
      box: false
    },
    config.outputFormat || OutputFormat.PLAIN_TEXT,
    {
      sourceWidth: 0,
      sourceHeight: 0,
      charset: config.charset.type || 'custom',
      matrixSize: config.matrixSize,
      font: config.font,
      charsetSize: 0,
      duration
    }
  );
}

async function buildLayoutBlocks(
  text: string,
  config: ArtConfig,
  box: RuntimeBoxOptions
): Promise<string[][][]> {
  if (box.mode === 'lines') {
    const lines = text.split('\n');
    const rendered = await Promise.all(lines.map((line) => renderTextBlock(line, config)));
    return rendered.map((block) => [block]);
  }

  if (box.mode === 'cells' || box.mode === 'grid') {
    const rows = text.split('\n');
    return Promise.all(rows.map(async (row) => {
      const glyphs = Array.from(row.length === 0 ? ' ' : row);
      return Promise.all(glyphs.map((glyph) => renderTextBlock(glyph, config)));
    }));
  }

  return [[await renderTextBlock(text, config)]];
}

async function renderTextBlock(text: string, config: ArtConfig): Promise<string[]> {
  const result = await textToArt(text.length === 0 ? ' ' : text, config);
  return result.content.split('\n');
}

function renderLayoutBlocks(
  rows: string[][][],
  box: RuntimeBoxOptions,
  rawBox: BoxOptions
): string {
  const separator = resolveLayoutSeparator(box, rawBox.separators);
  const normalizedRows = rows.map((row) => normalizeLayoutRow(row, box, rawBox.cell));
  const bodyLines: string[] = [];

  normalizedRows.forEach((row, rowIndex) => {
    if (rowIndex > 0 && shouldRenderRowSeparator(separator, rowIndex)) {
      bodyLines.push(renderRowSeparator(row, box));
    }

    bodyLines.push(...combineLayoutRow(row, separator.columns, box.chars.vertical || '|'));
  });

  const outerBox = toOuterBoxOptions(rawBox);
  return boxText(bodyLines.join('\n'), outerBox);
}

function normalizeLayoutRow(
  row: string[][],
  box: RuntimeBoxOptions,
  cell: BoxOptions['cell']
): string[][] {
  const minWidth = normalizeOptionalNonNegativeInteger(cell?.minWidth, 0, 'cell.minWidth');
  const minHeight = normalizeOptionalNonNegativeInteger(cell?.minHeight, 0, 'cell.minHeight');
  const cellPadding = normalizeCellPadding(cell?.padding);
  const maxWidth = Math.max(
    minWidth,
    ...row.map((block) => block.reduce((max, line) => Math.max(max, getGlyphWidth(line)), 0))
  );
  const maxHeight = Math.max(minHeight, ...row.map((block) => block.length));

  return row.map((block) => normalizeLayoutBlock(block, maxWidth, maxHeight, box, cellPadding));
}

function normalizeLayoutBlock(
  block: string[],
  width: number,
  height: number,
  box: RuntimeBoxOptions,
  padding: { top: number; right: number; bottom: number; left: number }
): string[] {
  const aligned = block.map((line) => padToWidth(line, width, box.align));
  const extra = Math.max(0, height - aligned.length);
  const before = box.verticalAlign === 'bottom'
    ? extra
    : box.verticalAlign === 'middle'
      ? Math.floor(extra / 2)
      : 0;
  const after = extra - before;
  const empty = ' '.repeat(width);
  const content = [
    ...Array.from({ length: before }, () => empty),
    ...aligned,
    ...Array.from({ length: after }, () => empty)
  ];
  const paddedWidth = width + padding.left + padding.right;

  return [
    ...Array.from({ length: padding.top }, () => ' '.repeat(paddedWidth)),
    ...content.map((line) => `${' '.repeat(padding.left)}${line}${' '.repeat(padding.right)}`),
    ...Array.from({ length: padding.bottom }, () => ' '.repeat(paddedWidth))
  ];
}

function combineLayoutRow(row: string[][], columnSeparator: boolean, separatorChar: string): string[] {
  const height = Math.max(...row.map((block) => block.length));
  const result: string[] = [];

  for (let lineIndex = 0; lineIndex < height; lineIndex++) {
    result.push(row.map((block) => block[lineIndex] ?? '').join(columnSeparator ? separatorChar : ''));
  }

  return result;
}

function renderRowSeparator(row: string[][], box: RuntimeBoxOptions): string {
  return row.map((block) => repeatToWidth(box.chars.horizontal || '-', getGlyphWidth(block[0] ?? ''))).join(
    box.chars.cross || '+'
  );
}

function resolveLayoutSeparator(box: RuntimeBoxOptions, separators: BoxSeparatorOptions | undefined): {
  rows: boolean | number[];
  columns: boolean;
} {
  if (box.mode === 'lines') {
    return {
      rows: separators?.rows ?? true,
      columns: false
    };
  }

  if (box.mode === 'cells' || box.mode === 'grid') {
    return {
      rows: separators?.rows ?? box.mode === 'grid',
      columns: separators?.columns !== undefined ? Boolean(separators.columns) : true
    };
  }

  return {
    rows: false,
    columns: false
  };
}

function shouldRenderRowSeparator(separator: { rows: boolean | number[] }, rowIndex: number): boolean {
  if (Array.isArray(separator.rows)) {
    return separator.rows.includes(rowIndex);
  }

  return separator.rows;
}

function toOuterBoxOptions(box: BoxOptions): BoxOptions {
  const {
    mode,
    renderStage,
    separators,
    cell,
    ...outer
  } = box;

  void mode;
  void renderStage;
  void separators;
  void cell;

  return {
    ...outer,
    mode: 'outer',
    renderStage: 'post'
  };
}

function normalizeCellPadding(value: SpacingValue | undefined): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (value === undefined) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  if (typeof value === 'number') {
    return { top: value, right: value, bottom: value, left: value };
  }

  return {
    top: value.top ?? 0,
    right: value.right ?? 0,
    bottom: value.bottom ?? 0,
    left: value.left ?? 0
  };
}

function normalizeOptionalNonNegativeInteger(
  value: number | undefined,
  fallback: number,
  name: string
): number {
  const candidate = value ?? fallback;
  if (!Number.isInteger(candidate) || candidate < 0) {
    throw new UnicodeArtError(
      `${name}必须为非负整数`,
      ErrorCode.INVALID_CONFIG,
      { [name]: value }
    );
  }

  return candidate;
}

//#endregion

/**
 * 🟢 图片转字符画
 * 
 * 🔹 将图像文件转换为字符画。
 * 🔹 完整流程：加载 → 灰度化 → 采样 → 匹配 → 组装。
 * 
 * @param imagePath - 图像文件路径
 * @param config - 配置选项
 * @returns Promise<ArtResult> 生成结果
 * 
 * @example
 * ```typescript
 * const result = await imageToArt('photo.jpg', {
 *   width: 80,
 *   matrixSize: 6,
 *   invert: false
 * });
 * console.log(result.content);
 * ```
 * 
 * @throws {UnicodeArtError} 当图像加载失败或参数无效时
 * 
 * @performance
 * - 时间复杂度: O(W × H + R × C × N × M²)
 *   - W, H = 源图像尺寸
 *   - R, C = 输出行列数
 *   - N = 字符集大小
 *   - M = matrixSize
 * - 典型耗时: 100-2000ms
 */
export async function imageToArt(
  imagePath: string,
  config: Partial<ArtConfig>
): Promise<ArtResult> {
  const startTime = Date.now();
  
  try {
    // 🔹 验证输入
    if (!imagePath || imagePath.length === 0) {
      throw new UnicodeArtError(
        '图像路径不能为空',
        ErrorCode.INVALID_INPUT,
        { imagePath }
      );
    }
    
    // 🔹 合并配置
    const fullConfig = validateConfig(config);
    
    // 🔹 加载图像
    const imageData = await nodePlatformAdapter.loadImage(imagePath);
    
    // 🔹 反转像素（如果启用）
    let processedImage = imageData;
    if (fullConfig.invert) {
      processedImage = { ...imageData, data: invertPixels(imageData.data) };
    }
    
    // 🔹 生成采样数组
    const samplingArray = generateSamplingArray(processedImage, fullConfig);
    
    // 🔹 预计算字符数据
    const charDataMap = await nodePlatformAdapter.precomputeCharData({
      charset: fullConfig.charset,
      matrixSize: fullConfig.matrixSize,
      font: fullConfig.font || 'Arial',
      fontSize: fullConfig.matrixSize,
      fontReduce: 0, // Python get_char_data does not apply fontreduce to character templates
      interpolation: fullConfig.interpolation,
      ratio: fullConfig.ratio,
      fontStyle: fullConfig.fontStyle
    });
    
    // 🔹 批量匹配
    const charMatrix = await batchMatch(samplingArray, charDataMap, fullConfig);
    
    // 🔹 组装输出
    const duration = Date.now() - startTime;
    const result = assembleOutput(
      charMatrix,
      fullConfig,
      fullConfig.outputFormat || OutputFormat.PLAIN_TEXT,
      {
        sourceWidth: imageData.width,
        sourceHeight: imageData.height,
        charset: fullConfig.charset.type || 'custom',
        matrixSize: fullConfig.matrixSize,
        font: fullConfig.font,
        charsetSize: charDataMap.size,
        duration
      }
    );
    
    return result;
  } catch (error) {
    if (error instanceof UnicodeArtError) {
      throw error;
    }
    
    throw new UnicodeArtError(
      `图片转字符画失败: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.INTERNAL_ERROR,
      { originalError: error }
    );
  }
}

/**
 * 🟢 验证配置参数
 * 
 * 🔹 检查配置参数的有效性，并应用默认值。
 * 🔹 返回完整的配置对象。
 * 
 * @param config - 用户提供的配置（可能不完整）
 * @returns ArtConfig 完整的配置对象
 * 
 * @example
 * ```typescript
 * const validConfig = validateConfig({
 *   height: 20,
 *   matrixSize: 6
 * });
 * // 返回包含所有默认值的完整配置
 * ```
 * 
 * @throws {UnicodeArtError} 当配置参数无效时
 */
export function validateConfig(
  config: Partial<ArtConfig>
): ArtConfig {
  // 🔹 从DEFAULT_CONFIG开始
  const fullConfig: ArtConfig = {
    matrixSize: config.matrixSize || 6,
    ratio: config.ratio || 2.0,
    interpolation: config.interpolation || Interpolation.BILINEAR,
    charset: config.charset || { type: PresetCharset.ASCII },
    font: config.font,
    fontStyle: config.fontStyle,
    fontReduce: config.fontReduce !== undefined ? config.fontReduce : 0,
    charSpace: config.charSpace !== undefined ? config.charSpace : 1,
    textAlign: config.textAlign || TextAlign.LEFT,
    lineSpacing: config.lineSpacing !== undefined ? config.lineSpacing : 0,
    heightMode: config.heightMode || HeightMode.LINE,
    outputFormat: config.outputFormat || OutputFormat.PLAIN_TEXT,
    invert: config.invert !== undefined ? config.invert : false,
    trimTrailingSpaces: config.trimTrailingSpaces !== undefined ? config.trimTrailingSpaces : false,
    box: config.box !== undefined ? config.box : false,
    wideCharRatio: config.wideCharRatio !== undefined ? config.wideCharRatio : 2.0,
    enableEarlyTermination: config.enableEarlyTermination !== undefined ? config.enableEarlyTermination : true,
    maxParallelTasks: config.maxParallelTasks !== undefined ? config.maxParallelTasks : 0
  };
  
  // 🔹 处理height和width
  if (config.height) {
    if (config.height <= 0) {
      throw new UnicodeArtError(
        'height必须大于0',
        ErrorCode.INVALID_CONFIG,
        { height: config.height }
      );
    }
    fullConfig.height = config.height;
  }
  
  if (config.width) {
    if (config.width <= 0) {
      throw new UnicodeArtError(
        'width必须大于0',
        ErrorCode.INVALID_CONFIG,
        { width: config.width }
      );
    }
    fullConfig.width = config.width;
  }
  
  // 🔹 至少指定一个维度
  if (!fullConfig.height && !fullConfig.width) {
    throw new UnicodeArtError(
      '必须指定height或width至少一个',
      ErrorCode.INVALID_CONFIG,
      { config }
    );
  }
  
  // 🔹 验证matrixSize
  if (fullConfig.matrixSize < 2 || fullConfig.matrixSize > 20) {
    throw new UnicodeArtError(
      'matrixSize必须在2-20之间',
      ErrorCode.INVALID_CONFIG,
      { matrixSize: fullConfig.matrixSize }
    );
  }
  
  // 🔹 验证ratio
  if (fullConfig.ratio < 1.0 || fullConfig.ratio > 3.0) {
    throw new UnicodeArtError(
      'ratio必须在1.0-3.0之间',
      ErrorCode.INVALID_CONFIG,
      { ratio: fullConfig.ratio }
    );
  }
  
  // 🔹 验证wideCharRatio
  if (
    fullConfig.wideCharRatio !== undefined &&
    (fullConfig.wideCharRatio <= 0 || fullConfig.wideCharRatio > 10)
  ) {
    throw new UnicodeArtError(
      'wideCharRatio必须在0-10之间',
      ErrorCode.INVALID_CONFIG,
      { wideCharRatio: fullConfig.wideCharRatio }
    );
  }

  try {
    normalizeBoxConfig(fullConfig.box);
  } catch (error) {
    throw new UnicodeArtError(
      `box配置无效: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.INVALID_CONFIG,
      { box: fullConfig.box }
    );
  }
  
  return fullConfig;
}

//#endregion

//#region 🟦 工具函数导出

/**
 * 🟢 判断字符是否为宽字符
 * 
 * 🔹 根据Unicode标准判断字符宽度。
 * 
 * @param char - 要判断的字符
 * @returns boolean true表示宽字符
 * 
 * @example
 * ```typescript
 * isWideChar('A');    // false
 * isWideChar('中');   // true
 * isWideChar('あ');   // true
 * ```
 */
export function isWideChar(char: string): boolean {
  return detectWideChar(char);
}

/**
 * 🟢 获取预定义字符集
 * 
 * 🔹 根据类型返回对应的字符字符串。
 * 
 * @param type - 字符集类型
 * @returns string 字符字符串
 * 
 * @example
 * ```typescript
 * const chars = getPresetChars(PresetCharset.ASCII);
 * console.log(chars); // ' .:-=+*#%@'
 * ```
 */
export function getPresetChars(type: PresetCharset): string {
  switch (type) {
    case PresetCharset.ASCII:
      return DEFAULT_ASCII_CHARS;
    case PresetCharset.EXTENDED:
      return EXTENDED_CHARS;
    case PresetCharset.CHINESE_SIMPLE:
      return CHINESE_SIMPLE_CHARS;
    default:
      throw new UnicodeArtError(
        `不支持的字符集类型: ${type}`,
        ErrorCode.UNSUPPORTED_FORMAT,
        { type }
      );
  }
}

/**
 * 🟢 计算文本的显示宽度
 * 
 * 🔹 考虑宽字符的影响，计算文本在终端中的实际显示宽度。
 * 
 * @param text - 要计算的文本
 * @returns number 显示宽度（字符单位）
 * 
 * @example
 * ```typescript
 * const width = calculateDisplayWidth('Hello世界');
 * console.log(width); // 9 (5个ASCII + 2×2个宽字符)
 * ```
 */
export function calcDisplayWidth(text: string): number {
  return calculateDisplayWidth(text);
}

//#endregion

//#region 🟦 版本信息

/**
 * 🟢 库版本号
 * 
 * @constant {string} VERSION
 */
export const VERSION = '1.0.0';

//#endregion
