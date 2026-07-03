/**
 * ============================================================================
 * 🟦 UnicodeArtJs browser entry
 * ============================================================================
 *
 * 🔶 Module responsibility
 * Source-level browser entry prepared for `browser-adapt-phase-4` packaging.
 * It combines pure algorithms with the Chrome 120+ browser platform adapter.
 * ============================================================================
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
  BrowserFontLoadOptions,
  BrowserFontSource,
  BrowserRuntimeCapabilities
} from './platform/browser/browserPlatformAdapter';

//#region 🟦 Browser High-Level APIs

export type BrowserProgressStage =
  | 'start'
  | 'loadImage'
  | 'renderText'
  | 'precomputeChars'
  | 'convert'
  | 'done';

export interface BrowserProgressEvent {
  stage: BrowserProgressStage;
  progress: number;
  message?: string;
}

export interface BrowserAbortSignalLike {
  readonly aborted?: boolean;
  throwIfAborted?: () => void;
}

export interface BrowserArtOptions {
  charDataMap?: Map<string, CharMatrix>;
  progress?: (event: BrowserProgressEvent) => void;
  signal?: BrowserAbortSignalLike;
  maxInputPixels?: number;
  maxOutputCells?: number;
}

const DEFAULT_BROWSER_MAX_INPUT_PIXELS = 16_000_000;
const DEFAULT_BROWSER_MAX_OUTPUT_CELLS = 300_000;

export async function imageToArt(
  input: unknown,
  config: Partial<ArtConfig>,
  options: BrowserArtOptions = {}
): Promise<ArtResult> {
  const coreConfig = normalizeArtConfigAliases(config);
  assertBrowserNotAborted(options);
  reportBrowserProgress(options, 'start', 0, 'Starting browser image conversion');

  const imageData = await browserPlatformAdapter.loadImage(input);
  assertBrowserNotAborted(options);
  enforceBrowserImageLimits(imageData, coreConfig, options);
  reportBrowserProgress(options, 'loadImage', 0.25, 'Image loaded');

  const charDataMap = options.charDataMap ?? await precomputeBrowserChars(coreConfig);
  assertBrowserNotAborted(options);
  reportBrowserProgress(options, 'precomputeChars', 0.55, 'Character data ready');

  reportBrowserProgress(options, 'convert', 0.7, 'Converting image data');
  const result = imageDataToArt(imageData, coreConfig, { charDataMap });
  reportBrowserProgress(options, 'done', 1, 'Browser image conversion complete');
  return result;
}

export async function textToArt(
  text: string,
  config: Partial<ArtConfig>,
  options: BrowserArtOptions = {}
): Promise<ArtResult> {
  const coreConfig = normalizeArtConfigAliases(config);
  if (!text || text.length === 0) {
    throw new UnicodeArtError(
      'text must not be empty',
      ErrorCode.INVALID_INPUT,
      { text }
    );
  }

  assertBrowserNotAborted(options);
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
  assertBrowserNotAborted(options);

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
  assertBrowserNotAborted(options);
  enforceBrowserImageLimits(imageData, coreConfig, options);
  reportBrowserProgress(options, 'renderText', 0.35, 'Text rendered');

  const charDataMap = options.charDataMap ?? await precomputeBrowserChars({
    ...config,
    ...coreConfig,
    matrixSize,
    font
  });
  assertBrowserNotAborted(options);
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

async function precomputeBrowserChars(config: Partial<ArtConfig>): Promise<Map<string, CharMatrix>> {
  const matrixSize = config.matrixSize || 6;
  return browserPlatformAdapter.precomputeCharData({
    charset: config.charset || { type: PresetCharset.ASCII },
    matrixSize,
    font: config.font || 'monospace',
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

function assertBrowserNotAborted(options: BrowserArtOptions): void {
  if (options.signal?.throwIfAborted) {
    options.signal.throwIfAborted();
  }

  if (options.signal?.aborted) {
    throw new UnicodeArtError(
      'Browser conversion aborted',
      ErrorCode.INVALID_INPUT,
      { aborted: true }
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
  options: BrowserArtOptions
): void {
  const maxInputPixels = options.maxInputPixels ?? DEFAULT_BROWSER_MAX_INPUT_PIXELS;
  const maxOutputCells = options.maxOutputCells ?? DEFAULT_BROWSER_MAX_OUTPUT_CELLS;
  const inputPixels = imageData.width * imageData.height;

  if (inputPixels > maxInputPixels) {
    throw new UnicodeArtError(
      `Browser input image is too large: ${inputPixels} pixels exceeds limit ${maxInputPixels}`,
      ErrorCode.OUT_OF_MEMORY,
      { inputPixels, maxInputPixels, width: imageData.width, height: imageData.height }
    );
  }

  const matrixSize = config.matrixSize || 6;
  const outputWidth = Math.ceil(imageData.width / matrixSize);
  const outputHeight = Math.ceil(imageData.height / matrixSize);
  const outputCells = outputWidth * outputHeight;

  if (outputCells > maxOutputCells) {
    throw new UnicodeArtError(
      `Browser output is too large: ${outputCells} cells exceeds limit ${maxOutputCells}`,
      ErrorCode.OUT_OF_MEMORY,
      { outputCells, maxOutputCells, outputWidth, outputHeight, matrixSize }
    );
  }
}

//#endregion
