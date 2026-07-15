/**
 * ============================================================================
 * Browser-oriented UnicodeArtJs Core entry.
 *
 * 浏览器入口组合纯算法与 Chrome 120+ 平台适配器，导出浏览器高层 API。它不依赖 Node
 * 内置模块；高层转换当前属于 experimental 能力，调用方应通过
 * {@link getCoreCapabilities} 读取实际能力边界。
 *
 * @packageDocumentation
 */

export * from './pure';

import type { CharMatrix } from './types/charset';
import { PresetCharset } from './types/charset';
import type { ArtConfig } from './types/config';
import { HeightMode, normalizeArtConfigAliases } from './types/config';
import type { ArtResult } from './types/output';
import { ErrorCode, UnicodeArtError } from './types/output';
import type { CoreImageData } from './types/image';
import { imageDataToArt } from './pure/imageDataToArt';
import { calculateDisplayWidth } from './utils/wideCharDetector';
import { browserPlatformAdapter } from './platform/browser/browserPlatformAdapter';
import { normalizeLocale, t as translateCoreMessage } from './i18n';
import { renderSemanticDocumentWithAdapter } from './semantic/render';
import type { SemanticDocument, SemanticRenderOptions } from './types/semantic';

export type {
  CharRenderOptions,
  PrecomputeCharDataOptions,
  TextMeasureOptions,
  TextRenderOptions,
  UnicodeArtPlatformAdapter
} from './platform/types';

export {
  browserPlatformAdapter,
  clearBrowserAdapterCache,
  getBrowserAdapterCacheStats,
  getBrowserRuntimeCapabilities,
  loadBrowserFont
} from './platform/browser/browserPlatformAdapter';

export type {
  BrowserAdapterCacheClearOptions,
  BrowserAdapterCacheStats,
  BrowserBinaryFontSource,
  BrowserFontLoadOptions,
  BrowserFontSource,
  BrowserRuntimeCapabilities
} from './platform/browser/browserPlatformAdapter';

//#region 🟦 Browser High-Level APIs

/**
 * Progress stages emitted by browser high-level conversions.
 *
 * 浏览器高层转换发出的进度阶段。阶段用于展示进度，不是可持久化的工作流协议。
 *
 * @public
 */
export type BrowserProgressStage =
  | 'start'
  | 'loadImage'
  | 'renderText'
  | 'precomputeChars'
  | 'convert'
  | 'done';

/**
 * A progress callback payload for browser conversion.
 *
 * 浏览器转换进度回调的负载；`progress` 位于 0 到 1 之间。
 *
 * @public
 */
export interface BrowserProgressEvent {
  stage: BrowserProgressStage;
  progress: number;
  message?: string;
}

/**
 * Minimal cancellation contract accepted by browser conversions.
 *
 * 浏览器转换接受的最小取消契约。取消是协作式的，无法中断已经进入的同步像素计算。
 *
 * @public
 */
export interface BrowserAbortSignalLike {
  readonly aborted?: boolean;
  throwIfAborted?: () => void;
}

/**
 * Browser-only execution options for high-level conversion.
 *
 * 浏览器高层转换的专用执行选项。输入和输出上限用于保护主线程，不会改变正常输入的
 * 转换结果。
 *
 * @public
 */
export interface BrowserArtOptions {
  charDataMap?: Map<string, CharMatrix>;
  progress?: (event: BrowserProgressEvent) => void;
  signal?: BrowserAbortSignalLike;
  maxInputPixels?: number;
  maxOutputCells?: number;
}

const DEFAULT_BROWSER_MAX_INPUT_PIXELS = 16_000_000;
const DEFAULT_BROWSER_MAX_OUTPUT_CELLS = 300_000;

/**
 * Converts browser image input to Unicode art.
 *
 * 将浏览器图像输入转换为 Unicode 字符画。支持 Core `ImageData`、浏览器 `ImageData`、
 * `Blob`/`File`、URL 字符串和可绘制的 Canvas 图像源；URL 输入受浏览器网络与 CORS
 * 策略约束。
 *
 * @public
 * @remarks
 * **Stability / 稳定性：**此浏览器高层入口目前为 experimental，Chrome 120+ 是已验证
 * 基线。可通过 `progress` 获取阶段通知，并通过兼容 `AbortSignal` 的 `signal` 协作取消。
 *
 * @param input - Browser-supported image input. 浏览器支持的图像输入。
 * @param config - Partial conversion configuration. 部分转换配置。
 * @param options - Browser execution options. 浏览器执行选项。
 * @returns The generated Unicode-art result. 生成后的字符画结果。
 * @throws - Throws `UnicodeArtError` for unsupported input, configured limits,
 * cancellation, or conversion failure. 不支持的输入、超出限制、取消或转换失败时抛出。
 */
export async function imageToArt(
  input: unknown,
  config: Partial<ArtConfig>,
  options: BrowserArtOptions = {}
): Promise<ArtResult> {
  const coreConfig = normalizeArtConfigAliases(config);
  const locale = normalizeLocale(coreConfig.locale);
  assertBrowserNotAborted(options, locale);
  reportBrowserProgress(options, 'start', 0, 'Starting browser image conversion');

  const imageData = await browserPlatformAdapter.loadImage(input);
  assertBrowserNotAborted(options, locale);
  enforceBrowserImageLimits(imageData, coreConfig, options, locale);
  reportBrowserProgress(options, 'loadImage', 0.25, 'Image loaded');

  const charDataMap = options.charDataMap ?? await precomputeBrowserChars(coreConfig);
  assertBrowserNotAborted(options, locale);
  reportBrowserProgress(options, 'precomputeChars', 0.55, 'Character data ready');

  reportBrowserProgress(options, 'convert', 0.7, 'Converting image data');
  const result = imageDataToArt(imageData, coreConfig, { charDataMap });
  reportBrowserProgress(options, 'done', 1, 'Browser image conversion complete');
  return result;
}

/**
 * Renders text with the visual font and converts it to Unicode art in a browser.
 *
 * 在浏览器中先使用视觉字体将文本栅格化，再转换为 Unicode 字符画。字素模板使用
 * `glyphFont`（或兼容字段）生成；视觉字体和字素字体承担不同职责。
 *
 * @public
 * @remarks
 * **Stability / 稳定性：**此入口为 experimental，遵循与 {@link imageToArt} 相同的
 * Chrome 120+、进度和协作式取消边界。
 *
 * @param text - Text to rasterize. 要栅格化的输入文本。
 * @param config - Partial conversion configuration. 部分转换配置。
 * @param options - Browser execution options. 浏览器执行选项。
 * @returns The generated Unicode-art result. 生成后的字符画结果。
 * @throws - Throws `UnicodeArtError` when text is empty, execution is cancelled,
 * configured limits are exceeded, or conversion fails. 空文本、取消、超出限制或转换失败时抛出。
 */
export async function textToArt(
  text: string,
  config: Partial<ArtConfig>,
  options: BrowserArtOptions = {}
): Promise<ArtResult> {
  const coreConfig = normalizeArtConfigAliases(config);
  const locale = normalizeLocale(coreConfig.locale);
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

  assertBrowserNotAborted(options, locale);
  reportBrowserProgress(options, 'start', 0, 'Starting browser text conversion');

  const matrixSize = coreConfig.matrixSize || 6;
  const lines = text.split('\n');
  const lineCount = lines.length;
  const font = await browserPlatformAdapter.loadFont(coreConfig.font || 'monospace', coreConfig.fontStyle);
  const fontReduce = coreConfig.fontReduce ?? 0;
  const lineSpacingPixels = (coreConfig.lineSpacing || 0) * matrixSize;
  const heightInRows = coreConfig.height || lineCount;
  const heightMode = coreConfig.heightMode || HeightMode.LINE;
  let canvasHeight: number;
  let rectunit: number;

  if (heightMode === HeightMode.TOTAL) {
    canvasHeight = heightInRows * matrixSize;
    const totalSpacingPixels = lineSpacingPixels * Math.max(0, lineCount - 1);
    const drawingHeight = canvasHeight - totalSpacingPixels;
    rectunit = Math.max(2, Math.floor(drawingHeight / lineCount));
  } else {
    rectunit = Math.max(2, heightInRows * matrixSize);
    canvasHeight = rectunit * lineCount + lineSpacingPixels * Math.max(0, lineCount - 1);
  }

  const fontSize = Math.max(1, rectunit - fontReduce * 2);
  const canvasWidth = await measureBrowserTextCanvasWidth(lines, font, fontSize, fontReduce, matrixSize);
  assertBrowserNotAborted(options, locale);

  const imageData: CoreImageData = await browserPlatformAdapter.renderTextToImage(text, {
    font,
    fontSize,
    width: canvasWidth,
    height: canvasHeight,
    textAlign: coreConfig.textAlign,
    lineSpacing: coreConfig.lineSpacing,
    heightMode,
    fontReduce,
    rectunit,
    lineSpacingPixels
  });
  assertBrowserNotAborted(options, locale);
  enforceBrowserImageLimits(imageData, coreConfig, options, locale);
  reportBrowserProgress(options, 'renderText', 0.35, 'Text rendered');

  const charDataMap = options.charDataMap ?? await precomputeBrowserChars({
    ...config,
    ...coreConfig,
    matrixSize,
    font
  });
  assertBrowserNotAborted(options, locale);
  reportBrowserProgress(options, 'precomputeChars', 0.6, 'Character data ready');

  reportBrowserProgress(options, 'convert', 0.75, 'Converting rendered text');
  const result = imageDataToArt(
    imageData,
    {
      ...config,
      ...coreConfig,
      height: canvasHeight / matrixSize,
      matrixSize
    },
    { charDataMap }
  );
  reportBrowserProgress(options, 'done', 1, 'Browser text conversion complete');
  return result;
}

/**
 * Renders a versioned semantic document through browser text conversion.
 *
 * 复用 Core 的语义 AST、跨度和字素宽度算法，仅将艺术文本块委托给浏览器 `textToArt`。
 *
 * @public
 * @remarks
 * **Stability / 稳定性：**该能力及其浏览器入口均为 experimental，已验证基线为 Chrome
 * 120+。输入必须是版本化语义文档或可由受限解析器接受的值，不执行任意 HTML 或脚本。
 *
 * @param document - Semantic document value or parseable input. 语义文档值或可解析输入。
 * @param config - Complete normalized configuration. 已归一化的完整配置。
 * @param options - Semantic-layout render options. 语义布局渲染选项。
 * @returns The assembled Unicode-art result. 组装后的字符画结果。
 * @throws - Throws `UnicodeArtError` when semantic validation or rendering fails.
 * 语义文档校验或渲染失败时抛出。
 */
export async function semanticDocumentToArt(
  document: SemanticDocument | unknown,
  config: ArtConfig,
  options: SemanticRenderOptions = {}
): Promise<ArtResult> {
  return renderSemanticDocumentWithAdapter(
    document,
    normalizeArtConfigAliases(config) as ArtConfig,
    async (text, blockConfig) => textToArt(text, blockConfig),
    options
  );
}

async function precomputeBrowserChars(config: Partial<ArtConfig>): Promise<Map<string, CharMatrix>> {
  const matrixSize = config.matrixSize || 6;
  return browserPlatformAdapter.precomputeCharData({
    charset: config.charset || { type: PresetCharset.ASCII },
    matrixSize,
    // 字符模板使用字素字体；未指定时继续兼容旧版视觉字体回退。
    font: config.glyphFontFamily || config.font || 'monospace',
    fontSize: matrixSize,
    fontReduce: 0,
    interpolation: config.interpolation,
    ratio: config.ratio,
    fontStyle: config.fontStyle
  });
}

async function measureBrowserTextCanvasWidth(
  lines: string[],
  font: string,
  fontSize: number,
  fontReduce: number,
  matrixSize: number
): Promise<number> {
  let maxWidth = 0;

  for (const line of lines) {
    const lineWidth = await browserPlatformAdapter.measureTextWidth(line, {
      font,
      fontSize,
      fontReduce
    });
    maxWidth = Math.max(maxWidth, lineWidth);
  }

  if (maxWidth > 0) {
    return Math.ceil(maxWidth);
  }

  return Math.max(...lines.map((line) => calculateDisplayWidth(line))) * matrixSize * 10 || matrixSize * 10;
}

function assertBrowserNotAborted(options: BrowserArtOptions, locale: string | undefined | null): void {
  if (options.signal?.throwIfAborted) {
    options.signal.throwIfAborted();
  }

  if (options.signal?.aborted) {
    throw new UnicodeArtError(
      translateCoreMessage('browser.conversionAborted', {}, locale),
      ErrorCode.OPERATION_ABORTED,
      {
        details: { aborted: true },
        messageKey: 'browser.conversionAborted',
        locale: normalizeLocale(locale)
      }
    );
  }
}

function reportBrowserProgress(
  options: BrowserArtOptions,
  stage: BrowserProgressStage,
  progress: number,
  message?: string
): void {
  options.progress?.({
    stage,
    progress,
    message
  });
}

function enforceBrowserImageLimits(
  imageData: CoreImageData,
  config: Partial<ArtConfig>,
  options: BrowserArtOptions,
  locale: string | undefined | null
): void {
  const maxInputPixels = options.maxInputPixels ?? DEFAULT_BROWSER_MAX_INPUT_PIXELS;
  const maxOutputCells = options.maxOutputCells ?? DEFAULT_BROWSER_MAX_OUTPUT_CELLS;
  const inputPixels = imageData.width * imageData.height;

  if (inputPixels > maxInputPixels) {
    const messageParams = { inputPixels, maxInputPixels };
    throw new UnicodeArtError(
      translateCoreMessage('browser.inputPixels.limit', messageParams, locale),
      ErrorCode.OUT_OF_MEMORY,
      {
        details: { inputPixels, maxInputPixels, width: imageData.width, height: imageData.height },
        messageKey: 'browser.inputPixels.limit',
        messageParams,
        locale: normalizeLocale(locale)
      }
    );
  }

  const matrixSize = config.matrixSize || 6;
  const outputWidth = Math.ceil(imageData.width / matrixSize);
  const outputHeight = Math.ceil(imageData.height / matrixSize);
  const outputCells = outputWidth * outputHeight;

  if (outputCells > maxOutputCells) {
    const messageParams = { outputCells, maxOutputCells };
    throw new UnicodeArtError(
      translateCoreMessage('browser.outputCells.limit', messageParams, locale),
      ErrorCode.OUT_OF_MEMORY,
      {
        details: { outputCells, maxOutputCells, outputWidth, outputHeight, matrixSize },
        messageKey: 'browser.outputCells.limit',
        messageParams,
        locale: normalizeLocale(locale)
      }
    );
  }
}

//#endregion
