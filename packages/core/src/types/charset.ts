/**
 * ============================================================================
 * 🟦 字符集类型定义模块
 * ============================================================================
 * 
 * 🔶 模块职责
 * 定义字符集相关的核心数据结构，包括：
 * - 字符类型枚举 (CharType)
 * - 字符矩阵数据 (CharMatrix)
 * - 预定义字符集 (PresetCharset)
 * - 字符集配置 (CharsetConfig)
 * 
 * 🔶 设计原则
 * - 区分普通字符和宽字符（中文、日文等）
 * - 支持预定义字符集和自定义字符集
 * - 字符矩阵预计算以提升性能
 * 
 * 🔶 宽字符处理
 * - 普通字符: 宽度 = matrixSize
 * - 宽字符: 宽度 = 2 × matrixSize
 * - 高度统一 = matrixSize
 * 
 * @module types/charset
 * @since 0.1.0
 * ============================================================================
 */

//#region 🟦 字符类型枚举

/**
 * 🟢 字符类型枚举
 * 
 * 🔹 区分普通字符（单宽度）和宽字符（双宽度）。
 * 🔹 宽字符通常包括：中文、日文、韩文、全角符号等。
 * 
 * @enum {string} CharType
 * 
 * @example
 * ```typescript
 * if (charType === CharType.WIDE) {
 *   // 处理宽字符逻辑
 *   skipNextColumn();
 * }
 * ```
 * 
 * @remarks
 * - NORMAL: ASCII、拉丁字母、数字、标点等
 * - WIDE: CJK字符、全角符号、emoji等
 * - 判断依据: Unicode字符宽度属性
 */
export enum CharType {
  /** 普通字符（单宽度，占用1个字符位置） */
  NORMAL = 'normal',
  
  /** 宽字符（双宽度，占用2个字符位置） */
  WIDE = 'wide'
}

//#endregion

//#region 🟦 字符矩阵数据

/**
 * 🟢 字符矩阵数据接口
 * 
 * 🔹 表示一个字符渲染后的灰度矩阵数据。
 * 🔹 用于与采样块进行SAD匹配，找到最相似的字符。
 * 
 * @interface CharMatrix
 * 
 * @property {string} char - 字符本身
 * @property {Float32Array} matrix - 归一化灰度矩阵，范围 [0, 1]
 * @property {CharType} type - 字符类型（NORMAL或WIDE）
 * @property {number} width - 矩阵宽度（普通字符=matrixSize，宽字符=2×matrixSize）
 * @property {number} height - 矩阵高度（=matrixSize）
 * 
 * @example
 * ```typescript
 * const charData: CharMatrix = {
 *   char: 'A',
 *   matrix: new Float32Array([0.1, 0.9, ..., 0.2]), // 6×6 = 36个值
 *   type: CharType.NORMAL,
 *   width: 6,
 *   height: 6
 * };
 * 
 * // 访问矩阵中的值
 * const pixelValue = charData.matrix[i * charData.width + j];
 * ```
 * 
 * @remarks
 * - matrix已归一化到 [0, 1] 范围（0=黑，1=白）
 * - 宽字符的width是普通字符的2倍
 * - 预计算所有字符的matrix可大幅提升性能
 * 
 * @performance
 * - 空间复杂度: O(W × H)，W=width, H=height
 * - 普通字符: M²个Float32（M=matrixSize）
 * - 宽字符: 2M²个Float32
 */
export interface CharMatrix {
  /** 字符本身（UTF-8编码） */
  char: string;
  
  /** 
   * 归一化灰度矩阵（一维数组表示二维矩阵）
   * - Shape: [height × width]
   * - 范围: [0, 1]（0=纯黑，1=纯白）
   * - 索引: matrix[i * width + j]
   */
  matrix: Float32Array;
  
  /** 字符类型（决定宽度） */
  type: CharType;
  
  /** 
   * 矩阵宽度（像素）
   * - 普通字符: matrixSize
   * - 宽字符: 2 × matrixSize
   */
  width: number;
  
  /** 
   * 矩阵高度（像素）
   * - 始终等于 matrixSize
   */
  height: number;
}

//#endregion

//#region 🟦 预定义字符集

/**
 * 🟢 预定义字符集枚举
 * 
 * 🔹 提供常用的字符集预设，方便快速使用。
 * 🔹 也支持自定义字符集（CUSTOM模式）。
 * 
 * @enum {string} PresetCharset
 * 
 * @example
 * ```typescript
 * // 使用ASCII字符集
 * const config: CharsetConfig = {
 *   type: PresetCharset.ASCII
 * };
 * 
 * // 使用自定义字符集
 * const customConfig: CharsetConfig = {
 *   type: PresetCharset.CUSTOM,
 *   customChars: '@%#*+=-:. '
 * };
 * ```
 * 
 * @remarks
 * - ASCII: 基础ASCII字符（95个可打印字符）
 * - EXTENDED: 扩展ASCII + 常用符号（约200个字符）
 * - CHINESE_SIMPLE: 简体中文常用字（约3500字）
 * - CUSTOM: 用户自定义字符集
 * 
 * @see {@link DEFAULT_CHARSETS} 默认字符集定义
 */
export enum PresetCharset {
  /** 
   * 基础ASCII字符集
   * - 包含: 空格、标点、数字、大小写字母
   * - 数量: 95个可打印字符 (0x20-0x7E)
   */
  ASCII = 'ASCII',
  
  /** 
   * 扩展ASCII字符集
   * - 包含: ASCII + Box-drawing characters + 常用符号
   * - 数量: 约200个字符
   */
  EXTENDED = 'EXTENDED',
  
  /** 
   * 简体中文常用字符集
   * - 包含: GB2312一级汉字 + 常用标点
   * - 数量: 约3500个字符
   */
  CHINESE_SIMPLE = 'CHINESE_SIMPLE',
  
  /** 
   * 自定义字符集
   * - 需要在CharsetConfig中指定customChars
   */
  CUSTOM = 'CUSTOM'
}

//#endregion

//#region 🟦 字符集配置

/**
 * 🟢 字符集配置接口
 * 
 * 🔹 配置字符集的类型和自定义字符内容。
 * 
 * @interface CharsetConfig
 * 
 * @property {PresetCharset} type - 字符集类型
 * @property {string} [customChars] - 自定义字符字符串（仅当type=CUSTOM时有效）
 * 
 * @example
 * ```typescript
 * // ASCII字符集
 * const asciiConfig: CharsetConfig = {
 *   type: PresetCharset.ASCII
 * };
 * 
 * // 自定义字符集（从暗到亮）
 * const customConfig: CharsetConfig = {
 *   type: PresetCharset.CUSTOM,
 *   customChars: ' .:-=+*#%@'
 * };
 * 
 * // 反向自定义字符集（从亮到暗）
 * const invertedConfig: CharsetConfig = {
 *   type: PresetCharset.CUSTOM,
 *   customChars: '@%#*+=-:. '
 * };
 * ```
 * 
 * @remarks
 * - customChars仅在type=CUSTOM时需要
 * - 字符顺序影响匹配结果（建议按亮度排序）
 * - 字符数量越多，匹配精度越高，但速度越慢
 * 
 * @performance
 * - 字符数量N对性能的影响: O(N) 线性增长
 * - 推荐数量: 10-20个（平衡精度和速度）
 */
export interface CharsetConfig {
  /** 字符集类型 */
  type: PresetCharset;
  
  /** 
   * 自定义字符字符串
   * - 仅当 type = PresetCharset.CUSTOM 时有效
   * - 建议按亮度从暗到亮排序
   * - 示例: ' .:-=+*#%@'
   */
  customChars?: string;
}

//#endregion

//#region 🟦 默认字符集定义

/**
 * 🟢 默认ASCII字符集（从暗到亮）
 * 
 * 🔹 常用的ASCII字符集，按亮度递增排序。
 * 🔹 适用于大多数英文文本和简单图像。
 * 
 * @constant {string} DEFAULT_ASCII_CHARS
 * 
 * @example
 * ```typescript
 * // 使用默认ASCII字符集
 * const chars = DEFAULT_ASCII_CHARS;
 * console.log(chars); // ' .:-=+*#%@'
 * ```
 * 
 * @remarks
 * - 共10个字符
 * - 空格最亮（白色），@最暗（黑色）
 * - 可根据需要反转顺序
 */
export const DEFAULT_ASCII_CHARS = ' .:-=+*#%@';

/**
 * 🟢 扩展ASCII字符集
 * 
 * 🔹 包含更多符号和特殊字符，提供更丰富的表现力。
 * 
 * @constant {string} EXTENDED_CHARS
 */
export const EXTENDED_CHARS = ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

/**
 * 🟢 简化的中文字符集（示例）
 * 
 * 🔹 实际使用时应加载完整的GB2312字符集。
 * 🔹 此处仅提供少量示例字符。
 * 
 * @constant {string} CHINESE_SIMPLE_CHARS
 * 
 * @remarks
 * - TODO: 实现完整的GB2312字符集加载
 * - 需要从外部文件或使用unicode-range生成
 */
export const CHINESE_SIMPLE_CHARS = '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近矿千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞';

//#endregion
