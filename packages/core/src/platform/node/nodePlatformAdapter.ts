/**
 * ============================================================================
 * 🟦 Node platform adapter
 * ============================================================================
 *
 * 🔶 Module responsibility
 * Centralizes Node-only image, font, and text rendering capabilities used by
 * the default Node entry. This keeps the pure core free from concrete Node image
 * backends, Skia Canvas compatibility runtime, filesystem, and process assumptions.
 * ============================================================================
 */

import type { UnicodeArtPlatformAdapter } from '../types';
import {
  loadImage as loadImageWithNodeBackend,
  renderTextToImage as renderTextToImageWithCanvas,
  resizeImage as resizeImageWithNodeBackend
} from '../../preprocessor';
import {
  loadFont as loadFontWithCanvas,
  precomputeCharData as precomputeCharDataWithCanvas,
  renderCharToMatrix as renderCharToMatrixWithCanvas
} from '../../charRenderer';
import type { CoreImageData } from '../../types/image';
import { ErrorCode, UnicodeArtError } from '../../types/output';
import { getNodeTextCanvas, isNodeTextCanvasUnavailable } from './nodeTextCanvas';

//#region 🟦 Adapter

export const nodePlatformAdapter: UnicodeArtPlatformAdapter = {
  async loadImage(input) {
    if (typeof input !== 'string') {
      throw new UnicodeArtError(
        'Node image loading expects a local file path string',
        ErrorCode.INVALID_INPUT,
        { inputType: typeof input }
      );
    }

    return loadImageWithNodeBackend(input);
  },

  async resizeImage(image, targetWidth, targetHeight, interpolation = 'bicubic') {
    return resizeImageWithNodeBackend(image, targetWidth, targetHeight, interpolation);
  },

  async renderTextToImage(text, options) {
    return renderTextToImageWithCanvas(
      text,
      options.font,
      options.fontSize,
      options.width,
      options.height,
      options.textAlign,
      options.lineSpacing,
      options.heightMode,
      options.fontReduce,
      options.rectunit,
      options.lineSpacingPixels
    );
  },

  async measureTextWidth(text, options) {
    return measureTextWidthWithCanvas(text, options.font, options.fontSize, options.fontReduce ?? 0);
  },

  async renderCharToMatrix(char, options) {
    return renderCharToMatrixWithCanvas(
      char,
      options.matrixSize,
      options.font,
      options.fontSize,
      options.fontReduce,
      options.interpolation,
      options.ratio
    );
  },

  async precomputeCharData(options) {
    return precomputeCharDataWithCanvas(
      options.charset,
      options.matrixSize,
      options.font,
      options.fontSize,
      options.fontReduce,
      options.interpolation,
      options.ratio,
      options.fontStyle
    );
  },

  async loadFont(font, fontStyle) {
    return loadFontWithCanvas(font, fontStyle);
  }
};

//#endregion

//#region 🟦 Node Canvas Helpers

function measureTextWidthWithCanvas(
  text: string,
  font: string,
  fontSize: number,
  fontReduce: number
): number {
  try {
    const { createCanvas } = getNodeTextCanvas();
    const tempCanvas = createCanvas(1, 1);
    const tempCtx = tempCanvas.getContext('2d');
    const fittedFontSize = resolveFittedTextFontSize(tempCtx, font, fontSize);
    tempCtx.font = `${fittedFontSize}px ${formatCanvasFontFamily(font)}`;
    tempCtx.textBaseline = 'alphabetic';

    return Array.from(text).reduce((sum, char) => {
      const measuredWidth = tempCtx.measureText(char).width;
      const charWidth = fittedFontSize < 8 ? Math.round(measuredWidth) : Math.ceil(measuredWidth);
      return sum + charWidth + fontReduce * 2;
    }, 0);
  } catch (error: any) {
    if (isNodeTextCanvasUnavailable(error)) {
      throw new UnicodeArtError(
        'Text measurement requires @napi-rs/canvas; confirm that Core dependencies are installed',
        ErrorCode.DEPENDENCY_MISSING,
        { dependency: '@napi-rs/canvas' }
      );
    }

    throw new UnicodeArtError(
      `Text measurement failed: ${error.message}`,
      ErrorCode.TEXT_RENDER_FAILED,
      { originalError: error }
    );
  }
}

function formatCanvasFontFamily(font: string): string {
  const escapedFont = font.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escapedFont}"`;
}

function resolveFittedTextFontSize(ctx: any, font: string, requestedFontSize: number): number {
  const family = formatCanvasFontFamily(font);
  ctx.font = `${requestedFontSize}px ${family}`;
  ctx.textBaseline = 'alphabetic';
  const metrics = measureTextVerticalMetrics(ctx, 'Mg|中文测试jyqpQÅÄÉ国');
  if (metrics <= requestedFontSize || metrics <= 0) {
    return requestedFontSize;
  }

  // 中文注释：与文本渲染路径保持一致，宽度测量也使用自动收缩后的视觉字体字号。
  return Math.max(1, Math.floor(requestedFontSize * requestedFontSize / metrics));
}

function measureTextVerticalMetrics(ctx: any, sample: string): number {
  let ascent = 0;
  let descent = 0;

  for (const glyph of Array.from(sample.length > 0 ? sample : ' ')) {
    // 中文注释：必须与预处理器的逐字绘制、逐字高度度量保持一致，否则测宽阶段
    // 与实际渲染阶段会得到不同的自动缩小字号，进而错误放大居中画布的左右留白。
    const metrics = ctx.measureText(glyph);
    ascent = Math.max(ascent, Math.ceil(metrics.actualBoundingBoxAscent || 0));
    descent = Math.max(descent, Math.ceil(metrics.actualBoundingBoxDescent || 0));
  }

  const height = ascent + descent;
  if (height > 0) return height;
  return parseCanvasFontSize(ctx.font);
}

function parseCanvasFontSize(font: string): number {
  const match = /(\d+(?:\.\d+)?)px/u.exec(font);
  return match ? Number(match[1]) : 1;
}

//#endregion

export type NodePlatformImageData = CoreImageData;
