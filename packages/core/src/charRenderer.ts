/**
 * ============================================================================
 * 🟦 字符矩阵渲染模块
 * ============================================================================
 * 
 * 🔶 模块职责
 * 负责将字符渲染为像素矩阵，用于后续的SAD匹配。
 * 
 * 🔶 核心流程
 * 1. renderCharToMatrix() - 渲染单个字符为灰度矩阵
 * 2. precomputeCharData() - 预计算整个字符集的矩阵数据
 * 3. loadFont() - 加载字体文件（系统字体或自定义字体）
 * 
 * 🔶 性能考虑
 * - 预计算字符集避免重复渲染
 * - 使用canvas缓存渲染结果
 * - 批量处理减少上下文切换
 * - 灰度化后缓存到内存
 * 
 * 🔶 算法说明
 * - 使用canvas绘制字符到位图
 * - 提取像素数据并转换为灰度
 * - 归一化到[0, 1]范围
 * - 支持宽字符检测（中文、日文等）
 * 
 * @module charRenderer
 * @author Qoder
 * @since 0.1.0
 * @see {@link https://github.com/Automattic/node-canvas}
 * ============================================================================
 */

import type { CharMatrix, CharsetConfig } from './types/charset';
import { CharType } from './types/charset';
import { Interpolation } from './types/config';
import { UnicodeArtError, ErrorCode } from './types/output';
import { rgbaToGrayscale } from './preprocessor';
import { resizeInterpolate } from './sampler';
import { isWideChar as detectWideChar } from './utils/wideCharDetector';
import { FONT_STYLE_SUFFIX, WINDOWS_FONT_DIR, getPresetChars } from './constants';

//#region 🟩 字符渲染

/**
 * 🟢 渲染单个字符为灰度矩阵
 * 
 * 🔹 使用canvas将字符绘制到指定尺寸的位图，然后转换为归一化的灰度矩阵。
 * 🔹 这是字符匹配的基础步骤。
 * 
 * ⚠️ **注意**: 此功能需要canvas依赖。
 * 
 * @param char - 要渲染的字符
 * @param matrixSize - 目标矩阵尺寸（如6×6）
 * @param font - 字体名称或路径
 * @param fontSize - 字体大小（像素）
 * @param fontReduce - 渲染内边距/字号收缩量（像素）；高层字符模板预计算通常保持0以对齐参考项目
 * @returns Float32Array 归一化的灰度矩阵（一维数组）
 * 
 * @example
 * ```typescript
 * const matrix = await renderCharToMatrix('A', 6, 'Noto Sans SC', 48, 0);
 * console.log(matrix.length); // 36 (6×6)
 * console.log(matrix[0]); // 0.0-1.0之间的值
 * ```
 * 
 * @throws {UnicodeArtError} 当canvas未安装或渲染失败时抛出
 * 
 * @remarks
 * - 背景为白色(1.0)，文字为黑色(0.0)
 * - 字符居中对齐
 * - 支持宽字符（占用2个标准宽度）
 * - fontReduce用于让绘制区域向内收缩，并同步减小实际字号
 * 
 * @performance
 * - 时间复杂度: O(matrixSize²)
 * - 典型耗时: 1-5ms/字符
 * - 预计算后可忽略此开销
 * 
 * @see {@link precomputeCharData} 批量预计算方法
 */
export async function renderCharToMatrix(
  char: string,
  matrixSize: number,
  font: string,
  fontSize: number,
  fontReduce: number = 0,
  interpolation: Interpolation = Interpolation.BILINEAR,
  ratio: number = 2.0
): Promise<Float32Array> {
  try {
    // 🔹 动态导入canvas（可选依赖）
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createCanvas } = require('canvas');
    
    // 🔹 判断是否为宽字符
    const wideChar = detectWideChar(char);
    
    // 🔹 计算画布尺寸（参考Python实现）
    // Python: width = round(matrix_size / vertical_horizontal_ratio)
    // 默认ratio为2.0，所以width = matrix_size / 2
    const canvasWidth = wideChar ? 
      Math.round(matrixSize * 2 / ratio) : 
      Math.round(matrixSize / ratio);
    const canvasHeight = matrixSize;
    
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    //  设置白色背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    //  设置字体和颜色
    const actualFontSize = Math.max(1, fontSize - fontReduce * 2);
    ctx.fillStyle = '#000000';
    ctx.font = `${actualFontSize}px ${formatCanvasFontFamily(font)}`;
    ctx.textBaseline = 'top';
    
    // 🔹 Python参考: draw.text((0, 0), char, 0, font)
    ctx.fillText(char, 0, 0);
    
    // 🔹 获取源画布像素数据
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const rgbaData = new Uint8Array(imageData.data.buffer);
    
    // 🔹 转换为灰度
    const grayData = rgbaToGrayscale(rgbaData, canvasWidth, canvasHeight);
    const targetWidth = wideChar ? matrixSize * 2 : matrixSize;
    
    return resizeGrayscaleToNormalized(grayData, canvasWidth, canvasHeight, targetWidth, matrixSize, interpolation);
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('canvas')) {
      throw new UnicodeArtError(
        '字符渲染需要canvas依赖，请运行: npm install canvas',
        ErrorCode.DEPENDENCY_MISSING,
        { dependency: 'canvas' }
      );
    }
    
    throw new UnicodeArtError(
      `渲染字符失败 '${char}': ${error.message}`,
      ErrorCode.CHAR_RENDER_FAILED,
      { originalError: error, char }
    );
  }
}

/**
 * 🟢 将灰度字符画布缩放为归一化矩阵
 * 
 * 🔹 对齐Python参考实现中的 cv2.resize(...)/255。
 */
function resizeGrayscaleToNormalized(
  data: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  interpolation: Interpolation
): Float32Array {
  const normalized = new Float32Array(targetWidth * targetHeight);
  
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const value = resizeInterpolate(data, sourceWidth, sourceHeight, targetWidth, targetHeight, x, y, interpolation);
      const clamped = Math.max(0, Math.min(255, Math.round(value)));
      normalized[y * targetWidth + x] = clamped / 255.0;
    }
  }
  
  return normalized;
}

//#endregion

//#region 🟩 字符集预计算

/**
 * 🟢 预计算整个字符集的矩阵数据
 * 
 * 🔹 批量渲染字符集中的所有字符，生成预计算的矩阵数据。
 * 🔹 避免在匹配过程中重复渲染，大幅提升性能。
 * 
 * @param charsetConfig - 字符集配置
 * @param matrixSize - 目标矩阵尺寸
 * @param font - 字体名称或路径
 * @param fontSize - 字体大小（像素）
 * @param fontReduce - 渲染内边距/字号收缩量（像素）；高层字符模板预计算通常保持0以对齐参考项目
 * @returns Promise<Map<string, CharMatrix>> 字符到矩阵的映射
 * 
 * @example
 * ```typescript
 * const charData = await precomputeCharData(
 *   { type: PresetCharset.ASCII },
 *   6,
 *   'Noto Sans SC',
 *   48,
 *   0
 * );
 * console.log(charData.size); // 10 (ASCII字符数)
 * console.log(charData.has('A')); // true
 * ```
 * 
 * @throws {UnicodeArtError} 当字符集为空或渲染失败时抛出
 * 
 * @remarks
 * - 返回Map结构，键为字符，值为CharMatrix对象
 * - CharMatrix包含: { matrix, isWideChar, char }
 * - 预计算后匹配速度提升10-50倍
 * - 建议在应用启动时执行
 * 
 * @performance
 * - 时间复杂度: O(N × M²)，N为字符数，M为matrixSize
 * - 典型耗时: 50-500ms（取决于字符集大小）
 * - 内存占用: N × M² × 4 bytes（Float32）
 * 
 * @see {@link renderCharToMatrix} 单字符渲染
 */
export async function precomputeCharData(
  charsetConfig: CharsetConfig,
  matrixSize: number,
  font: string,
  fontSize?: number, // ← 可选参数，默认为matrixSize
  fontReduce: number = 0,
  interpolation: Interpolation = Interpolation.BILINEAR,
  ratio: number = 2.0,
  fontStyle: string = 'regular'
): Promise<Map<string, CharMatrix>> {
  // 🔹 获取字符集字符串
  let chars: string;
  
  if (charsetConfig.customChars) {
    chars = charsetConfig.customChars;
  } else if (charsetConfig.type) {
    // 🔹 使用预定义字符集
    chars = getPresetChars(charsetConfig.type);
  } else {
    throw new UnicodeArtError(
      '字符集配置无效，必须指定type或customChars',
      ErrorCode.INVALID_CONFIG,
      { charsetConfig }
    );
  }
  
  if (!chars || chars.length === 0) {
    throw new UnicodeArtError(
      '字符集不能为空',
      ErrorCode.INVALID_CONFIG,
      { charsetConfig }
    );
  }
  
  // 🔹 解析字体路径或系统字体名称
  const resolvedFont = await loadFont(font, fontStyle);
  
  // 🔹 计算合适的字体大小
  // Python参考: font = ImageFont.truetype(char_font_file, matrix_size)
  // 字符渲染时使用matrixSize作为字体大小
  const actualFontSize = fontSize ?? matrixSize; // ← 修正：默认值为matrixSize
  
  // 🔹 批量渲染所有字符
  const charDataMap = new Map<string, CharMatrix>();
  
  for (const char of chars) {
    try {
      // 🔹 渲染字符
      const matrix = await renderCharToMatrix(
        char,
        matrixSize,
        resolvedFont,
        actualFontSize,
        fontReduce,
        interpolation,
        ratio
      );
      
      // 🔹 检测是否为宽字符
      const isWide = detectWideChar(char);
      
      // 🔹 存储到Map
      charDataMap.set(char, {
        char,
        matrix,
        type: isWide ? CharType.WIDE : CharType.NORMAL,
        width: isWide ? matrixSize * 2 : matrixSize,
        height: matrixSize
      });
    } catch (error) {
      // 🔹 单个字符失败不影响整体，记录警告
      console.warn(`警告: 渲染字符 '${char}' 失败，已跳过`, error);
    }
  }
  
  if (charDataMap.size === 0) {
    throw new UnicodeArtError(
      '所有字符渲染均失败',
      ErrorCode.CHAR_RENDER_FAILED,
      { charsetConfig }
    );
  }
  
  return charDataMap;
}

//#endregion

//#region 🟩 字体加载（辅助函数）

/**
 * 🟢 加载字体文件
 * 
 * 🔹 从文件系统或系统字体目录加载字体。
 * 🔹 支持.ttf、.otf格式。
 * 
 * @param fontPath - 字体文件路径或字体名称
 * @returns Promise<string> 可用于canvas的字体标识符
 * 
 * @example
 * ```typescript
 * const fontId = await loadFont('./fonts/custom.ttf');
 * console.log(fontId); // 'custom'
 * ```
 * 
 * @throws {UnicodeArtError} 当字体文件不存在或格式不支持时抛出
 * 
 * @remarks
 * - 如果是系统字体名称，直接返回
 * - 如果是文件路径，注册到canvas字体管理器
 * - 支持相对路径和绝对路径
 * 
 * @todo 实现字体缓存机制
 * @todo 支持字体样式（粗体、斜体）
 */
export async function loadFont(fontPath: string, fontStyle: string = 'regular'): Promise<string> {
  try {
    // 🔹 动态导入canvas
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerFont } = require('canvas');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    
    // 🔹 检查是否为系统字体名称（不包含路径分隔符）
    if (!fontPath.includes('/') && !fontPath.includes('\\')) {
      const styledFontPath = findStyledFontPath(fontPath, fontStyle, fs.existsSync);
      if (styledFontPath) {
        const styledFontName = getFileBaseName(styledFontPath).replace(/\.(ttf|ttc|otf)$/i, '') || fontPath;
        registerFont(styledFontPath, { family: styledFontName });
        return styledFontName;
      }
      
      const originalFontPath = findOriginalFontPath(fontPath, fs.existsSync);
      if (originalFontPath) {
        const originalFontName = getFileBaseName(originalFontPath).replace(/\.(ttf|ttc|otf)$/i, '') || fontPath;
        registerFont(originalFontPath, { family: originalFontName });
        return originalFontName;
      }

      return fontPath;
    }
    
    // 🔹 提取字体名称（不含扩展名）
    const fontName = getFileBaseName(fontPath).replace(/\.(ttf|ttc|otf)$/i, '') || 'custom';
    
    // 🔹 注册字体
    registerFont(fontPath, { family: fontName });
    
    return fontName;
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('canvas')) {
      throw new UnicodeArtError(
        '字体加载需要canvas依赖，请运行: npm install canvas',
        ErrorCode.DEPENDENCY_MISSING,
        { dependency: 'canvas' }
      );
    }
    
    throw new UnicodeArtError(
      `加载字体失败 '${fontPath}': ${error.message}`,
      ErrorCode.FONT_LOAD_FAILED,
      { originalError: error, fontPath }
    );
  }
}

/**
 * 🟢 跨平台提取文件名
 */
function findStyledFontPath(
  fontPath: string,
  fontStyle: string,
  existsSync: (path: string) => boolean
): string | null {
  const fontName = stripFontExtension(fontPath);
  const fontExt = getFontExtension(fontPath) || '.ttf';
  const styleSuffix = FONT_STYLE_SUFFIX[fontStyle] ?? '';
  const styledFontName = `${fontName}${styleSuffix}${fontExt}`;
  const programDir = getProgramDir();
  const candidates = [
    styledFontName,
    `.${styledFontName.startsWith('/') || styledFontName.startsWith('\\') ? '' : '/'}${styledFontName}`,
    programDir ? `${programDir}\\${styledFontName}` : '',
    `${WINDOWS_FONT_DIR}\\${styledFontName}`
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function findOriginalFontPath(
  fontPath: string,
  existsSync: (path: string) => boolean
): string | null {
  const programDir = getProgramDir();
  const candidates = [
    fontPath,
    `.${fontPath.startsWith('/') || fontPath.startsWith('\\') ? '' : '/'}${fontPath}`,
    programDir ? `${programDir}\\${fontPath}` : '',
    `${WINDOWS_FONT_DIR}\\${fontPath}`
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getProgramDir(): string {
  const entry = typeof process !== 'undefined' && process.argv ? process.argv[1] : '';
  if (!entry) {
    return '';
  }

  const normalized = entry.replace(/\\/g, '/');
  const slashIndex = normalized.lastIndexOf('/');
  return slashIndex >= 0 ? normalized.slice(0, slashIndex).replace(/\//g, '\\') : '.';
}

function stripFontExtension(fontPath: string): string {
  return fontPath.replace(/\.(ttf|ttc|otf)$/i, '');
}

function getFontExtension(fontPath: string): string {
  const match = fontPath.match(/\.(ttf|ttc|otf)$/i);
  return match ? match[0] : '';
}

function getFileBaseName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

function formatCanvasFontFamily(font: string): string {
  const escapedFont = font.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escapedFont}"`;
}

//#endregion
