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
import { normalizeLocale, t as translateCoreMessage } from '../i18n';

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
  const locale = normalizeLocale(config.locale);

  try {
    validateCoreImageData(imageData, locale);
    validateCharDataMap(options.charDataMap, locale);

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

    const message = error instanceof Error ? error.message : String(error);
    throw new UnicodeArtError(
      translateCoreMessage('error.coreImageDataFailed', { message }, locale),
      ErrorCode.INTERNAL_ERROR,
      {
        details: { originalError: error },
        messageKey: 'error.coreImageDataFailed',
        messageParams: { message },
        locale
      }
    );
  }
}

//#endregion

//#region 🟦 Validation

function validateCoreImageData(imageData: CoreImageData, locale: string | undefined | null): void {
  if (!imageData || typeof imageData !== 'object') {
    throw new UnicodeArtError(
      translateCoreMessage('input.imageData.object', {}, locale),
      ErrorCode.INVALID_INPUT,
      {
        details: { imageData },
        messageKey: 'input.imageData.object',
        locale: normalizeLocale(locale)
      }
    );
  }

  if (!Number.isInteger(imageData.width) || imageData.width <= 0) {
    throw new UnicodeArtError(
      translateCoreMessage('input.imageData.widthPositive', {}, locale),
      ErrorCode.INVALID_INPUT,
      {
        details: { width: imageData.width },
        messageKey: 'input.imageData.widthPositive',
        locale: normalizeLocale(locale)
      }
    );
  }

  if (!Number.isInteger(imageData.height) || imageData.height <= 0) {
    throw new UnicodeArtError(
      translateCoreMessage('input.imageData.heightPositive', {}, locale),
      ErrorCode.INVALID_INPUT,
      {
        details: { height: imageData.height },
        messageKey: 'input.imageData.heightPositive',
        locale: normalizeLocale(locale)
      }
    );
  }

  if (!(imageData.data instanceof Uint8Array)) {
    throw new UnicodeArtError(
      translateCoreMessage('input.imageData.uint8Array', {}, locale),
      ErrorCode.INVALID_INPUT,
      {
        details: { data: imageData.data },
        messageKey: 'input.imageData.uint8Array',
        locale: normalizeLocale(locale)
      }
    );
  }

  const expectedLength = imageData.width * imageData.height;
  if (imageData.data.length !== expectedLength) {
    const messageParams = { expected: expectedLength, actual: imageData.data.length };
    throw new UnicodeArtError(
      translateCoreMessage('input.imageData.lengthMismatch', messageParams, locale),
      ErrorCode.INVALID_INPUT,
      {
        details: {
          width: imageData.width,
          height: imageData.height,
          dataLength: imageData.data.length
        },
        messageKey: 'input.imageData.lengthMismatch',
        messageParams,
        locale: normalizeLocale(locale)
      }
    );
  }
}

function validateCharDataMap(charDataMap: Map<string, CharMatrix>, locale: string | undefined | null): void {
  if (!(charDataMap instanceof Map) || charDataMap.size === 0) {
    throw new UnicodeArtError(
      translateCoreMessage('input.charDataMap.nonEmpty', {}, locale),
      ErrorCode.INVALID_INPUT,
      {
        details: { charDataMap },
        messageKey: 'input.charDataMap.nonEmpty',
        locale: normalizeLocale(locale)
      }
    );
  }
}

function validatePureConfig(config: Partial<ArtConfig>): ArtConfig {
  const normalizedConfig = normalizeArtConfigAliases(config);
  const locale = normalizeLocale(normalizedConfig.locale);
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

  if (normalizedConfig.height !== undefined) {
    if (!Number.isFinite(normalizedConfig.height) || normalizedConfig.height <= 0) {
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

  if (normalizedConfig.width !== undefined) {
    if (!Number.isFinite(normalizedConfig.width) || normalizedConfig.width <= 0) {
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
    normalizeBoxOptions(fullConfig.box);
  } catch (error) {
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
