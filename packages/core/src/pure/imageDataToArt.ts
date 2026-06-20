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
import { HeightMode, Interpolation, TextAlign } from '../types/config';
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
  const fullConfig: ArtConfig = {
    matrixSize: config.matrixSize || 6,
    ratio: config.ratio || 2.0,
    interpolation: config.interpolation || Interpolation.BILINEAR,
    charset: config.charset || { type: PresetCharset.ASCII },
    font: config.font,
    fontStyle: config.fontStyle,
    fontReduce: config.fontReduce !== undefined ? config.fontReduce : 0,
    charSpace: config.charSpace !== undefined ? config.charSpace : 1,
    textAlign: config.textAlign || TextAlign.LEFT,
    lineSpacing: config.lineSpacing !== undefined ? config.lineSpacing : 0,
    heightMode: config.heightMode || HeightMode.LINE,
    outputFormat: config.outputFormat || OutputFormat.PLAIN_TEXT,
    invert: config.invert !== undefined ? config.invert : false,
    trimTrailingSpaces: config.trimTrailingSpaces !== undefined ? config.trimTrailingSpaces : false,
    box: config.box !== undefined ? config.box : false,
    wideCharRatio: config.wideCharRatio !== undefined ? config.wideCharRatio : 2.0,
    enableEarlyTermination: config.enableEarlyTermination !== undefined ? config.enableEarlyTermination : true,
    maxParallelTasks: config.maxParallelTasks !== undefined ? config.maxParallelTasks : 0
  };

  if (config.height !== undefined) {
    if (!Number.isFinite(config.height) || config.height <= 0) {
      throw new UnicodeArtError(
        'height must be greater than 0',
        ErrorCode.INVALID_CONFIG,
        { height: config.height }
      );
    }
    fullConfig.height = config.height;
  }

  if (config.width !== undefined) {
    if (!Number.isFinite(config.width) || config.width <= 0) {
      throw new UnicodeArtError(
        'width must be greater than 0',
        ErrorCode.INVALID_CONFIG,
        { width: config.width }
      );
    }
    fullConfig.width = config.width;
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
