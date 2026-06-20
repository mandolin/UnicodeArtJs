/**
 * ============================================================================
 * 🟦 Browser platform adapter
 * ============================================================================
 *
 * 🔶 Module responsibility
 * Provides Chrome 120+ image, text, glyph, and font rendering implementations
 * without importing Node-only modules.
 *
 * 🔶 Type strategy
 * The core package currently compiles without the DOM lib. This adapter uses
 * lightweight structural types and runtime feature checks so Node typecheck
 * remains stable while browser runtimes can use native Canvas APIs.
 * ============================================================================
 */

import type { CharMatrix } from '../../types/charset';
import { CharType } from '../../types/charset';
import { Interpolation } from '../../types/config';
import type { CoreImageData } from '../../types/image';
import { ErrorCode, UnicodeArtError } from '../../types/output';
import type {
  CharRenderOptions,
  PrecomputeCharDataOptions,
  TextMeasureOptions,
  TextRenderOptions,
  UnicodeArtPlatformAdapter
} from '../types';
import { getPresetChars } from '../../constants';
import { resizeInterpolate } from '../../sampler';
import { isWideChar as detectWideChar } from '../../utils/wideCharDetector';

//#region 🟦 Lightweight Browser Types

type CanvasLike = {
  width: number;
  height: number;
  getContext(type: '2d', options?: unknown): CanvasRenderingContextLike | null;
};

type CanvasRenderingContextLike = {
  fillStyle: string;
  font: string;
  textBaseline: string;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  drawImage(source: unknown, dx: number, dy: number, width?: number, height?: number): void;
  getImageData(x: number, y: number, width: number, height: number): { data: Uint8ClampedArray | Uint8Array };
};

type BrowserImageDataLike = {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
};

type BrowserImageSourceLike = {
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
};

//#endregion

//#region 🟦 Adapter

export interface BrowserAdapterCacheStats {
  fonts: number;
  glyphs: number;
  charData: number;
}

export interface BrowserAdapterCacheClearOptions {
  fonts?: boolean;
  glyphs?: boolean;
  charData?: boolean;
}

export interface BrowserRuntimeCapabilities {
  offscreenCanvas: boolean;
  canvas2d: boolean;
  createImageBitmap: boolean;
  fontFace: boolean;
  worker: boolean;
}

const fontLoadCache = new Map<string, Promise<string>>();
const glyphMatrixCache = new Map<string, Float32Array>();
const charDataMapCache = new Map<string, Promise<Map<string, CharMatrix>>>();

export function clearBrowserAdapterCache(options: BrowserAdapterCacheClearOptions = {}): void {
  const clearAll = options.fonts === undefined && options.glyphs === undefined && options.charData === undefined;

  if (clearAll || options.fonts) {
    fontLoadCache.clear();
  }

  if (clearAll || options.glyphs) {
    glyphMatrixCache.clear();
  }

  if (clearAll || options.charData) {
    charDataMapCache.clear();
  }
}

export function getBrowserAdapterCacheStats(): BrowserAdapterCacheStats {
  return {
    fonts: fontLoadCache.size,
    glyphs: glyphMatrixCache.size,
    charData: charDataMapCache.size
  };
}

export function getBrowserRuntimeCapabilities(): BrowserRuntimeCapabilities {
  const scope = globalThis as any;

  return {
    offscreenCanvas: typeof scope.OffscreenCanvas === 'function',
    canvas2d: typeof scope.OffscreenCanvas === 'function' || Boolean(scope.document?.createElement),
    createImageBitmap: typeof scope.createImageBitmap === 'function',
    fontFace: typeof scope.FontFace === 'function',
    worker: typeof scope.Worker === 'function'
  };
}

export const browserPlatformAdapter: UnicodeArtPlatformAdapter = {
  async loadImage(input) {
    if (isCoreImageData(input)) {
      return input;
    }

    if (isRgbaImageData(input)) {
      return rgbaImageDataToCore(input);
    }

    if (isBlobLike(input)) {
      const bitmap = await createBitmapFromBlob(input);
      return imageSourceToCore(bitmap);
    }

    if (typeof input === 'string' || isUrlLike(input)) {
      const blob = await fetchImageBlob(String(input));
      const bitmap = await createBitmapFromBlob(blob);
      return imageSourceToCore(bitmap);
    }

    if (isCanvasImageSource(input)) {
      return imageSourceToCore(input);
    }

    throw new UnicodeArtError(
      'Unsupported browser image input',
      ErrorCode.INVALID_INPUT,
      { input }
    );
  },

  async resizeImage(image, targetWidth, targetHeight, interpolation = 'bicubic') {
    validateCoreImageData(image);

    const data = new Uint8Array(targetWidth * targetHeight);
    const method = normalizeInterpolation(interpolation);

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const value = resizeInterpolate(
          image.data,
          image.width,
          image.height,
          targetWidth,
          targetHeight,
          x,
          y,
          method
        );
        data[y * targetWidth + x] = Math.max(0, Math.min(255, Math.round(value)));
      }
    }

    return {
      width: targetWidth,
      height: targetHeight,
      data
    };
  },

  async renderTextToImage(text, options) {
    return renderTextToCoreImage(text, options);
  },

  async measureTextWidth(text, options) {
    return measureTextWidthWithCanvas(text, options);
  },

  async renderCharToMatrix(char, options) {
    const cacheKey = createGlyphCacheKey(char, options);
    const cachedMatrix = glyphMatrixCache.get(cacheKey);
    if (cachedMatrix) {
      return cachedMatrix;
    }

    const matrix = renderCharToMatrixWithCanvas(char, options);
    glyphMatrixCache.set(cacheKey, matrix);
    return matrix;
  },

  async precomputeCharData(options) {
    const cacheKey = createCharDataCacheKey(options);
    const cachedMap = charDataMapCache.get(cacheKey);
    if (cachedMap) {
      return cachedMap;
    }

    const computedMap = precomputeCharDataUncached(options).catch((error) => {
      charDataMapCache.delete(cacheKey);
      throw error;
    });
    charDataMapCache.set(cacheKey, computedMap);
    return computedMap;
  },

  async loadFont(font, fontStyle) {
    return loadBrowserFont(font, { style: fontStyle, fallbackFamily: font });
  }
};

async function precomputeCharDataUncached(options: PrecomputeCharDataOptions): Promise<Map<string, CharMatrix>> {
    const chars = options.charset.customChars || getPresetChars(options.charset.type);
    if (!chars || chars.length === 0) {
      throw new UnicodeArtError(
        'Charset must not be empty',
        ErrorCode.INVALID_CONFIG,
        { charset: options.charset }
      );
    }

    const font = await browserPlatformAdapter.loadFont(options.font, options.fontStyle);
    const fontSize = options.fontSize ?? options.matrixSize;
    const charDataMap = new Map<string, CharMatrix>();

    for (const char of chars) {
      try {
        const matrix = await browserPlatformAdapter.renderCharToMatrix(char, {
          matrixSize: options.matrixSize,
          font,
          fontSize,
          fontReduce: options.fontReduce,
          interpolation: options.interpolation,
          ratio: options.ratio
        });
        const wide = detectWideChar(char);
        charDataMap.set(char, {
          char,
          matrix,
          type: wide ? CharType.WIDE : CharType.NORMAL,
          width: wide ? options.matrixSize * 2 : options.matrixSize,
          height: options.matrixSize
        });
      } catch (error) {
        // Match the Node adapter's tolerant behavior for individual glyphs.
        const consoleLike = (globalThis as any).console;
        if (consoleLike?.warn) {
          consoleLike.warn(`Warning: failed to render glyph '${char}', skipped`, error);
        }
      }
    }

    if (charDataMap.size === 0) {
      throw new UnicodeArtError(
        'All glyph rendering failed',
        ErrorCode.CHAR_RENDER_FAILED,
        { charset: options.charset }
      );
    }

    return charDataMap;
  }

//#endregion

//#region 🟦 Image Loading

function isCoreImageData(input: unknown): input is CoreImageData {
  return Boolean(
    input &&
    typeof input === 'object' &&
    Number.isInteger((input as CoreImageData).width) &&
    Number.isInteger((input as CoreImageData).height) &&
    (input as CoreImageData).data instanceof Uint8Array &&
    (input as CoreImageData).data.length === (input as CoreImageData).width * (input as CoreImageData).height
  );
}

function isRgbaImageData(input: unknown): input is BrowserImageDataLike {
  return Boolean(
    input &&
    typeof input === 'object' &&
    Number.isInteger((input as BrowserImageDataLike).width) &&
    Number.isInteger((input as BrowserImageDataLike).height) &&
    (input as BrowserImageDataLike).data &&
    (input as BrowserImageDataLike).data.length ===
      (input as BrowserImageDataLike).width * (input as BrowserImageDataLike).height * 4
  );
}

function rgbaImageDataToCore(imageData: BrowserImageDataLike): CoreImageData {
  return {
    width: imageData.width,
    height: imageData.height,
    data: rgbaToGrayscale(imageData.data, imageData.width, imageData.height)
  };
}

function isBlobLike(input: unknown): boolean {
  const scope = globalThis as any;
  return typeof scope.Blob === 'function' && input instanceof scope.Blob;
}

function isUrlLike(input: unknown): boolean {
  const scope = globalThis as any;
  return typeof scope.URL === 'function' && input instanceof scope.URL;
}

function isCanvasImageSource(input: unknown): input is BrowserImageSourceLike {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const source = input as BrowserImageSourceLike;
  return Boolean(
    source.width ||
    source.height ||
    source.naturalWidth ||
    source.naturalHeight ||
    source.videoWidth ||
    source.videoHeight
  );
}

async function fetchImageBlob(url: string): Promise<unknown> {
  const scope = globalThis as any;
  if (typeof scope.fetch !== 'function') {
    throw new UnicodeArtError(
      'Browser URL image loading requires fetch',
      ErrorCode.DEPENDENCY_MISSING,
      { dependency: 'fetch' }
    );
  }

  const response = await scope.fetch(url);
  if (!response?.ok) {
    throw new UnicodeArtError(
      `Image fetch failed: ${response?.status ?? 'unknown'}`,
      ErrorCode.IMAGE_LOAD_FAILED,
      { url, status: response?.status }
    );
  }

  return response.blob();
}

async function createBitmapFromBlob(blob: unknown): Promise<unknown> {
  const scope = globalThis as any;
  if (typeof scope.createImageBitmap !== 'function') {
    throw new UnicodeArtError(
      'Browser image decoding requires createImageBitmap',
      ErrorCode.DEPENDENCY_MISSING,
      { dependency: 'createImageBitmap' }
    );
  }

  return scope.createImageBitmap(blob);
}

function imageSourceToCore(source: unknown): CoreImageData {
  const width = getImageSourceWidth(source);
  const height = getImageSourceHeight(source);
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);
  ctx.drawImage(source, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  return {
    width,
    height,
    data: rgbaToGrayscale(imageData.data, width, height)
  };
}

function getImageSourceWidth(source: unknown): number {
  const candidate = source as BrowserImageSourceLike;
  const width = candidate.width ?? candidate.naturalWidth ?? candidate.videoWidth;
  if (!Number.isFinite(width) || Number(width) <= 0) {
    throw new UnicodeArtError(
      'Browser image source width is invalid',
      ErrorCode.INVALID_INPUT,
      { width }
    );
  }

  return Math.floor(Number(width));
}

function getImageSourceHeight(source: unknown): number {
  const candidate = source as BrowserImageSourceLike;
  const height = candidate.height ?? candidate.naturalHeight ?? candidate.videoHeight;
  if (!Number.isFinite(height) || Number(height) <= 0) {
    throw new UnicodeArtError(
      'Browser image source height is invalid',
      ErrorCode.INVALID_INPUT,
      { height }
    );
  }

  return Math.floor(Number(height));
}

//#endregion

//#region 🟦 Canvas Rendering

function renderTextToCoreImage(text: string, options: TextRenderOptions): CoreImageData {
  try {
    const canvas = createCanvas(options.width, options.height);
    const ctx = get2dContext(canvas);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, options.width, options.height);

    const fontSize = Math.max(1, options.fontSize);
    const fontReduce = options.fontReduce ?? 0;
    const lines = text.split('\n');

    ctx.fillStyle = '#000000';
    ctx.font = `${fontSize}px ${formatCanvasFontFamily(options.font)}`;
    ctx.textBaseline = 'top';

    const effectiveLineSpacing = options.lineSpacingPixels ?? options.lineSpacing ?? 0;
    let rectunit: number;
    if (options.rectunit !== undefined) {
      rectunit = options.rectunit;
    } else if ((options.heightMode ?? 'line') === 'line') {
      rectunit = options.height;
    } else {
      const totalSpacingPixels = effectiveLineSpacing * Math.max(0, lines.length - 1);
      const drawingHeight = options.height - totalSpacingPixels;
      rectunit = Math.floor(drawingHeight / lines.length);
    }

    let currentY = fontReduce;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const charWidths: number[] = [];
      let lineWidth = 0;

      for (const char of line) {
        const charWidth = measureSingleCharWidth(ctx, char, fontSize);
        charWidths.push(charWidth);
        lineWidth += charWidth + fontReduce * 2;
      }

      let currentX = resolveTextX(options.textAlign, options.width, lineWidth, fontReduce);
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        ctx.fillText(line[charIndex], currentX, currentY);
        currentX += charWidths[charIndex] + fontReduce * 2;
      }

      currentY += rectunit;
      if (lineIndex < lines.length - 1) {
        currentY += effectiveLineSpacing;
      }
    }

    const imageData = ctx.getImageData(0, 0, options.width, options.height);
    const grayData = rgbaToGrayscale(imageData.data, options.width, options.height);
    applyTotalModeTextParityCorrection(
      grayData,
      options.width,
      options.height,
      lines.length,
      fontReduce,
      rectunit,
      effectiveLineSpacing,
      options.heightMode ?? 'line'
    );

    return {
      width: options.width,
      height: options.height,
      data: grayData
    };
  } catch (error: any) {
    if (error instanceof UnicodeArtError) {
      throw error;
    }

    throw new UnicodeArtError(
      `Browser text rendering failed: ${error.message}`,
      ErrorCode.TEXT_RENDER_FAILED,
      { originalError: error }
    );
  }
}

function measureTextWidthWithCanvas(text: string, options: TextMeasureOptions): number {
  const canvas = createCanvas(1, 1);
  const ctx = get2dContext(canvas);
  const fontReduce = options.fontReduce ?? 0;
  ctx.font = `${options.fontSize}px ${formatCanvasFontFamily(options.font)}`;

  return Array.from(text).reduce((sum, char) => {
    return sum + measureSingleCharWidth(ctx, char, options.fontSize) + fontReduce * 2;
  }, 0);
}

function renderCharToMatrixWithCanvas(char: string, options: CharRenderOptions): Float32Array {
  try {
    const matrixSize = options.matrixSize;
    const ratio = options.ratio ?? 2.0;
    const wide = detectWideChar(char);
    const canvasWidth = wide ? Math.round(matrixSize * 2 / ratio) : Math.round(matrixSize / ratio);
    const canvasHeight = matrixSize;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = get2dContext(canvas);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#000000';
    ctx.font = `${Math.max(1, options.fontSize - (options.fontReduce ?? 0) * 2)}px ${formatCanvasFontFamily(options.font)}`;
    ctx.textBaseline = 'top';
    ctx.fillText(char, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const grayData = rgbaToGrayscale(imageData.data, canvasWidth, canvasHeight);
    const targetWidth = wide ? matrixSize * 2 : matrixSize;

    return resizeGrayscaleToNormalized(
      grayData,
      canvasWidth,
      canvasHeight,
      targetWidth,
      matrixSize,
      options.interpolation ?? Interpolation.BILINEAR
    );
  } catch (error: any) {
    if (error instanceof UnicodeArtError) {
      throw error;
    }

    throw new UnicodeArtError(
      `Browser glyph rendering failed '${char}': ${error.message}`,
      ErrorCode.CHAR_RENDER_FAILED,
      { originalError: error, char }
    );
  }
}

function createCanvas(width: number, height: number): CanvasLike {
  const scope = globalThis as any;

  if (typeof scope.OffscreenCanvas === 'function') {
    return new scope.OffscreenCanvas(width, height);
  }

  if (scope.document?.createElement) {
    const canvas = scope.document.createElement('canvas') as CanvasLike;
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  throw new UnicodeArtError(
    'Browser canvas rendering requires OffscreenCanvas or document.createElement("canvas")',
    ErrorCode.DEPENDENCY_MISSING,
    { dependency: 'Canvas' }
  );
}

function get2dContext(canvas: CanvasLike): CanvasRenderingContextLike {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new UnicodeArtError(
      'Unable to create 2D canvas context',
      ErrorCode.TEXT_RENDER_FAILED,
      { canvas }
    );
  }

  return ctx;
}

function measureSingleCharWidth(ctx: CanvasRenderingContextLike, char: string, fontSize: number): number {
  const measuredWidth = ctx.measureText(char).width;
  return fontSize < 8 ? Math.round(measuredWidth) : Math.ceil(measuredWidth);
}

function resolveTextX(
  textAlign: string | undefined,
  width: number,
  lineWidth: number,
  fontReduce: number
): number {
  if (textAlign === 'center') {
    return fontReduce + Math.floor((width - lineWidth) / 2);
  }

  if (textAlign === 'right') {
    return fontReduce + (width - lineWidth);
  }

  return fontReduce;
}

function formatCanvasFontFamily(font: string): string {
  const escapedFont = font.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escapedFont}"`;
}

//#endregion

//#region 🟦 Pixel Helpers

function validateCoreImageData(imageData: CoreImageData): void {
  if (!isCoreImageData(imageData)) {
    throw new UnicodeArtError(
      'Invalid CoreImageData',
      ErrorCode.INVALID_INPUT,
      { imageData }
    );
  }
}

function rgbaToGrayscale(
  rgbaData: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const pixelCount = width * height;
  const grayData = new Uint8Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    grayData[i] = rgbToGrayscale(rgbaData[offset], rgbaData[offset + 1], rgbaData[offset + 2]);
  }

  return grayData;
}

function rgbToGrayscale(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

function resizeGrayscaleToNormalized(
  data: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  interpolation: Interpolation
): Float32Array {
  const normalized = new Float32Array(targetWidth * targetHeight);

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const value = resizeInterpolate(data, sourceWidth, sourceHeight, targetWidth, targetHeight, x, y, interpolation);
      normalized[y * targetWidth + x] = Math.max(0, Math.min(255, Math.round(value))) / 255.0;
    }
  }

  return normalized;
}

function normalizeInterpolation(interpolation: string): Interpolation {
  switch (interpolation) {
    case Interpolation.NEAREST:
      return Interpolation.NEAREST;
    case Interpolation.BILINEAR:
      return Interpolation.BILINEAR;
    case Interpolation.LANCZOS:
      return Interpolation.LANCZOS;
    case Interpolation.BICUBIC:
    default:
      return Interpolation.BICUBIC;
  }
}

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

function darkenTextBand(data: Uint8Array, width: number, startY: number, endY: number, amount: number): void {
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

//#endregion

//#region 🟦 Font Helpers

export type BrowserFontSource = string | ArrayBuffer | ArrayBufferView | unknown;

export interface BrowserFontLoadOptions {
  family?: string;
  style?: string;
  fallbackFamily?: string;
}

export async function loadBrowserFont(
  source: BrowserFontSource,
  options: BrowserFontLoadOptions = {}
): Promise<string> {
  const cacheKey = createFontCacheKey(source, options);
  if (cacheKey) {
    const cachedFont = fontLoadCache.get(cacheKey);
    if (cachedFont) {
      return cachedFont;
    }

    const loadedFont = loadBrowserFontUncached(source, options).catch((error) => {
      fontLoadCache.delete(cacheKey);
      throw error;
    });
    fontLoadCache.set(cacheKey, loadedFont);
    return loadedFont;
  }

  return loadBrowserFontUncached(source, options);
}

async function loadBrowserFontUncached(
  source: BrowserFontSource,
  options: BrowserFontLoadOptions = {}
): Promise<string> {
  if (typeof source === 'string' && !looksLikeFontSource(source)) {
    return options.family || options.fallbackFamily || source;
  }

  const scope = globalThis as any;
  if (typeof scope.FontFace !== 'function') {
    if (typeof source === 'string') {
      return options.family || options.fallbackFamily || source;
    }

    throw new UnicodeArtError(
      'Browser font loading requires FontFace',
      ErrorCode.DEPENDENCY_MISSING,
      { dependency: 'FontFace' }
    );
  }

  const family = options.family || (typeof source === 'string' ? deriveFontFamily(source) : 'unicode-art-font');
  const descriptors = fontStyleToDescriptors(options.style);
  const fontFaceSource = await toFontFaceSource(source);
  const face = new scope.FontFace(family, fontFaceSource, descriptors);
  const loadedFace = await face.load();

  if (scope.document?.fonts?.add) {
    scope.document.fonts.add(loadedFace);
  }

  return family;
}

function createFontCacheKey(source: BrowserFontSource, options: BrowserFontLoadOptions): string | null {
  if (typeof source === 'string') {
    return JSON.stringify({
      source,
      family: options.family,
      style: options.style,
      fallbackFamily: options.fallbackFamily
    });
  }

  if (options.family) {
    return JSON.stringify({
      source: '[binary-font]',
      family: options.family,
      style: options.style,
      fallbackFamily: options.fallbackFamily
    });
  }

  return null;
}

function createGlyphCacheKey(char: string, options: CharRenderOptions): string {
  return JSON.stringify({
    char,
    matrixSize: options.matrixSize,
    font: options.font,
    fontSize: options.fontSize,
    fontReduce: options.fontReduce ?? 0,
    interpolation: options.interpolation ?? Interpolation.BILINEAR,
    ratio: options.ratio ?? 2.0
  });
}

function createCharDataCacheKey(options: PrecomputeCharDataOptions): string {
  return JSON.stringify({
    charsetType: options.charset.type,
    customChars: options.charset.customChars,
    matrixSize: options.matrixSize,
    font: options.font,
    fontSize: options.fontSize ?? options.matrixSize,
    fontReduce: options.fontReduce ?? 0,
    interpolation: options.interpolation ?? Interpolation.BILINEAR,
    ratio: options.ratio ?? 2.0,
    fontStyle: options.fontStyle
  });
}

function looksLikeFontSource(font: string): boolean {
  return /^(https?:|data:|blob:)/i.test(font) || /\.(?:ttf|otf|woff2?|ttc)(?:[?#].*)?$/i.test(font);
}

function deriveFontFamily(font: string): string {
  const cleaned = font.split(/[?#]/)[0] || 'unicode-art-font';
  const fileName = cleaned.split(/[\\/]/).pop() || cleaned;
  return fileName.replace(/\.(?:ttf|otf|woff2?|ttc)$/i, '') || 'unicode-art-font';
}

function fontStyleToDescriptors(fontStyle: string | undefined): Record<string, string> {
  switch (fontStyle) {
    case 'bold':
      return { weight: '700', style: 'normal' };
    case 'italic':
      return { weight: '400', style: 'italic' };
    case 'bold-italic':
      return { weight: '700', style: 'italic' };
    default:
      return { weight: '400', style: 'normal' };
  }
}

async function toFontFaceSource(source: BrowserFontSource): Promise<string | ArrayBuffer | ArrayBufferView> {
  if (typeof source === 'string') {
    return `url("${source.replace(/"/g, '\\"')}")`;
  }

  if (source instanceof ArrayBuffer || ArrayBuffer.isView(source as any)) {
    return source as ArrayBuffer | ArrayBufferView;
  }

  if (isBlobLike(source) && typeof (source as any).arrayBuffer === 'function') {
    return (source as any).arrayBuffer();
  }

  throw new UnicodeArtError(
    'Unsupported browser font source',
    ErrorCode.INVALID_INPUT,
    { source }
  );
}

//#endregion

export type BrowserPlatformImageData = CoreImageData;
