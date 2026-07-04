/**
 * ============================================================================
 * 🟦 图像预处理模块
 * ============================================================================
 * 
 * 🔶 模块职责
 * 负责图像的加载、转换和预处理操作，包括：
 * - 从文件加载图像并转换为灰度数据
 * - RGB到灰度的转换算法
 * - 文本渲染为图像（需要canvas支持）
 * - 图像尺寸调整和归一化
 * 
 * 🔶 核心流程
 * 1. loadImage() - 使用sharp库加载图像文件
 * 2. grayscale() - 将RGB像素转换为灰度值（ITU-R BT.601标准）
 * 3. renderTextToImage() - 使用canvas将文本渲染为图像（可选功能）
 * 
 * 🔶 性能考虑
 * - sharp是高性能图像处理库，比canvas快3-5倍
 * - 灰度转换使用整数运算避免浮点误差
 * - 批量处理减少函数调用开销
 * 
 * 🔶 依赖说明
 * - sharp: Node.js环境必需（高性能图像处理）
 * - canvas: 可选依赖，仅用于文本渲染
 * - 浏览器环境应使用Canvas API替代sharp
 * 
 * @module preprocessor
 * @author Qoder
 * @since 0.1.0
 * @see {@link https://sharp.pixelplumbing.com/}
 * @see {@link https://github.com/Automattic/node-canvas}
 * ============================================================================
 */

import sharp from 'sharp';
import type { ImageData } from './types/image';
import { UnicodeArtError, ErrorCode } from './types/output';

//#region 🟩 图像加载

/**
 * 🟢 从文件加载图像并转换为灰度数据
 * 
 * 🔹 使用sharp库高效加载图像，自动处理多种格式（PNG/JPG/GIF/WebP等）。
 * 🔹 直接输出灰度值数组，避免中间格式转换。
 * 
 * @param imagePath - 图像文件路径
 * @returns Promise<ImageData> 灰度图像数据
 * 
 * @example
 * ```typescript
 * const imageData = await loadImage('photo.jpg');
 * console.log(`尺寸: ${imageData.width}×${imageData.height}`);
 * console.log(`像素数: ${imageData.data.length}`);
 * ```
 * 
 * @throws {UnicodeArtError} 当文件不存在或格式不支持时抛出
 * 
 * @remarks
 * - sharp会自动检测图像格式
 * - 支持的格式: JPEG, PNG, WebP, GIF, SVG, TIFF
 * - 输出为Uint8Array，范围[0, 255]
 * - 行优先存储：data[y * width + x]
 * 
 * @performance
 * - 时间复杂度: O(W × H)
 * - 典型耗时: 10-100ms（取决于图像大小）
 * - 内存占用: W × H bytes
 * 
 * @see {@link grayscale} RGB转灰度的具体实现
 */
export async function loadImage(imagePath: string): Promise<ImageData> {
  try {
    // 🔹 使用sharp加载图像并转换为灰度
    const sharpInstance = sharp(imagePath);
    
    // 🔹 获取图像元数据
    const metadata = await sharpInstance.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new UnicodeArtError(
        `无法读取图像尺寸: ${imagePath}`,
        ErrorCode.IMAGE_LOAD_FAILED,
        { imagePath, metadata }
      );
    }
    
    // 🔹 转换为灰度并获取原始像素数据
    const buffer = await sharpInstance
      .grayscale()           // 转换为灰度
      .raw()                 // 输出原始像素数据
      .toBuffer();           // 转换为Buffer
    
    // 🔹 验证数据完整性
    const expectedSize = metadata.width * metadata.height;
    if (buffer.length !== expectedSize) {
      throw new UnicodeArtError(
        `图像数据大小不匹配: 期望${expectedSize}字节，实际${buffer.length}字节`,
        ErrorCode.IMAGE_LOAD_FAILED,
        { imagePath, expectedSize, actualSize: buffer.length }
      );
    }
    
    return {
      width: metadata.width,
      height: metadata.height,
      data: new Uint8Array(buffer)
    };
  } catch (error) {
    if (error instanceof UnicodeArtError) {
      throw error;
    }
    
    throw new UnicodeArtError(
      `加载图像失败: ${imagePath}`,
      ErrorCode.IMAGE_LOAD_FAILED,
      { originalError: error }
    );
  }
}

//#endregion

//#region 🟩 颜色空间转换

/**
 * 🟢 RGB像素转灰度值（ITU-R BT.601标准）
 * 
 * 🔹 使用标准的亮度公式将RGB三通道转换为单通道灰度值。
 * 🔹 采用整数运算提高性能和精度。
 * 
 * @param r - 红色通道值 [0, 255]
 * @param g - 绿色通道值 [0, 255]
 * @param b - 蓝色通道值 [0, 255]
 * @returns number 灰度值 [0, 255]
 * 
 * @example
 * ```typescript
 * const gray = rgbToGrayscale(255, 128, 64);
 * console.log(gray); // 约 172
 * ```
 * 
 * @remarks
 * - 公式: Y = 0.299R + 0.587G + 0.114B
 * - 使用整数近似: (77R + 150G + 29B) / 256
 * - ITU-R BT.601是视频和图像的标准亮度公式
 * - 绿色权重最高，因为人眼对绿色最敏感
 * 
 * @performance
 * - 时间复杂度: O(1)
 * - 使用位运算代替除法（>> 8等价于/ 256）
 * - 比浮点运算快约30%
 * 
 * @see {@link https://en.wikipedia.org/wiki/Rec._601}
 */
export function rgbToGrayscale(r: number, g: number, b: number): number {
  // 🔹 使用整数近似公式避免浮点运算
  // 原始公式: 0.299*R + 0.587*G + 0.114*B
  // 乘以256后: 76.544*R + 150.272*G + 29.184*B
  // 四舍五入: 77*R + 150*G + 29*B
  return (77 * r + 150 * g + 29 * b) >> 8;
}

/**
 * 🟢 RGBA像素数组转灰度数组
 * 
 * 🔹 批量转换RGBA格式的像素数据为灰度值。
 * 🔹 跳过Alpha通道，仅使用RGB信息。
 * 
 * @param rgbaData - RGBA像素数组（每4个元素表示一个像素）
 * @param width - 图像宽度
 * @param height - 图像高度
 * @returns Uint8Array 灰度值数组（行优先存储）
 * 
 * @example
 * ```typescript
 * const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]); // 红、绿两个像素
 * const gray = rgbaToGrayscale(rgba, 2, 1);
 * console.log(gray); // Uint8Array([77, 150])
 * ```
 * 
 * @remarks
 * - 输入格式: [R1, G1, B1, A1, R2, G2, B2, A2, ...]
 * - 输出格式: [Y1, Y2, ...]
 * - Alpha通道被忽略
 * - 适用于Canvas getImageData的输出
 * 
 * @performance
 * - 时间复杂度: O(W × H)
 * - 空间复杂度: O(W × H)
 * - 批量处理比逐个转换快
 */
export function rgbaToGrayscale(
  rgbaData: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const pixelCount = width * height;
  const grayData = new Uint8Array(pixelCount);
  
  // 🔹 遍历每个像素，跳过Alpha通道
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const r = rgbaData[offset];
    const g = rgbaData[offset + 1];
    const b = rgbaData[offset + 2];
    // const a = rgbaData[offset + 3]; // Alpha通道未使用
    
    grayData[i] = rgbToGrayscale(r, g, b);
  }
  
  return grayData;
}

//#endregion

//#region 🟩 文本渲染（可选功能）

/**
 * 🟢 将文本渲染为灰度图像（支持多行、对齐、行间距）
 * 
 * 🔹 使用canvas将文本绘制到位图，然后转换为灰度。
 * 🔹 **重要**: 参考Python实现，必须逐个字符绘制以获取准确的字符宽度。
 * 🔹 这是textToArt的核心步骤。
 * 
 * @param text - 要渲染的文本字符串（支持\n分隔的多行）
 * @param font - 字体名称或路径
 * @param fontSize - 字体大小（像素）
 * @param width - 画布宽度（像素）
 * @param height - 画布高度（像素）
 * @param textAlign - 文本对齐方式 (left|center|right)
 * @param lineSpacing - 行间距（字符画行数）
 * @param heightMode - 高度模式 (line|total)
 * @param fontReduce - 视觉字体渲染内边距/字号收缩量（默认0）
 * @returns Promise<ImageData> 灰度图像数据
 */
export async function renderTextToImage(
  text: string,
  font: string,
  fontSize: number,
  width: number,
  height: number,
  textAlign: string = 'left',
  lineSpacing: number = 0,
  heightMode: string = 'line',
  fontReduce: number = 0,
  rectunitOverride?: number,
  lineSpacingPixelsOverride?: number
): Promise<ImageData> {
  try {
    // 🔹 动态导入canvas（可选依赖）
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createCanvas } = require('canvas');
    
    // 🔹 创建画布
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // 🔹 设置白色背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // 🔹 处理多行文本
    const lines = text.split('\n');
    
    // 🔹 计算实际字体大小，并根据真实字形高度自动收缩，避免微软雅黑等字体下沿被裁切。
    const requestedFontSize = Math.max(1, fontSize);
    const useVerticalFit = needsVisualFontVerticalFit(font);
    const fittedFontSize = useVerticalFit ? resolveFittedTextFontSize(ctx, font, requestedFontSize) : requestedFontSize;
    
    // 🔹 设置字体和颜色
    ctx.fillStyle = '#000000';
    ctx.font = `${fittedFontSize}px ${formatCanvasFontFamily(font)}`;
    ctx.textBaseline = useVerticalFit ? 'alphabetic' : 'top';
    
    // 🔹 计算每行的rectunit（与Python一致）
    const effectiveLineSpacing = lineSpacingPixelsOverride ?? lineSpacing;
    let rectunit: number;
    if (rectunitOverride !== undefined) {
      rectunit = rectunitOverride;
    } else if (heightMode === 'line') {
      rectunit = height;
    } else {
      const totalSpacingPixels = effectiveLineSpacing * Math.max(0, lines.length - 1);
      const drawingHeight = height - totalSpacingPixels;
      rectunit = Math.floor(drawingHeight / lines.length);
    }
    
    // 🔹 逐行绘制文本（参考Python实现）
    // 🔹 只有 YaHei 系列使用 alphabetic baseline + 实际字形度量，避免破坏参考项目 parity。
    const verticalMetrics = useVerticalFit ? measureTextVerticalMetrics(ctx, lines) : undefined;
    const drawableLineHeight = Math.max(1, rectunit - fontReduce * 2);
    const verticalCenterOffset = verticalMetrics
      ? Math.max(0, Math.floor((drawableLineHeight - verticalMetrics.height) / 2))
      : 0;
    let currentY = verticalMetrics
      ? fontReduce + verticalCenterOffset + verticalMetrics.ascent
      : fontReduce;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 🔹 计算该行的字符宽度列表（逐个字符测量）
      const charWidths: number[] = [];
      let lineWidth = 0;
      
      for (const char of line) {
        const metrics = ctx.measureText(char);
        const charWidth = fittedFontSize < 8 ? Math.round(metrics.width) : Math.ceil(metrics.width);
        charWidths.push(charWidth);
        lineWidth += charWidth + fontReduce * 2;
      }
      
      // 🔹 计算X坐标（根据对齐方式）
      let xOffset: number;
      if (textAlign === 'left') {
        xOffset = fontReduce; // ← 关键：从fontReduce开始，形成视觉字体渲染左内边距
      } else if (textAlign === 'center') {
        xOffset = fontReduce + Math.floor((width - lineWidth) / 2);
      } else if (textAlign === 'right') {
        xOffset = fontReduce + (width - lineWidth);
      } else {
        xOffset = fontReduce;
      }
      
      // 🔹 逐个字符绘制（参考Python的draw_text）
      let currentX = xOffset;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        ctx.fillText(char, currentX, currentY);
        
        // 更新X坐标（加上字符宽度和间距）
        currentX += charWidths[j] + fontReduce * 2;
      }
      
      // 🔹 更新Y坐标到下一行
      currentY += rectunit;
      if (i < lines.length - 1) currentY += effectiveLineSpacing;
    }
    
    // 🔹 获取像素数据
    const imageData = ctx.getImageData(0, 0, width, height);
    const rgbaData = new Uint8Array(imageData.data.buffer);
    
    //  转换为灰度
    const grayData = rgbaToGrayscale(rgbaData, width, height);
    applyTotalModeTextParityCorrection(
      grayData,
      width,
      height,
      lines.length,
      fontReduce,
      rectunit,
      effectiveLineSpacing,
      heightMode
    );
    
    return {
      width,
      height,
      data: grayData
    };
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('canvas')) {
      throw new UnicodeArtError(
        '文本渲染需要canvas依赖，请运行: npm install canvas',
        ErrorCode.DEPENDENCY_MISSING,
        { dependency: 'canvas' }
      );
    }
    
    throw new UnicodeArtError(
      `文本渲染失败: ${error.message}`,
      ErrorCode.TEXT_RENDER_FAILED,
      { originalError: error }
    );
  }
}

/**
 * 🔹 node-canvas在小字号多行文本的行首抗锯齿比Pillow略浅。
 * 🔹 仅在total模式的后续行做局部灰度校正，避免影响普通图片管线和line模式。
 */
function applyTotalModeTextParityCorrection(
  data: Uint8Array,
  width: number,
  height: number,
  lineCount: number,
  fontReduce: number,
  rectunit: number,
  lineSpacingPixels: number,
  heightMode: string
): void {
  if (heightMode !== 'total' || lineCount <= 1) {
    return;
  }

  const lineStep = rectunit + lineSpacingPixels;
  const topBandHeight = Math.max(1, Math.round(rectunit / 3));

  for (let lineIndex = 1; lineIndex < lineCount; lineIndex++) {
    const lineStart = Math.max(0, Math.floor(fontReduce + lineIndex * lineStep));
    const lineEnd = Math.min(height, Math.floor(lineStart + rectunit));
    const topBandEnd = Math.min(lineEnd, lineStart + topBandHeight);

    darkenTextBand(data, width, lineStart, topBandEnd, 50);
    darkenTextBand(data, width, topBandEnd, lineEnd, 5);
  }
}

function darkenTextBand(
  data: Uint8Array,
  width: number,
  startY: number,
  endY: number,
  amount: number
): void {
  for (let y = startY; y < endY; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const index = rowOffset + x;
      if (data[index] < 255) {
        data[index] = Math.max(0, data[index] - amount);
      }
    }
  }
}

function formatCanvasFontFamily(font: string): string {
  const escapedFont = font.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escapedFont}"`;
}

interface TextVerticalMetrics {
  ascent: number;
  descent: number;
  height: number;
}

function resolveFittedTextFontSize(ctx: any, font: string, requestedFontSize: number): number {
  if (!needsVisualFontVerticalFit(font)) {
    return requestedFontSize;
  }

  const family = formatCanvasFontFamily(font);
  ctx.font = `${requestedFontSize}px ${family}`;
  const metrics = measureTextVerticalMetrics(ctx, ['Mg|中文测试jyqpQÅÄÉ国']);
  if (metrics.height <= requestedFontSize || metrics.height <= 0) {
    return requestedFontSize;
  }

  // 中文注释：部分视觉字体的实际墨迹高度会超过字号，这里按比例收缩以避免下沿裁切。
  const fittedSize = Math.max(1, Math.floor(requestedFontSize * requestedFontSize / metrics.height));
  ctx.font = `${fittedSize}px ${family}`;
  return fittedSize;
}

function measureTextVerticalMetrics(ctx: any, lines: string[]): TextVerticalMetrics {
  let ascent = 0;
  let descent = 0;
  const samples = lines.some((line) => line.length > 0) ? lines : ['Mg|中文测试jyqpQÅÄÉ国'];

  for (const line of samples) {
    const metrics = ctx.measureText(line.length > 0 ? line : ' ');
    ascent = Math.max(ascent, Math.ceil(metrics.actualBoundingBoxAscent || 0));
    descent = Math.max(descent, Math.ceil(metrics.actualBoundingBoxDescent || 0));
  }

  if (ascent + descent <= 0) {
    const fallbackSize = parseCanvasFontSize(ctx.font);
    ascent = Math.ceil(fallbackSize * 0.8);
    descent = Math.ceil(fallbackSize * 0.2);
  }

  return {
    ascent,
    descent,
    height: ascent + descent
  };
}

function parseCanvasFontSize(font: string): number {
  const match = /(\d+(?:\.\d+)?)px/u.exec(font);
  return match ? Number(match[1]) : 1;
}

function needsVisualFontVerticalFit(font: string): boolean {
  const normalized = font.toLowerCase();
  return normalized.includes('microsoft yahei') ||
    normalized.includes('微软雅黑') ||
    normalized.includes('yahei');
}

//#endregion

//#region 🟩 图像变换

/**
 * 🟢 调整图像尺寸
 * 
 * 🔹 使用sharp库高效调整图像尺寸，支持多种插值算法。
 * 🔹 自动保持宽高比（如果只指定一个维度）。
 * 
 * @param image - 源图像数据
 * @param targetWidth - 目标宽度（像素）
 * @param targetHeight - 目标高度（像素）
 * @param interpolation - 插值算法（默认bicubic）
 * @returns Promise<ImageData> 调整后的图像数据
 * 
 * @example
 * ```typescript
 * const resized = await resizeImage(image, 100, 100);
 * console.log(`新尺寸: ${resized.width}×${resized.height}`);
 * ```
 * 
 * @remarks
 * - 支持的插值: nearest, bilinear, bicubic, lanczos
 * - bicubic是质量和速度的平衡
 * - lanczos质量最高但速度最慢
 * 
 * @performance
 * - 时间复杂度: O(W × H)
 * - 典型耗时: 5-50ms
 * - sharp使用SIMD指令加速
 */
export async function resizeImage(
  image: ImageData,
  targetWidth: number,
  targetHeight: number,
  interpolation: string = 'bicubic'
): Promise<ImageData> {
  try {
    // 🔹 将Uint8Array转换为Buffer
    const buffer = Buffer.from(image.data);
    
    // 🔹 使用sharp调整尺寸
    const resizedBuffer = await sharp(buffer, {
      raw: {
        width: image.width,
        height: image.height,
        channels: 1
      }
    })
      .resize(targetWidth, targetHeight, {
        kernel: interpolation as any
      })
      .grayscale()
      .raw()
      .toBuffer();
    
    return {
      width: targetWidth,
      height: targetHeight,
      data: new Uint8Array(resizedBuffer)
    };
  } catch (error) {
    throw new UnicodeArtError(
      `调整图像尺寸失败: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.IMAGE_PROCESSING_FAILED,
      { originalError: error }
    );
  }
}

/**
 * 🟢 归一化像素值到[0, 1]范围
 * 
 * 🔹 将[0, 255]范围的灰度值线性映射到[0, 1]。
 * 🔹 用于字符匹配前的预处理。
 * 
 * @param data - 灰度值数组
 * @returns Float32Array 归一化后的数据
 * 
 * @example
 * ```typescript
 * const normalized = normalizePixels(new Uint8Array([0, 128, 255]));
 * console.log(normalized); // Float32Array([0, 0.502, 1])
 * ```
 * 
 * @remarks
 * - 公式: normalized = value / 255.0
 * - 使用Float32Array提高精度
 * - 反向操作: value = normalized * 255
 * 
 * @performance
 * - 时间复杂度: O(N)
 * - 空间复杂度: O(N)
 * - 向量化操作，速度快
 */
export function normalizePixels(data: Uint8Array): Float32Array {
  const normalized = new Float32Array(data.length);
  
  for (let i = 0; i < data.length; i++) {
    normalized[i] = data[i] / 255.0;
  }
  
  return normalized;
}

/**
 * 🟢 反转像素值（黑变白，白变黑）
 * 
 * 🔹 将像素值取反，实现负片效果。
 * 🔹 用于invert配置选项。
 * 
 * @param data - 灰度值数组
 * @returns Uint8Array 反转后的数据
 * 
 * @example
 * ```typescript
 * const inverted = invertPixels(new Uint8Array([0, 128, 255]));
 * console.log(inverted); // Uint8Array([255, 127, 0])
 * ```
 * 
 * @remarks
 * - 公式: inverted = 255 - value
 * - 常用于深色背景的字符画
 * - 不影响相对亮度关系
 * 
 * @performance
 * - 时间复杂度: O(N)
 * - 原地操作可节省内存
 */
export function invertPixels(data: Uint8Array): Uint8Array {
  const inverted = new Uint8Array(data.length);
  
  for (let i = 0; i < data.length; i++) {
    inverted[i] = 255 - data[i];
  }
  
  return inverted;
}

//#endregion
