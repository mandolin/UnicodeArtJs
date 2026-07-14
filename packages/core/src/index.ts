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
  ArtConfig,
  GlyphFontConfig,
  OutputTarget,
  VisualFontConfig
} from './types/config';

export type {
  SemanticArtTextBlock,
  SemanticArtTextRenderer,
  SemanticBlock,
  SemanticBlockDisplay,
  SemanticCell,
  SemanticCellRole,
  SemanticDocument,
  SemanticDocumentOptions,
  SemanticDocumentV1,
  SemanticDocumentVersion,
  SemanticDslParseOptions,
  SemanticJsonParseOptions,
  SemanticRenderOptions,
  SemanticRow,
  SemanticRowRole,
  SemanticRowSeparatorMode
} from './types/semantic';

export type {
  ResolvedUnicodeArtFontGlyph,
  UnicodeArtFont,
  UnicodeArtFontCreation,
  UnicodeArtFontCreationMethod,
  UnicodeArtFontDirection,
  UnicodeArtFontExtensions,
  UnicodeArtFontFormat,
  UnicodeArtFontGlyph,
  UnicodeArtFontLicense,
  UnicodeArtFontLineMeasurement,
  UnicodeArtFontMeasureOptions,
  UnicodeArtFontMetadata,
  UnicodeArtFontMetrics,
  UnicodeArtFontOrigin,
  UnicodeArtFontParseOptions,
  UnicodeArtFontRenderOptions,
  UnicodeArtFontRenderResult,
  UnicodeArtFontTextMeasurement,
  UnicodeArtFontV1,
  UnicodeArtFontVersion
} from './types/artFont';

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
  DEFAULT_CONFIG,
  normalizeArtConfigAliases
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

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  formatMessage,
  isSupportedLocale,
  normalizeLocale,
  t
} from './i18n';

export type {
  MessageKey,
  MessageParams,
  SupportedLocale
} from './i18n';

export type {
  BrowserEntryCapabilities,
  BoxCapabilities,
  CoreCapabilities,
  CoreCapabilityDescriptor,
  CoreCapabilityStability,
  NodeImageBackendCapabilities
} from './capabilities';

export {
  getCoreCapabilities
} from './capabilities';

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
import { Interpolation, TextAlign, HeightMode, normalizeArtConfigAliases } from './types/config';
import { invertPixels } from './preprocessor';
import { generateSamplingArray } from './sampler';
import { batchMatch } from './matcher';
import { assembleOutput, assembleTextOutput } from './assembler';
import { isWideChar as detectWideChar, calculateDisplayWidth } from './utils/wideCharDetector';
import { boxText, normalizeBoxOptions as normalizeBoxConfig } from './box/box';
import { getGlyphWidth, padToWidth, repeatToWidth } from './box/width';
import { createGlyphWidthCalculator, type GlyphWidthCalculator } from './glyph/width';
import { renderSemanticDocumentWithAdapter } from './semantic/render';
import type { SemanticDocument, SemanticRenderOptions } from './types/semantic';
import { nodePlatformAdapter } from './platform/node/nodePlatformAdapter';
import { normalizeLocale, t as translateCoreMessage } from './i18n';

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

export {
  getNodeImageBackend,
  resetNodeImageBackend,
  resolveNodeImageBackend,
  setNodeImageBackend
} from './platform/node/imageBackend';

export {
  sharpImageBackend
} from './platform/node/sharpImageBackend';

export {
  napiRsImageBackend
} from './platform/node/napiRsImageBackend';

export type {
  NodeImageBackend,
  NodeImageBackendName
} from './platform/node/imageBackend';

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

export type {
  BuiltInGlyphWidthProfile,
  GlyphWidthCalculatorOptions,
  GlyphWidthProfile,
  GlyphWidthProfileDefinition
} from './glyph/width';

export {
  BUILT_IN_GLYPH_WIDTH_PROFILES,
  createGlyphWidthCalculator,
  getGlyphWidthProfiles,
  isKnownGlyphWidthProfile,
  normalizeGlyphWidthProfile,
  normalizeWideCharRegex,
  GlyphWidthCalculator
} from './glyph/width';

export {
  parseSemanticDocumentJson,
  parseSemanticDsl,
  validateSemanticDocument
} from './semantic/document';

export {
  PERMISSIVE_UNICODE_ART_FONT_LICENSES,
  isPermissiveUnicodeArtFontLicense,
  isSpdxExpressionSyntax,
  parseUnicodeArtFontJson,
  validateUnicodeArtFont
} from './artFont/document';

export {
  getUnicodeArtFontGlyphDisplayWidth,
  measureUnicodeArtFontText,
  resolveUnicodeArtFontGlyph
} from './artFont/metrics';

export {
  renderUnicodeArtFontText
} from './artFont/render';

export {
  UNICODE_ART_FONT_FORMAT
} from './types/artFont';

export {
  renderSemanticDocumentWithAdapter
} from './semantic/render';

export {
  ZERO_SPACING,
  normalizeSpacing
} from './box/spacing';

/**
 * ============================================================================
 * 🟦 文本转字符画
 * ============================================================================
 * 
 * 🔶 核心思路
 * 文本转字符画的正确流程是：**先渲染为图像，再进行SAD匹配**，而非逐字符匹配。
 * 
 * ✅ 正确流程
 * 1. 使用宿主平台字体渲染器将文本渲染为位图（支持多行、对齐、行间距）
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
  const locale = normalizeLocale(config.locale);
  
  try {
    // 🔹 验证输入
    if (!text || text.length === 0) {
      throw new UnicodeArtError(
        translateCoreMessage('input.text.required', {}, locale),
        ErrorCode.INVALID_INPUT,
        {
          details: { text },
          messageKey: 'input.text.required',
          locale
        }
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
    const resolvedFont = await nodePlatformAdapter.loadFont(fullConfig.font || 'Noto Sans SC', fullConfig.fontStyle);
    
    //  渲染文本为图像
    // 字体大小基于每行像素高度计算，再扣除视觉字体收缩量。
    // 其中rectunit在line模式下等于height（字符画行数）对应的像素高度。
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
    // 字符模板渲染时使用matrixSize作为字体大小，不是输入文字的fontSize。
    const charDataMap = await nodePlatformAdapter.precomputeCharData({
      charset: fullConfig.charset,
      matrixSize: fullConfig.matrixSize,
      // 字符模板按字素字体渲染；未设置时保持使用视觉字体的历史行为。
      font: fullConfig.glyphFontFamily || resolvedFont,
      fontSize: fullConfig.matrixSize, // ← 修正：使用matrixSize而不是fontSize
      fontReduce: 0, // 字符模板不应用视觉字体收缩量，避免影响匹配基准。
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
    
    const message = error instanceof Error ? error.message : String(error);
    throw new UnicodeArtError(
      translateCoreMessage('error.textToArtFailed', { message }, locale),
      ErrorCode.INTERNAL_ERROR,
      {
        details: { originalError: error },
        messageKey: 'error.textToArtFailed',
        messageParams: { message },
        locale
      }
    );
  }
}

/**
 * 🟢 语义文档转字符画
 *
 * 🔹 消费版本化 JSON AST，支持标题/页脚、跨行跨列和 `{t:...}` 对应的原字输出块。
 * 🔹 当前属于 experimental；请通过 `getCoreCapabilities()` 检查当前能力边界。
 */
export async function semanticDocumentToArt(
  document: SemanticDocument | unknown,
  config: Partial<ArtConfig>,
  options: SemanticRenderOptions = {}
): Promise<ArtResult> {
  const fullConfig = validateConfig(config);
  return renderSemanticDocumentWithAdapter(
    document,
    fullConfig,
    async (text, blockConfig) => textToArt(text, blockConfig),
    options
  );
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
  const calculator = createGlyphWidthCalculator({
    profile: config.glyphWidthProfile,
    wideCharRegex: config.wideCharRegex,
    locale: config.locale
  });
  const plainConfig: ArtConfig = {
    ...config,
    box: false,
    outputFormat: OutputFormat.PLAIN_TEXT
  };

  const blocks = await buildLayoutBlocks(text, plainConfig, normalized);
  const layoutText = renderLayoutBlocks(blocks, normalized, config.box, calculator);
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
  rawBox: BoxOptions,
  calculator: GlyphWidthCalculator
): string {
  const separator = resolveLayoutSeparator(box, rawBox.separators);
  const normalizedRows = rows.map((row) => normalizeLayoutRow(row, box, rawBox.cell, calculator));
  const bodyLines: string[] = [];

  normalizedRows.forEach((row, rowIndex) => {
    if (rowIndex > 0 && shouldRenderRowSeparator(separator, rowIndex)) {
      bodyLines.push(renderRowSeparator(row, box, calculator));
    }

    bodyLines.push(...combineLayoutRow(row, separator.columns, box.chars.vertical || '|'));
  });

  const outerBox = toOuterBoxOptions(rawBox);
  return boxText(bodyLines.join('\n'), outerBox, calculator);
}

function normalizeLayoutRow(
  row: string[][],
  box: RuntimeBoxOptions,
  cell: BoxOptions['cell'],
  calculator: GlyphWidthCalculator
): string[][] {
  const minWidth = normalizeOptionalNonNegativeInteger(cell?.minWidth, 0, 'cell.minWidth');
  const minHeight = normalizeOptionalNonNegativeInteger(cell?.minHeight, 0, 'cell.minHeight');
  const cellPadding = normalizeCellPadding(cell?.padding);
  const maxWidth = Math.max(
    minWidth,
    ...row.map((block) => block.reduce((max, line) => Math.max(max, getGlyphWidth(line, calculator)), 0))
  );
  const maxHeight = Math.max(minHeight, ...row.map((block) => block.length));

  return row.map((block) => normalizeLayoutBlock(block, maxWidth, maxHeight, box, cellPadding, calculator));
}

function normalizeLayoutBlock(
  block: string[],
  width: number,
  height: number,
  box: RuntimeBoxOptions,
  padding: { top: number; right: number; bottom: number; left: number },
  calculator: GlyphWidthCalculator
): string[] {
  const aligned = block.map((line) => padToWidth(line, width, box.align, calculator));
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

function renderRowSeparator(
  row: string[][],
  box: RuntimeBoxOptions,
  calculator: GlyphWidthCalculator
): string {
  return row.map((block) => repeatToWidth(
    box.chars.horizontal || '-',
    getGlyphWidth(block[0] ?? '', calculator),
    calculator
  )).join(
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
  const locale = normalizeLocale(config.locale);
  
  try {
    // 🔹 验证输入
    if (!imagePath || imagePath.length === 0) {
      throw new UnicodeArtError(
        translateCoreMessage('input.imagePath.required', {}, locale),
        ErrorCode.INVALID_INPUT,
        {
          details: { imagePath },
          messageKey: 'input.imagePath.required',
          locale
        }
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
      // 图片输入没有视觉字体渲染步骤，但字符模板仍应优先使用字素字体。
      font: fullConfig.glyphFontFamily || fullConfig.font || 'Noto Sans SC',
      fontSize: fullConfig.matrixSize,
      fontReduce: 0, // 字符模板不应用视觉字体收缩量，避免影响匹配基准。
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
    
    const message = error instanceof Error ? error.message : String(error);
    throw new UnicodeArtError(
      translateCoreMessage('error.imageToArtFailed', { message }, locale),
      ErrorCode.INTERNAL_ERROR,
      {
        details: { originalError: error },
        messageKey: 'error.imageToArtFailed',
        messageParams: { message },
        locale
      }
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
  const normalizedConfig = normalizeArtConfigAliases(config);
  const locale = normalizeLocale(normalizedConfig.locale);

  // 🔹 从DEFAULT_CONFIG开始
  const fullConfig: ArtConfig = {
    matrixSize: normalizedConfig.matrixSize || 6,
    ratio: normalizedConfig.ratio || 2.0,
    interpolation: normalizedConfig.interpolation || Interpolation.BILINEAR,
    charset: normalizedConfig.charset || { type: PresetCharset.ASCII },
    visualFont: normalizedConfig.visualFont,
    glyphFont: normalizedConfig.glyphFont,
    font: normalizedConfig.font,
    fontStyle: normalizedConfig.fontStyle,
    fontReduce: normalizedConfig.fontReduce !== undefined ? normalizedConfig.fontReduce : 0,
    glyphFontFamily: normalizedConfig.glyphFontFamily,
    glyphWidthProfile: normalizedConfig.glyphWidthProfile,
    wideCharRegex: normalizedConfig.wideCharRegex,
    charSpace: normalizedConfig.charSpace !== undefined ? normalizedConfig.charSpace : 1,
    textAlign: normalizedConfig.textAlign || TextAlign.LEFT,
    lineSpacing: normalizedConfig.lineSpacing !== undefined ? normalizedConfig.lineSpacing : 0,
    heightMode: normalizedConfig.heightMode || HeightMode.LINE,
    outputFormat: normalizedConfig.outputFormat || OutputFormat.PLAIN_TEXT,
    outputTarget: normalizedConfig.outputTarget,
    invert: normalizedConfig.invert !== undefined ? normalizedConfig.invert : false,
    trimTrailingSpaces: normalizedConfig.trimTrailingSpaces !== undefined ? normalizedConfig.trimTrailingSpaces : false,
    box: normalizedConfig.box !== undefined ? normalizedConfig.box : false,
    wideCharRatio: normalizedConfig.wideCharRatio !== undefined ? normalizedConfig.wideCharRatio : 2.0,
    enableEarlyTermination: normalizedConfig.enableEarlyTermination !== undefined ? normalizedConfig.enableEarlyTermination : true,
    maxParallelTasks: normalizedConfig.maxParallelTasks !== undefined ? normalizedConfig.maxParallelTasks : 0,
    locale
  };
  
  // 🔹 处理height和width
  if (normalizedConfig.height) {
    if (normalizedConfig.height <= 0) {
      throw new UnicodeArtError(
        translateCoreMessage('config.height.positive', {}, locale),
        ErrorCode.INVALID_CONFIG,
        {
          details: { height: normalizedConfig.height },
          messageKey: 'config.height.positive',
          locale
        }
      );
    }
    fullConfig.height = normalizedConfig.height;
  }
  
  if (normalizedConfig.width) {
    if (normalizedConfig.width <= 0) {
      throw new UnicodeArtError(
        translateCoreMessage('config.width.positive', {}, locale),
        ErrorCode.INVALID_CONFIG,
        {
          details: { width: normalizedConfig.width },
          messageKey: 'config.width.positive',
          locale
        }
      );
    }
    fullConfig.width = normalizedConfig.width;
  }
  
  // 🔹 至少指定一个维度
  if (!fullConfig.height && !fullConfig.width) {
    throw new UnicodeArtError(
      translateCoreMessage('config.dimension.required', {}, locale),
      ErrorCode.INVALID_CONFIG,
      {
        details: { config },
        messageKey: 'config.dimension.required',
        locale
      }
    );
  }
  
  // 🔹 验证matrixSize
  if (fullConfig.matrixSize < 2 || fullConfig.matrixSize > 20) {
    throw new UnicodeArtError(
      translateCoreMessage('config.matrixSize.range', {}, locale),
      ErrorCode.INVALID_CONFIG,
      {
        details: { matrixSize: fullConfig.matrixSize },
        messageKey: 'config.matrixSize.range',
        locale
      }
    );
  }
  
  // 🔹 验证ratio
  if (fullConfig.ratio < 1.0 || fullConfig.ratio > 3.0) {
    throw new UnicodeArtError(
      translateCoreMessage('config.ratio.range', {}, locale),
      ErrorCode.INVALID_CONFIG,
      {
        details: { ratio: fullConfig.ratio },
        messageKey: 'config.ratio.range',
        locale
      }
    );
  }
  
  // 🔹 验证wideCharRatio
  if (
    fullConfig.wideCharRatio !== undefined &&
    (fullConfig.wideCharRatio <= 0 || fullConfig.wideCharRatio > 10)
  ) {
    throw new UnicodeArtError(
      translateCoreMessage('config.wideCharRatio.range', {}, locale),
      ErrorCode.INVALID_CONFIG,
      {
        details: { wideCharRatio: fullConfig.wideCharRatio },
        messageKey: 'config.wideCharRatio.range',
        locale
      }
    );
  }

  try {
    normalizeBoxConfig(fullConfig.box);
    createGlyphWidthCalculator({
      profile: fullConfig.glyphWidthProfile,
      wideCharRegex: fullConfig.wideCharRegex,
      locale
    });
  } catch (error) {
    if (error instanceof UnicodeArtError && (
      error.code === ErrorCode.GLYPH_WIDTH_PROFILE_INVALID ||
      error.code === ErrorCode.GLYPH_WIDTH_REGEX_INVALID
    )) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new UnicodeArtError(
      translateCoreMessage('config.box.invalid', { message }, locale),
      ErrorCode.INVALID_CONFIG,
      {
        details: { box: fullConfig.box },
        messageKey: 'config.box.invalid',
        messageParams: { message },
        locale
      }
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
export function getPresetChars(type: PresetCharset, locale?: string): string {
  switch (type) {
    case PresetCharset.ASCII:
      return DEFAULT_ASCII_CHARS;
    case PresetCharset.EXTENDED:
      return EXTENDED_CHARS;
    case PresetCharset.CHINESE_SIMPLE:
      return CHINESE_SIMPLE_CHARS;
    default: {
      const safeLocale = normalizeLocale(locale);
      throw new UnicodeArtError(
        translateCoreMessage('charset.unsupported', { type }, safeLocale),
        ErrorCode.UNSUPPORTED_FORMAT,
        {
          details: { type },
          messageKey: 'charset.unsupported',
          messageParams: { type },
          locale: safeLocale
        }
      );
    }
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

export {
  VERSION
} from './version';

//#endregion
