/**
 * ============================================================================
 * 🟦 输出类型和错误处理模块
 * ============================================================================
 * 
 * 🔶 模块职责
 * 定义字符画生成的输出结果和错误处理机制，包括：
 * - 输出格式枚举 (OutputFormat)
 * - 生成结果接口 (ArtResult)
 * - 错误类 (UnicodeArtError)
 * - 错误码枚举 (ErrorCode)
 * 
 * 🔶 设计原则
 * - 统一的错误处理机制
 * - 丰富的元数据信息
 * - 支持多种输出格式
 * 
 * 🔶 扩展性
 * - 易于添加新的输出格式（如ANSI彩色）
 * - 错误码便于程序化判断
 * - 详细的错误上下文信息
 * 
 * @module types/output
 * @since 0.1.0
 * ============================================================================
 */

import type { MessageKey, MessageParams, SupportedLocale } from '../i18n';

//#region 🟦 输出格式枚举

/**
 * 🟢 输出格式枚举
 * 
 * 🔹 定义字符画的输出格式类型。
 * 🔹 不同格式适用于不同的使用场景。
 * 
 * @enum {string} OutputFormat
 * 
 * @example
 * ```typescript
 * // 纯文本格式（默认）
 * const result = await textToArt('Hello', config);
 * console.log(result.content); // 直接输出到终端
 * 
 * // HTML格式
 * const htmlResult = toHTML(result);
 * document.body.innerHTML = htmlResult;
 * 
 * // ANSI格式（彩色终端）
 * const ansiResult = toANSI(result, config);
 * process.stdout.write(ansiResult);
 * ```
 * 
 * @remarks
 * - PLAIN_TEXT: 纯文本，最通用
 * - HTML: 网页显示，保留样式
 * - ANSI: 彩色终端，视觉效果最佳
 * 
 * @see {@link toHTML} HTML格式转换函数
 * @see {@link toANSI} ANSI格式转换函数
 */
export enum OutputFormat {
  /** 
   * 纯文本格式
   * - 仅包含字符、空格、换行符
   * - 适用于终端、文件保存
   * - 无样式信息
   */
  PLAIN_TEXT = 'plain',
  
  /** 
   * HTML格式
   * - 包含<pre>标签包裹
   * - 可添加CSS样式
   * - 适用于网页显示
   */
  HTML = 'html',
  
  /** 
   * ANSI转义码格式
   * - 包含颜色、背景色控制码
   * - 适用于支持ANSI的终端
   * - 可实现灰度到颜色的映射
   */
  ANSI = 'ansi'
}

//#endregion

//#region 🟦 生成结果接口

/**
 * 🟢 艺术生成结果接口
 * 
 * 🔹 包含字符画生成的完整结果和元数据。
 * 🔹 提供性能统计和调试信息。
 * 
 * @interface ArtResult
 * 
 * @property {string} content - 字符画内容字符串
 * @property {OutputFormat} format - 输出格式
 * @property {number} rows - 实际输出行数
 * @property {number} cols - 实际输出列数（最长行的字符数）
 * @property {number} duration - 生成耗时（毫秒）
 * @property {ArtMetadata} metadata - 元数据信息
 * 
 * @example
 * ```typescript
 * const result: ArtResult = await imageToArt('photo.jpg', config);
 * 
 * console.log(result.content);      // 字符画内容
 * console.log(`尺寸: ${result.rows}×${result.cols}`);
 * console.log(`耗时: ${result.duration}ms`);
 * console.log(`源图像: ${result.metadata.sourceWidth}×${result.metadata.sourceHeight}`);
 * 
 * // 保存到文件
 * fs.writeFileSync('output.txt', result.content, 'utf-8');
 * ```
 * 
 * @remarks
 * - duration包含所有处理阶段的总时间
 * - cols是最长行的长度，可能不等于配置中的width
 * - metadata用于调试和性能分析
 * 
 * @performance
 * - 典型duration: 100-2000ms（取决于图像大小和配置）
 * - content大小: rows × cols 字节（UTF-8编码）
 */
export interface ArtResult {
  /** 
   * 字符画内容字符串
   * - 包含换行符分隔的多行文本
   * - 每行以\n结尾
   * - 可直接输出或保存
   */
  content: string;
  
  /** 输出格式 */
  format: OutputFormat;
  
  /** 
   * 实际输出行数
   * - 等于采样数组的行数
   * - 通常等于配置的height（如果指定）
   */
  rows: number;
  
  /** 
   * 实际输出列数
   * - 最长行的字符数
   * - 可能小于配置的width（如有trimTrailingSpaces）
   */
  cols: number;
  
  /** 
   * 生成耗时（毫秒）
   * - 包含所有处理阶段
   * - 用于性能分析和优化
   */
  duration: number;
  
  /** 元数据信息 */
  metadata: ArtMetadata;
}

/**
 * 🟢 元数据接口
 * 
 * 🔹 包含生成过程的详细信息，用于调试和分析。
 * 
 * @interface ArtMetadata
 */
export interface ArtMetadata {
  /** 源图像宽度（像素），文本模式为0 */
  sourceWidth: number;
  
  /** 源图像高度（像素），文本模式为0 */
  sourceHeight: number;
  
  /** 使用的字符集类型 */
  charset: string;
  
  /** 采样矩阵大小 */
  matrixSize: number;
  
  /** 实际使用的字体名称 */
  font?: string;
  
  /** 字符集大小（字符数量） */
  charsetSize?: number;
  
  /** 其他自定义元数据 */
  [key: string]: any;
}

//#endregion

//#region 🟦 错误处理

/**
 * 🟢 错误码枚举
 * 
 * 🔹 定义所有可能的错误类型。
 * 🔹 便于程序化判断和处理。
 * 
 * @enum {string} ErrorCode
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await imageToArt('missing.jpg', config);
 * } catch (error) {
 *   if (error instanceof UnicodeArtError) {
 *     switch (error.code) {
 *       case ErrorCode.IMAGE_LOAD_FAILED:
 *         console.error('图像加载失败:', error.message);
 *         break;
 *       case ErrorCode.FONT_NOT_FOUND:
 *         console.error('字体未找到:', error.details.font);
 *         break;
 *       default:
 *         console.error('未知错误:', error.message);
 *     }
 *   }
 * }
 * ```
 * 
 * @remarks
 * - 每个错误码对应一类错误
 * - 通过error.code可精确判断错误类型
 * - details字段提供更详细的上下文
 */
export enum ErrorCode {
  /** 输入参数无效 */
  INVALID_INPUT = 'INVALID_INPUT',
  
  /** 字体文件未找到 */
  FONT_NOT_FOUND = 'FONT_NOT_FOUND',
  
  /** 图像加载失败 */
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
  
  /** 配置参数无效 */
  INVALID_CONFIG = 'INVALID_CONFIG',
  
  /** 不支持的文件格式 */
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  
  /** 内存不足 */
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  
  /** 内部错误（不应发生） */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  /** 依赖缺失（如canvas未安装） */
  DEPENDENCY_MISSING = 'DEPENDENCY_MISSING',
  
  /** 文本渲染失败 */
  TEXT_RENDER_FAILED = 'TEXT_RENDER_FAILED',
  
  /** 字符渲染失败 */
  CHAR_RENDER_FAILED = 'CHAR_RENDER_FAILED',
  
  /** 字体加载失败 */
  FONT_LOAD_FAILED = 'FONT_LOAD_FAILED',
  
  /** 图像处理失败 */
  IMAGE_PROCESSING_FAILED = 'IMAGE_PROCESSING_FAILED',

  /** 用户或宿主环境主动取消操作 */
  OPERATION_ABORTED = 'OPERATION_ABORTED',
  
  /** 字符匹配失败 */
  MATCHING_FAILED = 'MATCHING_FAILED',
  
  /** 功能未实现 */
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',

  /** 字素宽度 profile 无效或当前 Core 不支持 */
  GLYPH_WIDTH_PROFILE_INVALID = 'GLYPH_WIDTH_PROFILE_INVALID',

  /** 用户宽字素规则无效 */
  GLYPH_WIDTH_REGEX_INVALID = 'GLYPH_WIDTH_REGEX_INVALID',

  /** 语义文档结构无效 */
  SEMANTIC_DOCUMENT_INVALID = 'SEMANTIC_DOCUMENT_INVALID',

  /** 语义 DSL 或 JSON 解析失败 */
  SEMANTIC_DOCUMENT_PARSE_FAILED = 'SEMANTIC_DOCUMENT_PARSE_FAILED',

  /** 语义布局渲染失败 */
  SEMANTIC_LAYOUT_FAILED = 'SEMANTIC_LAYOUT_FAILED',

  /** Unicode 艺术字字体文档无效 */
  ART_FONT_INVALID = 'ART_FONT_INVALID',

  /** Unicode 艺术字字体 JSON 解析失败 */
  ART_FONT_PARSE_FAILED = 'ART_FONT_PARSE_FAILED',

  /** Unicode 艺术字字体许可证或来源记录无效 */
  ART_FONT_LICENSE_INVALID = 'ART_FONT_LICENSE_INVALID'
}

/**
 * 🟢 UnicodeArt自定义错误类
 * 
 * 🔹 扩展标准Error类，添加错误码和详细信息。
 * 🔹 便于统一错误处理和日志记录。
 * 
 * @class UnicodeArtError
 * @extends Error
 * 
 * @property {string} code - 错误码
 * @property {any} [details] - 错误详细信息（可选）
 * 
 * @example
 * ```typescript
 * // 抛出错误
 * throw new UnicodeArtError(
 *   '图像文件不存在: photo.jpg',
 *   ErrorCode.IMAGE_LOAD_FAILED,
 *   { path: 'photo.jpg', errno: 'ENOENT' }
 * );
 * 
 * // 捕获错误
 * try {
 *   await loadImage('photo.jpg');
 * } catch (error) {
 *   if (error instanceof UnicodeArtError) {
 *     console.error(`[${error.code}] ${error.message}`);
 *     if (error.details) {
 *       console.error('Details:', error.details);
 *     }
 *   }
 * }
 * ```
 * 
 * @remarks
 * - 所有库内抛出的错误都应是UnicodeArtError实例
 * - code字段用于程序化判断
 * - details字段包含原始错误信息或上下文
 * - name字段固定为'UnicodeArtError'
 */
export class UnicodeArtError extends Error {
  /** 错误码 */
  public readonly code: ErrorCode;
  
  /** 错误详细信息（可选） */
  public readonly details?: any;

  /** 消息 key（可选，用于多语言重渲染） */
  public readonly messageKey?: MessageKey;

  /** 消息模板参数（可选） */
  public readonly messageParams?: MessageParams;

  /** 生成当前 message 时使用的语言（可选） */
  public readonly locale?: SupportedLocale;
  
  /**
   * 🟢 构造函数
   * 
   * 🔹 创建一个新的UnicodeArtError实例。
   * 
   * @param message - 错误消息（用户可读）
   * @param code - 错误码（程序可判断）
   * @param details - 错误详细信息（可选，用于调试）
   * 
   * @example
   * ```typescript
   * throw new UnicodeArtError(
   *   '无效的矩阵大小: 1',
   *   ErrorCode.INVALID_CONFIG,
   *   { matrixSize: 1, validRange: [2, 20] }
   * );
   * ```
   */
  constructor(message: string, code: ErrorCode, details?: any | UnicodeArtErrorOptions) {
    super(message);
    
    // 维护正确的原型链
    Object.setPrototypeOf(this, UnicodeArtError.prototype);
    
    this.name = 'UnicodeArtError';
    this.code = code;
    const options = normalizeUnicodeArtErrorOptions(details);
    this.details = options.details;
    this.messageKey = options.messageKey;
    this.messageParams = options.messageParams;
    this.locale = options.locale;
    
    // 捕获堆栈跟踪（V8引擎）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnicodeArtError);
    }
  }
  
  /**
   * 🟢 转换为JSON字符串
   * 
   * 🔹 用于序列化和日志记录。
   * 
   * @returns JSON格式的字符串
   * 
   * @example
   * ```typescript
   * const error = new UnicodeArtError('...', ErrorCode.INVALID_INPUT);
   * console.log(error.toJSON());
   * // {"name":"UnicodeArtError","message":"...","code":"INVALID_INPUT"}
   * ```
   */
  toJSON(): string {
    return JSON.stringify({
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      messageKey: this.messageKey,
      messageParams: this.messageParams,
      locale: this.locale,
      stack: this.stack
    });
  }
  
  /**
   * 🟢 转换为可读字符串
   * 
   * 🔹 包含所有错误信息的格式化字符串。
   * 
   * @returns 格式化的错误信息
   */
  toString(): string {
    let result = `[${this.code}] ${this.message}`;
    
    if (this.details) {
      result += `\nDetails: ${JSON.stringify(this.details, null, 2)}`;
    }
    
    return result;
  }
}

/** UnicodeArtError 扩展选项。 */
export interface UnicodeArtErrorOptions {
  details?: any;
  messageKey?: MessageKey;
  messageParams?: MessageParams;
  locale?: SupportedLocale;
}

/** 兼容旧的 details 参数，同时支持新的 messageKey / locale 元数据。 */
function normalizeUnicodeArtErrorOptions(details?: any | UnicodeArtErrorOptions): UnicodeArtErrorOptions {
  if (
    details &&
    typeof details === 'object' &&
    (
      Object.prototype.hasOwnProperty.call(details, 'details') ||
      Object.prototype.hasOwnProperty.call(details, 'messageKey') ||
      Object.prototype.hasOwnProperty.call(details, 'messageParams') ||
      Object.prototype.hasOwnProperty.call(details, 'locale')
    )
  ) {
    return details as UnicodeArtErrorOptions;
  }

  return { details };
}

//#endregion
