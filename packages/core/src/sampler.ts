/**
 * ============================================================================
 * 🟦 采样数组生成模块
 * ============================================================================
 * 
 * 🔶 模块职责
 * 负责将源图像分割为多个采样块，并对每个块进行缩放和归一化处理。
 * 
 * 🔶 核心流程
 * 1. calculateOutputSize() - 根据配置计算输出尺寸
 * 2. calculateBlockSize() - 计算每个采样块的源图像尺寸
 * 3. generateSamplingArray() - 遍历图像生成采样数组
 * 4. extractBlock() - 提取单个图像块（含边界填充）
 * 5. resizeAndNormalize() - 缩放到目标尺寸并归一化
 * 
 * 🔶 性能考虑
 * - 使用TypedArray避免GC压力
 * - 批量处理减少函数调用开销
 * - 边界填充用白色(255)保持一致性
 * - 预分配内存减少动态扩容
 * 
 * 🔶 算法说明
 * - 块尺寸计算公式: blockH = ceil(sourceHeight / outputHeight)
 * - 不足部分用白色(255)填充，保持块尺寸一致
 * - 归一化公式: normalizedValue = pixelValue / 255.0
 * 
 * @module sampler
 * @author Qoder
 * @since 0.1.0
 * @see {@link https://github.com/mandolin/UnicodeArt/src/unicodeart/core/sampler.py}
 * ============================================================================
 */

import type { ImageData, SamplingArray, SamplingBlock } from './types/image';
import { Interpolation, type ArtConfig } from './types/config';
import { UnicodeArtError, ErrorCode } from './types/output';

//#region 🟩 尺寸计算

/**
 * 🟢 计算输出尺寸（行数和列数）
 * 
 * 🔹 按Python参考实现，先计算采样块尺寸，再由块尺寸反推实际输出行列数。
 * 
 * @param image - 源图像数据
 * @param config - 艺术生成配置
 * @returns { height: number, width: number } 输出的行数和列数
 * 
 * @example
 * ```typescript
 * const size = calculateOutputSize(image, { height: 20, ratio: 2.0 });
 * console.log(size); // { height: 20, width: 40 }
 * ```
 * 
 * @remarks
 * - 参考Python: _calculate_block_size + _calculate_output_dimensions
 * - 配置的height/width用于计算块尺寸，不强制等于最终输出尺寸
 * - 边界块通过白色填充补齐
 * 
 * @throws {UnicodeArtError} 当未指定任何维度时抛出
 */
export function calculateOutputSize(
  image: ImageData,
  config: ArtConfig
): { height: number; width: number } {
  const { height: configHeight, width: configWidth, ratio } = config;
  
  if (!configHeight && !configWidth) {
    throw new UnicodeArtError(
      '必须指定height或width至少一个',
      ErrorCode.INVALID_CONFIG,
      { config }
    );
  }
  
  const { blockH, blockW } = calculateBlockSize(
    image,
    configHeight ?? null,
    configWidth ?? null,
    ratio
  );
  
  return {
    height: Math.ceil(image.height / blockH),
    width: Math.ceil(image.width / blockW)
  };
}

/**
 * 🟢 计算采样块尺寸
 * 
 * 🔹 根据源图像尺寸和输出尺寸计算每个采样块的大小。
 * 🔹 使用向上取整确保覆盖整个图像。
 * 
 * @param image - 源图像数据
 * @param outputHeight - 输出行数
 * @param outputWidth - 输出列数
 * @param ratio - 垂直水平比例
 * @returns { blockH: number, blockW: number } 块的高度和宽度
 * 
 * @example
 * ```typescript
 * const blockSize = calculateBlockSize(image, 20, 40, 2.0);
 * console.log(blockSize); // { blockH: 10, blockW: 5 }
 * ```
 * 
 * @remarks
 * - 公式: blockH = ceil(sourceHeight / outputHeight)
 * - 公式: blockW = ceil(sourceWidth / (outputWidth × ratio))
 * - 向上取整确保所有像素都被采样
 * - 边缘块可能包含填充像素
 * 
 * @performance
 * - 时间复杂度: O(1)
 */
export function calculateBlockSize(
  image: ImageData,
  outputHeight: number | null | undefined,
  outputWidth: number | null | undefined,
  ratio: number
): { blockH: number; blockW: number } {
  let blockH: number;
  let blockW: number;
  
  if (outputHeight !== null && outputHeight !== undefined && outputWidth !== null && outputWidth !== undefined) {
    blockH = Math.ceil(image.height / outputHeight);
    blockW = Math.ceil(image.width / (outputWidth * ratio));
  } else if (outputHeight !== null && outputHeight !== undefined) {
    blockH = Math.ceil(image.height / outputHeight);
    blockW = Math.round(blockH / ratio);
  } else if (outputWidth !== null && outputWidth !== undefined) {
    blockW = Math.ceil(image.width / (outputWidth * ratio));
    blockH = Math.round(blockW * ratio);
  } else {
    blockH = 12;
    blockW = 6;
  }
  
  // 🔹 边界保护：避免除以零或过小尺寸
  const safeBlockH = Math.max(2, blockH);
  const safeBlockW = Math.max(1, blockW);
  
  return { blockH: safeBlockH, blockW: safeBlockW };
}

//#endregion

//#region 🟩 图像块提取

/**
 * 🟢 从源图像提取指定区域的块
 * 
 * 🔹 提取矩形区域的像素数据，超出边界的部分用白色(255)填充。
 * 🔹 返回固定尺寸的块，便于后续统一处理。
 * 
 * @param image - 源图像数据
 * @param sourceX - 起始X坐标（列）
 * @param sourceY - 起始Y坐标（行）
 * @param blockW - 块宽度
 * @param blockH - 块高度
 * @returns Uint8Array 提取的块数据（行优先存储）
 * 
 * @example
 * ```typescript
 * const block = extractBlock(image, 10, 20, 8, 8);
 * console.log(block.length); // 64 (8×8)
 * ```
 * 
 * @remarks
 * - 超出图像边界的部分填充为255（白色）
 * - 返回一维数组，长度 = blockW × blockH
 * - 行优先存储：block[y * blockW + x]
 * - 填充色选择白色因为大多数背景是浅色
 * 
 * @performance
 * - 时间复杂度: O(blockW × blockH)
 * - 空间复杂度: O(blockW × blockH)
 * - 预分配内存避免动态扩容
 */
export function extractBlock(
  image: ImageData,
  sourceX: number,
  sourceY: number,
  blockW: number,
  blockH: number
): Uint8Array {
  const blockSize = blockW * blockH;
  const block = new Uint8Array(blockSize);
  
  // 🔹 遍历块的每个像素
  for (let y = 0; y < blockH; y++) {
    for (let x = 0; x < blockW; x++) {
      // 🔹 计算源图像中的实际坐标
      const imgX = sourceX + x;
      const imgY = sourceY + y;
      
      // 🔹 检查是否在图像范围内
      if (imgX >= 0 && imgX < image.width && imgY >= 0 && imgY < image.height) {
        // 🔹 在范围内，复制像素值
        block[y * blockW + x] = image.data[imgY * image.width + imgX];
      } else {
        // 🔹 超出范围，填充为白色(255)
        block[y * blockW + x] = 255;
      }
    }
  }
  
  return block;
}

//#endregion

//#region 🟩 缩放和归一化

/**
 * 🟢 将图像块缩放到目标尺寸并归一化
 * 
 * 🔹 使用双线性插值将块缩放到matrixSize×matrixSize，然后归一化到[0, 1]。
 * 🔹 这是字符匹配前的关键预处理步骤。
 * 
 * @param block - 源图像块数据
 * @param blockW - 源块宽度
 * @param blockH - 源块高度
 * @param matrixSize - 目标矩阵尺寸
 * @returns Float32Array 归一化的采样矩阵（一维数组）
 * 
 * @example
 * ```typescript
 * const block = extractBlock(image, 0, 0, 10, 10);
 * const normalized = resizeAndNormalizeBlock(block, 10, 10, 6);
 * console.log(normalized.length); // 36 (6×6)
 * console.log(normalized[0]); // 0.0-1.0之间的值
 * ```
 * 
 * @remarks
 * - 使用双线性插值保证平滑过渡
 * - 归一化公式: value / 255.0
 * - 返回一维数组，长度 = matrixSize²
 * - 行优先存储：matrix[y * matrixSize + x]
 * 
 * @performance
 * - 时间复杂度: O(matrixSize²)
 * - 空间复杂度: O(matrixSize²)
 * - 双线性插值比最近邻更平滑
 * 
 * @see {@link bilinearInterpolate} 双线性插值实现
 */
export function resizeAndNormalizeBlock(
  block: Uint8Array,
  blockW: number,
  blockH: number,
  matrixSize: number,
  interpolation: Interpolation = Interpolation.BILINEAR
): Float32Array {
  const normalized = new Float32Array(matrixSize * matrixSize);
  
  for (let dstY = 0; dstY < matrixSize; dstY++) {
    for (let dstX = 0; dstX < matrixSize; dstX++) {
      const value = resizeInterpolate(block, blockW, blockH, matrixSize, matrixSize, dstX, dstY, interpolation);
      normalized[dstY * matrixSize + dstX] = value / 255.0;
    }
  }
  
  return normalized;
}

/**
 * 🔹 按OpenCV resize坐标规则采样一个目标像素。
 */
export function resizeInterpolate(
  data: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  dstX: number,
  dstY: number,
  interpolation: Interpolation
): number {
  if (interpolation === Interpolation.NEAREST) {
    const srcX = Math.floor(dstX * sourceWidth / targetWidth);
    const srcY = Math.floor(dstY * sourceHeight / targetHeight);
    return getPixelReplicate(data, sourceWidth, sourceHeight, srcX, srcY);
  }

  const srcX = (dstX + 0.5) * sourceWidth / targetWidth - 0.5;
  const srcY = (dstY + 0.5) * sourceHeight / targetHeight - 0.5;

  if (interpolation === Interpolation.BICUBIC) {
    return separableInterpolate(data, sourceWidth, sourceHeight, srcX, srcY, 4, cubicWeight, -1);
  }

  if (interpolation === Interpolation.LANCZOS) {
    return separableInterpolate(data, sourceWidth, sourceHeight, srcX, srcY, 8, lanczosWeight, -3);
  }

  return bilinearInterpolate(data, sourceWidth, sourceHeight, srcX, srcY);
}

/**
 * 🟢 最近邻插值
 * 
 * 🔹 对应Python参考实现中的 cv2.INTER_NEAREST。
 */
export function nearestInterpolate(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  return getPixelReplicate(data, width, height, Math.round(x), Math.round(y));
}

/**
 * 🟢 双线性插值
 * 
 * 🔹 在四个相邻像素之间进行线性插值，得到平滑的采样值。
 * 🔹 处理边界情况（超出范围时钳制坐标）。
 * 
 * @param data - 源图像数据（一维数组）
 * @param width - 源图像宽度
 * @param height - 源图像高度
 * @param x - 浮点X坐标
 * @param y - 浮点Y坐标
 * @returns number 插值后的像素值 [0, 255]
 * 
 * @example
 * ```typescript
 * const value = bilinearInterpolate(data, 10, 10, 3.5, 4.2);
 * console.log(value); // 约 128.5
 * ```
 * 
 * @remarks
 * - 找到四个相邻像素: (x0,y0), (x1,y0), (x0,y1), (x1,y1)
 * - 先在X方向插值，再在Y方向插值
 * - 边界外的像素使用最近的边界值
 * - 比最近邻插值更平滑，无明显锯齿
 * 
 * @performance
 * - 时间复杂度: O(1)
 * - 涉及4次乘法和3次加法
 * - 比三次样条插值快得多
 * 
 * @see {@link https://en.wikipedia.org/wiki/Bilinear_interpolation}
 */
export function bilinearInterpolate(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  const clampedX = Math.max(0, Math.min(width - 1, x));
  const clampedY = Math.max(0, Math.min(height - 1, y));
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  
  const fx = clampedX - x0;
  const fy = clampedY - y0;
  
  // 🔹 获取四个角的像素值
  const idx00 = y0 * width + x0;
  const idx10 = y0 * width + x1;
  const idx01 = y1 * width + x0;
  const idx11 = y1 * width + x1;
  
  const v00 = data[idx00];
  const v10 = data[idx10];
  const v01 = data[idx01];
  const v11 = data[idx11];
  
  // 🔹 双线性插值公式
  // 先在X方向插值
  const top = v00 * (1 - fx) + v10 * fx;
  const bottom = v01 * (1 - fx) + v11 * fx;
  
  // 再在Y方向插值
  const result = top * (1 - fy) + bottom * fy;
  
  return result;
}

function separableInterpolate(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  taps: number,
  weightFn: (distance: number) => number,
  startOffset: number
): number {
  const baseX = Math.floor(x);
  const baseY = Math.floor(y);
  const xWeights = new Array<number>(taps);
  const yWeights = new Array<number>(taps);
  let xWeightSum = 0;
  let yWeightSum = 0;

  for (let k = 0; k < taps; k++) {
    xWeights[k] = weightFn(x - (baseX + startOffset + k));
    yWeights[k] = weightFn(y - (baseY + startOffset + k));
    xWeightSum += xWeights[k];
    yWeightSum += yWeights[k];
  }

  let total = 0;

  for (let ky = 0; ky < taps; ky++) {
    const sy = baseY + startOffset + ky;
    const wy = yWeights[ky] / yWeightSum;
    for (let kx = 0; kx < taps; kx++) {
      const sx = baseX + startOffset + kx;
      const wx = xWeights[kx] / xWeightSum;
      total += getPixelReplicate(data, width, height, sx, sy) * wx * wy;
    }
  }

  return total;
}

function cubicWeight(distance: number): number {
  const x = Math.abs(distance);
  const a = -0.75;

  if (x <= 1) {
    return (a + 2) * x * x * x - (a + 3) * x * x + 1;
  }

  if (x < 2) {
    return a * x * x * x - 5 * a * x * x + 8 * a * x - 4 * a;
  }

  return 0;
}

function lanczosWeight(distance: number): number {
  const x = Math.abs(distance);
  if (x < 1e-7) {
    return 1;
  }
  if (x >= 4) {
    return 0;
  }
  return sinc(x) * sinc(x / 4);
}

function sinc(x: number): number {
  const value = Math.PI * x;
  return Math.sin(value) / value;
}

function getPixelReplicate(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  const clampedX = Math.max(0, Math.min(width - 1, x));
  const clampedY = Math.max(0, Math.min(height - 1, y));
  return data[clampedY * width + clampedX];
}

//#endregion

//#region 🟩 采样数组生成

/**
 * 🟢 生成完整的采样数组
 * 
 * 🔹 将源图像划分为多个矩形块，对每个块进行缩放和归一化处理，
 * 🔹 生成用于字符匹配的二维采样数组。
 * 
 * @param image - 源图像数据（灰度值数组）
 * @param config - 艺术生成配置选项
 * @returns SamplingArray 二维采样数组
 * 
 * @example
 * ```typescript
 * const samplingArray = generateSamplingArray(image, {
 *   height: 20,
 *   matrixSize: 6,
 *   ratio: 2.0
 * });
 * console.log(samplingArray.length); // 20 (行数)
 * console.log(samplingArray[0].length); // 40 (列数)
 * console.log(samplingArray[0][0].matrix.length); // 36 (6×6)
 * ```
 * 
 * @throws {UnicodeArtError} 当配置参数无效时抛出
 * 
 * @remarks
 * - 返回二维数组: samplingArray[row][col]
 * - 每个元素包含: { matrix: Float32Array, sourceX, sourceY }
 * - matrix已归一化到[0, 1]范围
 * - sourceX/sourceY记录块在源图像中的位置（用于调试）
 * 
 * @performance
 * - 时间复杂度: O(H × W)，其中H和W是源图像尺寸
 * - 空间复杂度: O(outputHeight × outputWidth × matrixSize²)
 * - 典型耗时: 10-100ms（取决于图像大小和matrixSize）
 * 
 * @see {@link calculateOutputSize} 计算输出尺寸
 * @see {@link calculateBlockSize} 计算块尺寸
 * @see {@link extractBlock} 提取图像块
 * @see {@link resizeAndNormalizeBlock} 缩放并归一化
 */
export function generateSamplingArray(
  image: ImageData,
  config: ArtConfig
): SamplingArray {
  //#region 🟩 参数验证
  
  if (!image || !image.data) {
    throw new UnicodeArtError(
      '无效的图像数据',
      ErrorCode.INVALID_INPUT,
      { image }
    );
  }
  
  if (config.matrixSize < 2 || config.matrixSize > 20) {
    throw new UnicodeArtError(
      '矩阵大小必须在2-20之间',
      ErrorCode.INVALID_CONFIG,
      { matrixSize: config.matrixSize }
    );
  }
  
  //#endregion
  
  //#region 🟩 计算输出尺寸和块大小
  
  const { blockH, blockW } = calculateBlockSize(
    image,
    config.height ?? null,
    config.width ?? null,
    config.ratio
  );
  
  const outputHeight = Math.ceil(image.height / blockH);
  const outputWidth = Math.ceil(image.width / blockW);
  
  const matrixSize = config.matrixSize;
  
  //#endregion
  
  //#region 🟩 生成采样数组
  
  const samplingArray: SamplingArray = [];
  
  // 🔹 预分配外层数组
  samplingArray.length = outputHeight;
  
  // 🔹 遍历每个输出行
  for (let row = 0; row < outputHeight; row++) {
    const rowData: SamplingBlock[] = new Array(outputWidth);
    
    // 🔹 遍历每个输出列
    for (let col = 0; col < outputWidth; col++) {
      // 🔹 计算当前块在源图像中的起始位置
      const sourceY = row * blockH;
      const sourceX = col * blockW;
      
      //  提取图像块（含边界填充）
      const block = extractBlock(
        image,
        sourceX,
        sourceY,
        blockW,
        blockH
      );
      
      // 🔹 缩放到目标尺寸并归一化到[0, 1]
      const normalized = resizeAndNormalizeBlock(
        block,
        blockW,
        blockH,
        matrixSize,
        config.interpolation
      );
      
      rowData[col] = {
        matrix: normalized,
        sourceX,
        sourceY
      };
    }
    
    samplingArray[row] = rowData;
  }
  
  //#endregion
  
  return samplingArray;
}

//#endregion
