/**
 * ============================================================================
 * 🟦 Pure image-data conversion module
 * ============================================================================
 *
 * 🔶 Module responsibility
 * Converts already-normalized Core grayscale image data into Unicode art without
 * loading files, rendering fonts, or touching Node/browser platform APIs.
 *
 * 🔶 Platform boundary
 * The caller must provide precomputed character matrices. Generating those
 * matrices requires a platform adapter because it depends on a font renderer.
 * ============================================================================
 */

import type { CharMatrix } from '../types/charset';
import { PresetCharset } from '../types/charset';
import type { ArtConfig } from '../types/config';
import { HeightMode, Interpolation, TextAlign, normalizeArtConfigAliases } from '../types/config';
import type { CoreImageData } from '../types/image';
import type { ArtResult } from '../types/output';
import { ErrorCode, OutputFormat, UnicodeArtError } from '../types/output';
import { batchMatch } from '../matcher';
import { generateSamplingArray } from '../sampler';
import { assembleOutput } from '../assembler';
import { normalizeBoxOptions } from '../box/box';

//#region 🟦 Public Types

/**
 * Options for pure `imageDataToArt` conversion.
 */
export interface ImageDataToArtOptions {
  /**
   * Precomputed glyph matrices keyed by glyph character.
   *
   * Browser and Node adapters are responsible for generating this map using
   * their own font rendering backend.
   */
  charDataMap: Map<string, CharMatrix>;

  /**
   * Optional time source for deterministic tests.
   */
  now?: () => number;
}

//#endregion

//#region 🟦 Public API

/**
 * Converts Core grayscale image data into Unicode art.
 *
 * This is the first pure core entry for browser adaptation. It accepts only
 * normalized grayscale data and precomputed character matrices, so it does not
 * import `sharp`, `canvas`, `fs`, `Buffer`, `process`, or DOM APIs.
 */
export async function imageDataToArt(
  imageData: CoreImageData,
  config: Partial<ArtConfig>,
  options: ImageDataToArtOptions
): Promise<ArtResult> {
  const now = options.now ?? Date.now;
  const startTime = now();

  try {
    validateCoreImageData(imageData);
    validateCharDataMap(options.charDataMap);

    const fullConfig = validatePureConfig(config);
    const processedImage = fullConfig.invert ? invertCorePixels(imageData) : imageData;
    const samplingArray = generateSamplingArray(processedImage, fullConfig);
    const charMatrix = await batchMatch(samplingArray, options.charDataMap, fullConfig);
    const duration = Math.max(0, now() - startTime);

    return assembleOutput(
      charMatrix,
      fullConfig,
      fullConfig.outputFormat || OutputFormat.PLAIN_TEXT,
      {
        sourceWidth: imageData.width,
        sourceHeight: imageData.height,
        charset: fullConfig.charset.type || 'custom',
        matrixSize: fullConfig.matrixSize,
        font: fullConfig.font,
        charsetSize: options.charDataMap.size,
        duration
      }
    );
  } catch (error) {
    if (error instanceof UnicodeArtError) {
      throw error;
    }

    throw new UnicodeArtError(
      `Core image data conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.INTERNAL_ERROR,
      { originalError: error }
    );
  }
}

//#endregion

//#region 🟦 Validation

function validateCoreImageData(imageData: CoreImageData): void {
  if (!imageData || typeof imageData !== 'object') {
    throw new UnicodeArtError(
      'imageData must be an object',
      ErrorCode.INVALID_INPUT,
      { imageData }
    );
  }

  if (!Number.isInteger(imageData.width) || imageData.width <= 0) {
    throw new UnicodeArtError(
      'imageData.width must be a positive integer',
      ErrorCode.INVALID_INPUT,
      { width: imageData.width }
    );
  }

  if (!Number.isInteger(imageData.height) || imageData.height <= 0) {
    throw new UnicodeArtError(
      'imageData.height must be a positive integer',
      ErrorCode.INVALID_INPUT,
      { height: imageData.height }
    );
  }

  if (!(imageData.data instanceof Uint8Array)) {
    throw new UnicodeArtError(
      'imageData.data must be a Uint8Array',
      ErrorCode.INVALID_INPUT,
      { data: imageData.data }
    );
  }

  const expectedLength = imageData.width * imageData.height;
  if (imageData.data.length !== expectedLength) {
    throw new UnicodeArtError(
      `imageData.data length mismatch: expected ${expectedLength}, got ${imageData.data.length}`,
      ErrorCode.INVALID_INPUT,
      {
        width: imageData.width,
        height: imageData.height,
        dataLength: imageData.data.length
      }
    );
  }
}

function validateCharDataMap(charDataMap: Map<string, CharMatrix>): void {
  if (!(charDataMap instanceof Map) || charDataMap.size === 0) {
    throw new UnicodeArtError(
      'options.charDataMap must be a non-empty Map',
      ErrorCode.INVALID_INPUT,
      { charDataMap }
    );
  }
}

function validatePureConfig(config: Partial<ArtConfig>): ArtConfig {
  const normalizedConfig = normalizeArtConfigAliases(config);
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
    locale: normalizedConfig.locale
  };

  if (normalizedConfig.height !== undefined) {
    if (!Number.isFinite(normalizedConfig.height) || normalizedConfig.height <= 0) {
      throw new UnicodeArtError(
        'height must be greater than 0',
        ErrorCode.INVALID_CONFIG,
        { height: normalizedConfig.height }
      );
    }
    fullConfig.height = normalizedConfig.height;
  }

  if (normalizedConfig.width !== undefined) {
    if (!Number.isFinite(normalizedConfig.width) || normalizedConfig.width <= 0) {
      throw new UnicodeArtError(
        'width must be greater than 0',
        ErrorCode.INVALID_CONFIG,
        { width: normalizedConfig.width }
      );
    }
    fullConfig.width = normalizedConfig.width;
  }

  if (!fullConfig.height && !fullConfig.width) {
    throw new UnicodeArtError(
      'height or width must be specified',
      ErrorCode.INVALID_CONFIG,
      { config }
    );
  }

  if (fullConfig.matrixSize < 2 || fullConfig.matrixSize > 20) {
    throw new UnicodeArtError(
      'matrixSize must be between 2 and 20',
      ErrorCode.INVALID_CONFIG,
      { matrixSize: fullConfig.matrixSize }
    );
  }

  if (fullConfig.ratio < 1.0 || fullConfig.ratio > 3.0) {
    throw new UnicodeArtError(
      'ratio must be between 1.0 and 3.0',
      ErrorCode.INVALID_CONFIG,
      { ratio: fullConfig.ratio }
    );
  }

  if (
    fullConfig.wideCharRatio !== undefined &&
    (fullConfig.wideCharRatio <= 0 || fullConfig.wideCharRatio > 10)
  ) {
    throw new UnicodeArtError(
      'wideCharRatio must be between 0 and 10',
      ErrorCode.INVALID_CONFIG,
      { wideCharRatio: fullConfig.wideCharRatio }
    );
  }

  try {
    normalizeBoxOptions(fullConfig.box);
  } catch (error) {
    throw new UnicodeArtError(
      `box config is invalid: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.INVALID_CONFIG,
      { box: fullConfig.box }
    );
  }

  return fullConfig;
}

//#endregion

//#region 🟦 Pixel Helpers

function invertCorePixels(imageData: CoreImageData): CoreImageData {
  const data = new Uint8Array(imageData.data.length);

  for (let i = 0; i < imageData.data.length; i++) {
    data[i] = 255 - imageData.data[i];
  }

  return {
    ...imageData,
    data
  };
}

//#endregion
