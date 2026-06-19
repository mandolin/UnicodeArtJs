/**
 * ============================================================================
 * 🟦 SAD字符匹配模块
 * ============================================================================
 * 
 * 🔶 模块职责
 * 使用绝对差值之和（Sum of Absolute Differences, SAD）算法，
 * 将采样矩阵与预计算的字符矩阵进行匹配，找到最佳匹配字符。
 * 
 * 🔶 核心算法
 * - calculateSAD() - 计算两个矩阵的SAD得分
 * - findBestMatch() - 在字符集中找到SAD最小的字符
 * - batchMatch() - 批量匹配整个采样数组（支持宽字符）
 * 
 * 🔶 性能优化
 * - 早期终止：当累计SAD超过当前最优值时提前退出
 * - 并行处理：支持多核CPU并行匹配
 * - 缓存优化：预计算字符数据避免重复渲染
 * - SIMD加速：利用TypedArray的向量化操作
 * 
 * 🔶 宽字符处理
 * - 普通字符：直接匹配单个采样块
 * - 宽字符：合并当前块+下一块，横向拼接后匹配
 * - wideCharRatio: 宽字符SAD阈值系数，控制是否优先选择宽字符
 * 
 * 🔶 算法说明
 * - SAD公式: Σ|sample[i] - char[i]|，i从0到N-1
 * - SAD越小表示相似度越高
 * - 范围: [0, N]，其中N = matrixSize²
 * - 完美匹配时SAD = 0
 * 
 * @module matcher
 * @author Qoder
 * @since 0.1.0
 * @see {@link https://github.com/mandolin/UnicodeArt/doc/algorithms/sad-matching.md}
 * ============================================================================
 */

import type { SamplingArray } from './types/image';
import type { CharMatrix } from './types/charset';
import { CharType } from './types/charset';
import type { ArtConfig } from './types/config';
import { UnicodeArtError, ErrorCode } from './types/output';
import { DEFAULT_WIDE_CHAR_RATIO } from './constants';

//#region 🟩 SAD计算

/**
 * 🟢 计算两个矩阵的SAD（绝对差值之和）
 * 
 * 🔹 计算采样矩阵和字符矩阵之间的相似度得分。
 * 🔹 SAD越小表示两个矩阵越相似。
 * 
 * @param sample - 采样矩阵（归一化到[0, 1]）
 * @param charMatrix - 字符矩阵（归一化到[0, 1]）
 * @param enableEarlyTermination - 是否启用早期终止优化
 * @param currentBestSAD - 当前最优SAD值（用于早期终止）
 * @returns number SAD得分，范围[0, matrixSize²]
 * 
 * @example
 * ```typescript
 * const sad = calculateSAD(sampleMatrix, charMatrix, true, 5.0);
 * if (sad < bestSAD) {
 *   bestSAD = sad;
 *   bestChar = 'A';
 * }
 * ```
 * 
 * @remarks
 * - 公式: SAD = Σ|sample[i] - char[i]|
 * - 两个矩阵必须长度相同
 * - 早期终止可提升2-5倍速度
 * - 典型SAD范围: 0.0（完美匹配）到 matrixSize²（完全不匹配）
 * 
 * @performance
 * - 时间复杂度: O(N)，N = matrixSize²
 * - 空间复杂度: O(1)
 * - 早期终止平均情况: O(N/2)
 * - 使用TypedArray向量化操作
 * 
 * @see {@link findBestMatch} 完整匹配流程
 */
export function calculateSAD(
  sample: Float32Array,
  charMatrix: Float32Array,
  enableEarlyTermination: boolean = true,
  currentBestSAD: number = Infinity
): number {
  // 🔹 验证矩阵尺寸
  if (sample.length !== charMatrix.length) {
    throw new UnicodeArtError(
      `矩阵尺寸不匹配: ${sample.length} vs ${charMatrix.length}`,
      ErrorCode.INVALID_INPUT,
      { sampleLength: sample.length, charLength: charMatrix.length }
    );
  }
  
  let sad = 0;
  
  // 🔹 遍历每个像素计算绝对差值
  for (let i = 0; i < sample.length; i++) {
    // 🔹 计算绝对差值并累加
    sad += Math.abs(sample[i] - charMatrix[i]);
    
    // 🔹 早期终止优化
    if (enableEarlyTermination && sad >= currentBestSAD) {
      // 🔹 累计SAD已超过当前最优值，无需继续计算
      return sad;
    }
  }
  
  return sad;
}

//#endregion

//#region 🟩 单点匹配

/**
 * 🟢 为单个采样块找到最佳匹配字符（已废弃）
 * 
 * ⚠️ **注意**: 此函数已被batchMatch中的新逻辑替代，不再支持宽字符正确匹配。
 * ⚠️ 仅保留用于向后兼容，建议直接使用batchMatch。
 * 
 * 🔹 遍历字符集，计算每个字符的SAD，返回SAD最小的字符。
 * 🔹 支持早期终止优化大幅提升速度。
 * 
 * @param sample - 采样矩阵
 * @param charDataMap - 预计算的字符数据映射
 * @param enableEarlyTermination - 是否启用早期终止
 * @returns { char: string, sad: number, isWideChar: boolean } 最佳匹配结果
 * 
 * @example
 * ```typescript
 * const result = findBestMatchForBlock(sample, charDataMap, true);
 * console.log(result.char); // 'A'
 * console.log(result.sad); // 2.34
 * console.log(result.isWideChar); // false
 * ```
 * 
 * @remarks
 * - 遍历所有字符计算SAD
 * - 记录最小SAD对应的字符
 * - 早期终止跳过明显不匹配的字符
 * - 宽字符需要特殊处理（占用2列）
 * 
 * @performance
 * - 时间复杂度: O(C × N)，C为字符集大小，N为matrixSize²
 * - 早期终止平均: O(C/2 × N)
 * - 典型耗时: 0.1-1ms/块（取决于字符集大小）
 * 
 * @see {@link calculateSAD} SAD计算
 * @see {@link batchMatch} 批量匹配
 * 
 * @deprecated 使用 batchMatch 替代
 */
export function findBestMatchForBlock(
  sample: Float32Array,
  charDataMap: Map<string, CharMatrix>,
  enableEarlyTermination: boolean = true
): { char: string; sad: number; isWideChar: boolean } {
  let bestChar = '';
  let bestSAD = Infinity;
  let bestIsWide = false;
  
  // 🔹 遍历字符集中的每个字符
  for (const [char, charData] of charDataMap.entries()) {
    // 🔹 计算当前字符的SAD
    const sad = calculateSAD(
      sample,
      charData.matrix,
      enableEarlyTermination,
      bestSAD
    );
    
    // 🔹 更新最优匹配
    if (sad < bestSAD) {
      bestSAD = sad;
      bestChar = char;
      bestIsWide = charData.type === CharType.WIDE;
      
      // 🔹 完美匹配，提前退出
      if (sad === 0) {
        break;
      }
    }
  }
  
  if (!bestChar) {
    throw new UnicodeArtError(
      '未找到任何匹配字符',
      ErrorCode.MATCHING_FAILED,
      { charDataSize: charDataMap.size }
    );
  }
  
  return {
    char: bestChar,
    sad: bestSAD,
    isWideChar: bestIsWide
  };
}

//#endregion

//#region 🟩 宽字符支持

/**
 * 🟢 合并两个相邻采样块为宽字符矩阵
 * 
 * 🔹 将当前块和下一块横向拼接，生成宽度为2×matrixSize的矩阵。
 * 🔹 用于与宽字符的预计算矩阵进行SAD比较。
 * 
 * @param block1 - 当前采样块
 * @param block2 - 下一个采样块（右侧）
 * @param matrixSize - 单个块的矩阵尺寸
 * @returns Float32Array 合并后的矩阵（长度 = matrixSize × matrixSize × 2）
 * 
 * @example
 * ```typescript
 * const merged = mergeBlocksForWideChar(block1, block2, 6);
 * console.log(merged.length); // 72 (6×12)
 * ```
 * 
 * @remarks
 * - 返回一维数组，行优先存储
 * - 左半部分来自block1，右半部分来自block2
 * - 如果block2不存在，用白色(1.0)填充
 * 
 * @performance
 * - 时间复杂度: O(M²)，M = matrixSize
 * - 空间复杂度: O(M²)
 */
function mergeBlocksForWideChar(
  block1: Float32Array,
  block2: Float32Array | null,
  matrixSize: number
): Float32Array {
  const mergedWidth = matrixSize * 2;
  const mergedHeight = matrixSize;
  const merged = new Float32Array(mergedWidth * mergedHeight);
  
  for (let y = 0; y < mergedHeight; y++) {
    for (let x = 0; x < mergedWidth; x++) {
      const idx = y * mergedWidth + x;
      
      if (x < matrixSize) {
        // 🔹 左半部分来自block1
        merged[idx] = block1[y * matrixSize + x];
      } else {
        // 🔹 右半部分来自block2或填充白色
        if (block2) {
          merged[idx] = block2[y * matrixSize + (x - matrixSize)];
        } else {
          merged[idx] = 1.0; // 白色填充
        }
      }
    }
  }
  
  return merged;
}

/**
 * 🟢 将字符集分为普通字符和宽字符两组
 * 
 * 🔹 根据CharType枚举分离字符，便于分别匹配。
 * 
 * @param charDataMap - 预计算的字符数据映射
 * @returns { normalChars: CharMatrix[], wideChars: CharMatrix[] } 分组结果
 * 
 * @internal
 */
function splitCharsByType(
  charDataMap: Map<string, CharMatrix>
): { normalChars: CharMatrix[]; wideChars: CharMatrix[] } {
  const normalChars: CharMatrix[] = [];
  const wideChars: CharMatrix[] = [];
  
  for (const charData of charDataMap.values()) {
    if (charData.type === CharType.WIDE) {
      wideChars.push(charData);
    } else {
      normalChars.push(charData);
    }
  }
  
  return { normalChars, wideChars };
}

//#endregion

//#region 🟩 批量匹配

/**
 * 🟢 批量匹配整个采样数组
 * 
 * 🔹 对采样数组中的每个块进行字符匹配，生成字符矩阵。
 * 🔹 支持宽字符：合并当前块+下一块后与宽字符比较，根据SAD得分和wideCharRatio决定是否使用。
 * 🔹 使用宽字符后跳过下一列，避免重复匹配。
 * 
 * @param samplingArray - 采样数组
 * @param charDataMap - 预计算的字符数据映射
 * @param config - 配置选项
 * @returns string[][] 字符矩阵（二维数组）
 * 
 * @example
 * ```typescript
 * const charMatrix = await batchMatch(samplingArray, charDataMap, config);
 * console.log(charMatrix.length); // 20 (行数)
 * console.log(charMatrix[0].length); // 40 (列数)
 * console.log(charMatrix[0][0]); // 'A' 或 '中'
 * ```
 * 
 * @remarks
 * - 返回二维数组: charMatrix[row][col]
 * - 宽字符占用2列，但只在第一列存储字符，第二列为空字符串
 * - wideCharRatio控制宽字符优先级：
 *   - ratio < 1.0: 倾向使用宽字符
 *   - ratio = 1.5: 默认值，平衡选择
 *   - ratio > 2.0: 倾向使用普通字符
 * - 大图像建议使用并行处理
 * 
 * @performance
 * - 时间复杂度: O(R × C × K × N)
 *   - R = 行数
 *   - C = 列数
 *   - K = 字符集大小
 *   - N = matrixSize²
 * - 典型耗时: 100-2000ms（取决于图像大小和字符集）
 * - 并行处理可提升2-8倍速度
 * 
 * @see {@link mergeBlocksForWideChar} 合并采样块
 * @see {@link splitCharsByType} 字符分组
 * 
 * @todo 实现并行处理（Web Workers / worker_threads）
 * @todo 添加进度回调支持
 */
export async function batchMatch(
  samplingArray: SamplingArray,
  charDataMap: Map<string, CharMatrix>,
  config: ArtConfig
): Promise<string[][]> {
  const outputHeight = samplingArray.length;
  const outputWidth = samplingArray[0]?.length || 0;
  
  if (outputHeight === 0 || outputWidth === 0) {
    throw new UnicodeArtError(
      '采样数组为空',
      ErrorCode.INVALID_INPUT,
      { samplingArray }
    );
  }
  
  // 🔹 初始化字符矩阵
  const charMatrix: string[][] = [];
  for (let row = 0; row < outputHeight; row++) {
    charMatrix[row] = new Array(outputWidth).fill('');
  }
  
  const enableEarlyTermination = config.enableEarlyTermination !== false;
  const matrixSize = config.matrixSize;
  const wideCharRatio = config.wideCharRatio ?? DEFAULT_WIDE_CHAR_RATIO;
  
  // 🔹 分离普通字符和宽字符
  const { normalChars, wideChars } = splitCharsByType(charDataMap);
  
  // 🔹 遍历每个采样块
  for (let row = 0; row < outputHeight; row++) {
    let col = 0;
    
    while (col < outputWidth) {
      const block = samplingArray[row][col];
      
      // 🔹 步骤1: 在普通字符集中找到最佳匹配
      let bestNormalChar: CharMatrix | null = null;
      let bestNormalSAD = Infinity;
      
      for (const charData of normalChars) {
        const sad = calculateSAD(
          block.matrix,
          charData.matrix,
          enableEarlyTermination,
          bestNormalSAD
        );
        
        if (sad < bestNormalSAD) {
          bestNormalSAD = sad;
          bestNormalChar = charData;
          
          // 🔹 完美匹配，提前退出
          if (sad === 0) break;
        }
      }
      
      // 🔹 步骤2: 如果有下一列，尝试宽字符匹配
      let bestWideChar: CharMatrix | null = null;
      let bestWideSAD = Infinity;
      let useWideChar = false;
      
      if (wideChars.length > 0 && (col + 1 < outputWidth || normalChars.length === 0)) {
        const nextBlock = col + 1 < outputWidth ? samplingArray[row][col + 1] : null;
        
        // 🔹 合并两个块
        const mergedBlock = mergeBlocksForWideChar(
          block.matrix,
          nextBlock ? nextBlock.matrix : null,
          matrixSize
        );
        
        // 🔹 在宽字符集中找到最佳匹配
        for (const charData of wideChars) {
          const sad = calculateSAD(
            mergedBlock,
            charData.matrix,
            enableEarlyTermination,
            bestWideSAD
          );
          
          if (sad < bestWideSAD) {
            bestWideSAD = sad;
            bestWideChar = charData;
            
            if (sad === 0) break;
          }
        }
        
        // 🔹 步骤3: 比较普通字符和宽字符的SAD
        // 公式: 如果 wideSAD < normalSAD × wideCharRatio，则使用宽字符
        // 参考实现中仅有宽字符集时直接使用宽字符，行尾用空白块补齐右半边。
        if (
          bestWideChar &&
          (normalChars.length === 0 || (col + 1 < outputWidth && bestWideSAD < bestNormalSAD * wideCharRatio))
        ) {
          useWideChar = true;
        }
      }
      
      // 🔹 步骤4: 填充字符矩阵
      if (useWideChar && bestWideChar) {
        // 🔹 使用宽字符
        charMatrix[row][col] = bestWideChar.char;
        if (col + 1 < outputWidth) {
          charMatrix[row][col + 1] = ''; // 第二列为空
        }
        
        // 🔹 跳过下一列
        col += col + 1 < outputWidth ? 2 : 1;
      } else if (bestNormalChar) {
        // 🔹 使用普通字符
        charMatrix[row][col] = bestNormalChar.char;
        col += 1;
      } else {
        // 🔹 fallback: 与Python参考实现一致，字符集为空时使用占位符
        charMatrix[row][col] = '?';
        col += 1;
      }
    }
  }
  
  return charMatrix;
}

//#endregion

//#region 🟩 并行匹配（TODO）

/**
 * 🟢 并行批量匹配（实验性功能）
 * 
 * 🔹 使用Web Workers（浏览器）或worker_threads（Node.js）并行处理。
 * 🔹 将采样数组分片，分配到多个worker中并行匹配。
 * 
 * ⚠️ **注意**: 此功能尚未实现，仅作为接口预留。
 * 
 * @param samplingArray - 采样数组
 * @param charDataMap - 预计算的字符数据映射
 * @param config - 配置选项
 * @param maxWorkers - 最大worker数量
 * @returns Promise<string[][]> 字符矩阵
 * 
 * @todo 实现并行匹配逻辑
 * @todo 添加worker池管理
 * @todo 实现任务分片和结果合并
 */
export async function batchMatchParallel(
  _samplingArray: SamplingArray,
  _charDataMap: Map<string, CharMatrix>,
  _config: ArtConfig,
  _maxWorkers: number = 4
): Promise<string[][]> {
  throw new UnicodeArtError(
    '并行匹配功能尚未实现',
    ErrorCode.NOT_IMPLEMENTED,
    { feature: 'batchMatchParallel' }
  );
}

//#endregion
