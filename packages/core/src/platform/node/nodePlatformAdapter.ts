/**
 * ============================================================================
 * 🟦 Node platform adapter
 * ============================================================================
 *
 * 🔶 Module responsibility
 * Centralizes Node-only image, font, and text rendering capabilities used by
 * the default Node entry. This keeps the pure core free from `sharp`,
 * `node-canvas`, filesystem, and process assumptions.
 * ============================================================================
 */

import type { UnicodeArtPlatformAdapter } from '../types';
import {
  loadImage as loadImageWithSharp,
  renderTextToImage as renderTextToImageWithCanvas,
  resizeImage as resizeImageWithSharp
} from '../../preprocessor';
import {
  loadFont as loadFontWithCanvas,
  precomputeCharData as precomputeCharDataWithCanvas,
  renderCharToMatrix as renderCharToMatrixWithCanvas
} from '../../charRenderer';
import type { CoreImageData } from '../../types/image';
import { ErrorCode, UnicodeArtError } from '../../types/output';

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

    return loadImageWithSharp(input);
  },

  async resizeImage(image, targetWidth, targetHeight, interpolation = 'bicubic') {
    return resizeImageWithSharp(image, targetWidth, targetHeight, interpolation);
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createCanvas } = require('canvas');
    const tempCanvas = createCanvas(1, 1);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${fontSize}px ${formatCanvasFontFamily(font)}`;

    return Array.from(text).reduce((sum, char) => {
      const measuredWidth = tempCtx.measureText(char).width;
      const charWidth = fontSize < 8 ? Math.round(measuredWidth) : Math.ceil(measuredWidth);
      return sum + charWidth + fontReduce * 2;
    }, 0);
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('canvas')) {
      throw new UnicodeArtError(
        'Text measurement requires canvas dependency, please run: npm install canvas',
        ErrorCode.DEPENDENCY_MISSING,
        { dependency: 'canvas' }
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

//#endregion

export type NodePlatformImageData = CoreImageData;
