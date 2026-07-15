/**
 * ============================================================================
 * 🟦 图像数据类型定义模块
 * ============================================================================
 * 
 * 🔶 模块职责
 * 定义图像处理相关的核心数据结构，包括：
 * - 灰度图像数据 (ImageData)
 * - 采样块数据 (SamplingBlock)
 * - 二维采样数组 (SamplingArray)
 * 
 * 🔶 设计原则
 * - 使用TypedArray提升性能（避免GC压力）
 * - 行优先存储顺序（与NumPy兼容）
 * - 明确的尺寸和范围约束
 * 
 * 🔶 性能考虑
 * - Uint8Array: 像素值 [0, 255]，每像素1字节
 * - Float32Array: 归一化值 [0, 1]，每值4字节
 * - 避免嵌套对象，扁平化存储
 * 
 * @module types/image
 * @since 0.1.0
 * ============================================================================
 */

//#region 🟦 基础图像数据

/**
 * 🟢 灰度图像数据接口
 * 
 * 🔹 表示一个灰度图像的完整数据，包含尺寸信息和像素值数组。
 * 🔹 像素值采用行优先（row-major）顺序存储，便于快速访问。
 * 
 * **字段：** `width` 与 `height` 必须大于零；`data` 是长度为 `width * height` 的
 * 行优先 `Uint8Array`，每项位于 0 到 255。
 * 
 * @example
 * ```typescript
 * // 创建一个 100×50 的灰度图像
 * const image: ImageData = {
 *   width: 100,
 *   height: 50,
 *   data: new Uint8Array(100 * 50).fill(128) // 中灰色
 * };
 * 
 * // 访问像素值 (x=10, y=5)
 * const pixelValue = image.data[y * image.width + x];
 * ```
 * 
 * @remarks
 * - 像素索引计算公式: `index = y * width + x`
 * - 值域说明: 0=纯黑, 255=纯白, 128=中灰
 * - 内存占用: width × height 字节
 * 
 * 存储复杂度为 O(W x H)，随机访问复杂度为 O(1)。
 *
 * @public
 */
export interface ImageData {
  /** 图像宽度（像素数） */
  width: number;
  
  /** 图像高度（像素数） */
  height: number;
  
  /** 
   * 灰度值数组（行优先存储）
   * - 范围: [0, 255]
   * - 0 = 纯黑色
   * - 255 = 纯白色
   * - 索引: data[y * width + x]
   */
  data: Uint8Array;
}

/**
 * Core 内部灰度图像数据。
 *
 * 该类型用于 browser-adapt 阶段区分 Core 自定义灰度图像与浏览器 DOM ImageData。
 * 迁移期保留 ImageData 作为兼容名称，新代码优先使用 CoreImageData。
 */
export type CoreImageData = ImageData;

//#endregion

//#region 🟦 采样数据

/**
 * 🟢 采样块数据接口
 * 
 * 🔹 表示从源图像中提取并处理后的单个采样块。
 * 🔹 每个采样块对应输出字符画中的一个字符位置。
 * 
 * **字段：** `matrix` 是归一化 `Float32Array`；`sourceX` 和 `sourceY` 是源图像中的
 * 块起点像素坐标。
 * 
 * @example
 * ```typescript
 * const block: SamplingBlock = {
 *   matrix: new Float32Array([0.1, 0.2, ..., 0.9]), // 6×6 = 36个值
 *   sourceX: 10,
 *   sourceY: 20
 * };
 * 
 * // 访问矩阵中的值 (i=2, j=3)
 * const value = block.matrix[i * matrixSize + j];
 * ```
 * 
 * @remarks
 * - matrix已归一化到 [0, 1] 范围
 * - matrixSize由配置项决定（默认6）
 * - sourceX/Y用于调试和可视化
 * 
 * 空间复杂度为 O(M squared)，其中 M 为 `matrixSize`；典型 M=6 时占用 36 个
 * `Float32` 值。
 *
 * @public
 */
export interface SamplingBlock {
  /** 
   * 归一化灰度矩阵（一维数组表示二维矩阵）
   * - Shape: [matrixSize × matrixSize]
   * - 范围: [0, 1]
   * - 索引: matrix[i * matrixSize + j]
   */
  matrix: Float32Array;
  
  /** 块在源图像中的起始X坐标（像素） */
  sourceX: number;
  
  /** 块在源图像中的起始Y坐标（像素） */
  sourceY: number;
}

/**
 * 🟢 二维采样数组类型
 * 
 * 🔹 表示完整的采样数组，维度为 [outputHeight × outputWidth]。
 * 🔹 每个元素是一个SamplingBlock，对应输出字符画的一个字符位置。
 * 
 * @example
 * ```typescript
 * // 访问第3行第5列的采样块
 * const block = samplingArray[2][4];
 * 
 * // 遍历所有采样块
 * for (let row = 0; row < samplingArray.length; row++) {
 *   for (let col = 0; col < samplingArray[row].length; col++) {
 *     const block = samplingArray[row][col];
 *     // 处理 block...
 *   }
 * }
 * ```
 * 
 * @remarks
 * - 外层数组长度 = outputHeight（输出行数）
 * - 内层数组长度 = outputWidth（输出列数）
 * - 总块数 = outputHeight × outputWidth
 * 
 * 空间复杂度为 O(R x C x M squared)，其中 R 为输出行数、C 为输出列数、M 为矩阵大小。
 *
 * @public
 */
export type SamplingArray = SamplingBlock[][];

//#endregion

//#region 🟦 工具类型

/**
 * 🟢 像素坐标类型
 * 
 * 🔹 表示图像中的一个二维坐标点。
 * 
 *
 * @public
 */
export interface PixelCoord {
  /** X坐标（列索引） */
  x: number;
  
  /** Y坐标（行索引） */
  y: number;
}

/**
 * 🟢 矩形区域类型
 * 
 * 🔹 表示图像中的一个矩形区域。
 * 
 *
 * @public
 */
export interface Rect {
  /** 左上角X坐标 */
  x: number;
  
  /** 左上角Y坐标 */
  y: number;
  
  /** 宽度（像素） */
  width: number;
  
  /** 高度（像素） */
  height: number;
}

//#endregion
