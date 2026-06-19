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
import { loadImage, renderTextToImage, invertPixels } from './preprocessor';
import { generateSamplingArray } from './sampler';
import { loadFont, precomputeCharData } from './charRenderer';
import { batchMatch } from './matcher';
import { assembleOutput } from './assembler';
import { isWideChar as detectWideChar, calculateDisplayWidth } from './utils/wideCharDetector';

export {
  loadImage,
  renderTextToImage,
  rgbToGrayscale,
  rgbaToGrayscale,
  resizeImage,
  normalizePixels,
  invertPixels
} from './preprocessor';

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
  assembleOutput
} from './assembler';

export {
  calculateDisplayWidth,
  detectWideCharsInText
} from './utils/wideCharDetector';

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
    
    // 🔹 处理多行文本
    const lines = text.split('\n');
    const lineCount = lines.length;
    const resolvedFont = await loadFont(fullConfig.font || 'Arial', fullConfig.fontStyle);
    
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
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createCanvas } = require('canvas');
      const tempCanvas = createCanvas(1, 1);
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.font = `${fontSize}px ${formatCanvasFontFamily(resolvedFont)}`;
      
      // 找出最宽的一行
      let maxWidth = 0;
      for (const line of lines) {
        const lineWidth = Array.from(line).reduce((sum, char) => {
          const measuredWidth = tempCtx.measureText(char).width;
          const charWidth = fontSize < 8 ? Math.round(measuredWidth) : Math.ceil(measuredWidth);
          return sum + charWidth + fontReduce * 2;
        }, 0);
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
    
    
    let imageData = await renderTextToImage(
      text,
      resolvedFont,
      fontSize,
      canvasWidth,
      canvasHeight,
      fullConfig.textAlign,
      fullConfig.lineSpacing,
      fullConfig.heightMode,
      fontReduce,
      rectunit,
      lineSpacingPixels
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
    const charDataMap = await precomputeCharData(
      fullConfig.charset,
      fullConfig.matrixSize,
      resolvedFont,
      fullConfig.matrixSize, // ← 修正：使用matrixSize而不是fontSize
      0, // Python get_char_data does not apply fontreduce to character templates
      fullConfig.interpolation,
      fullConfig.ratio,
      fullConfig.fontStyle
    );

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
    const imageData = await loadImage(imagePath);
    
    // 🔹 反转像素（如果启用）
    let processedImage = imageData;
    if (fullConfig.invert) {
      processedImage = { ...imageData, data: invertPixels(imageData.data) };
    }
    
    // 🔹 生成采样数组
    const samplingArray = generateSamplingArray(processedImage, fullConfig);
    
    // 🔹 预计算字符数据
    const charDataMap = await precomputeCharData(
      fullConfig.charset,
      fullConfig.matrixSize,
      fullConfig.font || 'Arial',
      fullConfig.matrixSize,
      0, // Python get_char_data does not apply fontreduce to character templates
      fullConfig.interpolation,
      fullConfig.ratio,
      fullConfig.fontStyle
    );
    
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

function formatCanvasFontFamily(font: string): string {
  const escapedFont = font.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escapedFont}"`;
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
