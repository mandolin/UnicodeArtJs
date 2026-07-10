/**
 * ============================================================================
 * 🟦 常量定义模块
 * ============================================================================
 * 
 * 🔶 模块职责
 * 集中管理所有魔法数字和默认配置，包括：
 * - 默认参数值
 * - 字符集预设
 * - 性能相关常量
 * - 验证范围限制
 * 
 * 🔶 设计原则
 * - 避免硬编码（No Magic Numbers）
 * - 单一事实来源（Single Source of Truth）
 * - 文档化每个常量的含义
 * 
 * 🔶 维护建议
 * - 修改常量前需充分测试
 * - 保持向后兼容性
 * - 记录变更历史
 * 
 * @module constants
 * @since 0.1.0
 * @see {@link https://github.com/mandolin/UnicodeArt/src/unicodeart/config/constants.py}
 * ============================================================================
 */

//#region 🟦 默认参数常量

/**
 * 🟢 默认采样矩阵大小
 * 
 * 🔹 平衡质量和速度的推荐值。
 * 🔹 参考Python版本的DEFAULT_MATRIX_SIZE = 6
 * 
 * @constant {number} DEFAULT_MATRIX_SIZE
 * 
 * @remarks
 * - 最小值: 2（低于此值无法识别字符）
 * - 最大值: 20（高于此值性能急剧下降）
 * - 推荐范围: [4, 8]
 * - 6是经验值，适合大多数字体
 * 
 * @performance
 * - matrixSize每增加1，计算量增加约 (M+1)²/M² 倍
 * - 例如: 6→7，计算量增加约36%
 */
export const DEFAULT_MATRIX_SIZE = 6;

/**
 * 🟢 默认垂直水平比例
 * 
 * 🔹 字体高度与宽度的比值。
 * 🔹 大多数字体的高度约为宽度的2倍。
 * 
 * @constant {number} DEFAULT_VERTICAL_HORIZONTAL_RATIO
 * 
 * @remarks
 * - 等宽字体: 1.5-1.8
 * - 比例字体: 1.8-2.2
 * - 特殊字体: 可能需要调整
 * - 2.0是安全的默认值
 */
export const DEFAULT_VERTICAL_HORIZONTAL_RATIO = 2.0;

/**
 * 🟢 默认视觉字体渲染内边距/收缩量
 * 
 * 🔹 textToArt 渲染输入文字时使用；数值越大，绘制起点越向内收缩，实际字号也会相应减小。
 * 
 * @constant {number} DEFAULT_FONT_REDUCE
 */
export const DEFAULT_FONT_REDUCE = 0;

/**
 * 🟢 默认字符间距
 * 
 * 🔹 字符之间的额外空白（像素）。
 * 
 * @constant {number} DEFAULT_CHAR_SPACE
 */
export const DEFAULT_CHAR_SPACE = 1;

/**
 * 🟢 宽字符比例阈值
 * 
 * 🔹 判断字符是否为宽字符的宽度比例阈值。
 * 
 * @constant {number} DEFAULT_WIDE_CHAR_RATIO
 * 
 * @remarks
 * - 字符宽度 / 标准宽度 > 此值时判定为宽字符
 * - 通常设置为1.5
 */
export const DEFAULT_WIDE_CHAR_RATIO = 2.0;

//#endregion

//#region 🔶 插值算法映射

/**
 * 🟢 插值算法名称到OpenCV常量的映射
 * 
 * 🔹 用于sharp库的interpolation选项。
 * 
 * @constant {Object} INTERPOLATION_MAP
 * 
 * @example
 * ```typescript
 * const sharpInterpolation = INTERPOLATION_MAP[Interpolation.BICUBIC];
 * // sharpInterpolation === 'cubic'
 * ```
 * 
 * @remarks
 * - sharp支持的插值: nearest, bilinear, cubic, lanczos3
 * - 与OpenCV的对应关系可能不完全一致
 */
export const INTERPOLATION_MAP: Record<string, string> = {
  nearest: 'nearest',
  bilinear: 'bilinear',
  bicubic: 'cubic',
  lanczos: 'lanczos3'
};

//#endregion

//#region 🔶 验证范围常量

/**
 * 🟢 矩阵大小有效范围
 * 
 * 🔹 matrixSize参数的最小和最大值。
 * 
 * @constant {number} MIN_MATRIX_SIZE
 * @constant {number} MAX_MATRIX_SIZE
 */
export const MIN_MATRIX_SIZE = 2;
export const MAX_MATRIX_SIZE = 20;

/**
 * 🟢 垂直水平比例有效范围
 * 
 * @constant {number} MIN_RATIO
 * @constant {number} MAX_RATIO
 */
export const MIN_RATIO = 1.0;
export const MAX_RATIO = 3.0;

/**
 * 🟢 视觉字体渲染内边距/收缩量有效范围
 * 
 * @constant {number} MAX_FONT_REDUCE
 */
export const MAX_FONT_REDUCE = 10;

/**
 * 🟢 字符间距有效范围
 * 
 * @constant {number} MAX_CHAR_SPACE
 */
export const MAX_CHAR_SPACE = 5;

/**
 * 🟢 行间距有效范围
 * 
 * @constant {number} MAX_LINE_SPACING
 */
export const MAX_LINE_SPACING = 20;

//#endregion

//#region 🔶 性能相关常量

/**
 * 🟢 最大并行任务数上限
 * 
 * 🔹 防止创建过多线程导致系统过载。
 * 
 * @constant {number} MAX_PARALLEL_TASKS
 */
export const MAX_PARALLEL_TASKS = 16;

/**
 * 🟢 早期终止优化的最小收益阈值
 * 
 * 🔹 当字符集小于此值时，早期终止的收益不明显。
 * 
 * @constant {number} EARLY_TERMINATION_MIN_CHARSET_SIZE
 */
export const EARLY_TERMINATION_MIN_CHARSET_SIZE = 10;

/**
 * 🟢 大图像阈值
 * 
 * 🔹 超过此尺寸的图像启用额外的优化策略。
 * 
 * @constant {number} LARGE_IMAGE_THRESHOLD
 * 
 * @remarks
 * - 单位: 像素总数（width × height）
 * - 例如: 1920×1080 = 2,073,600 > 1,000,000
 */
export const LARGE_IMAGE_THRESHOLD = 1_000_000;

//#endregion

//#region 🔶 字符集工具函数

import { PresetCharset } from './types/charset';

/**
 * 🟢 获取预定义字符集
 * 
 * 🔹 根据类型返回对应的字符字符串。
 * 🔹 从constants中直接读取，避免循环导入。
 * 
 * @param type - 字符集类型
 * @returns string 字符字符串
 * 
 * @example
 * ```typescript
 * const chars = getPresetChars(PresetCharset.ASCII);
 * console.log(chars); // ' .:-=+*#%@'
 * ```
 * 
 * @throws {UnicodeArtError} 当类型不支持时抛出
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
      throw new Error(`不支持的字符集类型: ${type}`);
  }
}

//#endregion

//#region 🔶 字体样式后缀

/**
 * 🟢 字体样式到文件后缀的映射
 * 
 * 🔹 用于查找带样式的字体文件。
 * 
 * @constant {Object} FONT_STYLE_SUFFIX
 * 
 * @example
 * ```typescript
 * const suffix = FONT_STYLE_SUFFIX[FontStyle.BOLD];
 * // suffix === '-Bold'
 * ```
 * 
 * @remarks
 * - 不同操作系统的命名约定可能不同
 * - Windows/macOS/Linux: 建议优先使用开源字体文件，例如 Noto Sans SC 或 Source Han Sans SC
 * - Linux: 取决于发行版
 */
export const FONT_STYLE_SUFFIX: Record<string, string> = {
  regular: '',
  bold: ',Bold',
  italic: ',Italic',
  'bold-italic': ',Bold Italic'
};

//#endregion

//#region 🔶 系统路径常量

/**
 * 🟢 Windows字体目录
 * 
 * @constant {string} WINDOWS_FONT_DIR
 */
export const WINDOWS_FONT_DIR = 'C:\\Windows\\Fonts';

/**
 * 🟢 macOS字体目录
 * 
 * @constant {string} MACOS_FONT_DIR
 */
export const MACOS_FONT_DIR = '/Library/Fonts';

/**
 * 🟢 Linux字体目录
 * 
 * @constant {string[]} LINUX_FONT_DIRS
 */
export const LINUX_FONT_DIRS = [
  '/usr/share/fonts',
  '/usr/local/share/fonts',
  '~/.fonts'
];

//#endregion

//#region 🔶 默认字符集

/**
 * 🟢 默认ASCII字符集（完整）
 * 
 * 🔹 包含完整的可打印ASCII字符（95个），与Python参考项目一致。
 * 🔹 按亮度从亮到暗排序：空格最亮，~最暗。
 * 
 * @constant {string} DEFAULT_ASCII_CHARS
 * 
 * @example
 * ```typescript
 * // 使用默认ASCII字符集
 * const chars = DEFAULT_ASCII_CHARS;
 * console.log(chars.length); // 95
 * ```
 * 
 * @remarks
 * - 共95个字符（0x20-0x7E）
 * - 与Python项目的DEFAULT_CHARSET完全一致
 * - 可根据需要反转顺序或使用子集
 */
export const DEFAULT_ASCII_CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

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
